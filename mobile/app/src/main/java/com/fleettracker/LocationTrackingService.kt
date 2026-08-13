package com.fleettracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.fleettracker.api.ApiClient
import com.fleettracker.api.LocationPayload
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.format.DateTimeFormatter

/**
 * LocationTrackingService — Foreground Service
 *
 * Runs continuously in the background (shown as a persistent notification).
 * Requests GPS updates every 5 seconds and POSTs each fix to the backend.
 */
class LocationTrackingService : Service() {

    companion object {
        private const val TAG = "FleetTracker"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "fleet_tracker_channel"
        private const val LOCATION_INTERVAL_MS = 1_000L     // 1 second
        private const val LOCATION_FASTEST_MS  = 1_000L     // never faster than 1 s

        // Broadcast action — MainActivity listens for this to update the UI
        const val ACTION_LOCATION_UPDATE = "com.fleettracker.LOCATION_UPDATE"
        const val EXTRA_LAT  = "latitude"
        const val EXTRA_LON  = "longitude"
        const val EXTRA_STATUS = "status"
    }

    // ── State ────────────────────────────────────────────────────────────────
    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var deviceId: String

    // Coroutine scope tied to the service lifetime
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var pingCount = 0
    private var lastStatus = "Starting…"

    // ── Lifecycle ────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        deviceId = DeviceUtils.getDeviceId(this)
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationCallback()
        createNotificationChannel()
        Log.i(TAG, "Service created. Device ID: $deviceId")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification("Waiting for GPS fix…"))
        requestLocationUpdates()
        Log.i(TAG, "Tracking started.")
        return START_STICKY   // restart automatically if killed by the OS
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
        Log.i(TAG, "Tracking stopped.")
    }

    // Bound services not used — return null
    override fun onBind(intent: Intent?): IBinder? = null

    // ── Location ─────────────────────────────────────────────────────────────

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    val lat = location.latitude
                    val lon = location.longitude
                    val ts  = DateTimeFormatter.ISO_INSTANT.format(Instant.now())

                    Log.d(TAG, "GPS fix: lat=$lat lon=$lon")

                    // POST to backend in IO dispatcher
                    serviceScope.launch {
                        sendLocationToBackend(lat, lon, ts)
                    }

                    // Notify MainActivity via broadcast
                    broadcastUpdate(lat, lon, "Sending…")
                }
            }
        }
    }

    @Suppress("MissingPermission")  // Permission checked in MainActivity before starting service
    private fun requestLocationUpdates() {
        val request = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            LOCATION_INTERVAL_MS
        )
            .setMinUpdateIntervalMillis(LOCATION_FASTEST_MS)
            // Removed distance and batching delays to ensure strict 1-second time-based updates
            .build()

        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    }

    // ── Backend communication ────────────────────────────────────────────────

    private var isSending = false

    private suspend fun sendLocationToBackend(lat: Double, lon: Double, ts: String) {
        if (isSending) {
            Log.d(TAG, "Network busy, dropping update to prevent backlog and out-of-order delivery.")
            return
        }
        isSending = true
        try {
            val payload = LocationPayload(
                deviceId  = deviceId,
                latitude  = lat,
                longitude = lon,
                timestamp = ts
            )

            val response = ApiClient.api.postLocation(payload)

            if (response.isSuccessful) {
                pingCount++
                lastStatus = "OK — ping #$pingCount"
                Log.i(TAG, "Sent OK: $lastStatus")
            } else {
                lastStatus = "HTTP ${response.code()}"
                Log.w(TAG, "Send failed: ${response.code()} ${response.message()}")
            }
        } catch (e: Exception) {
            lastStatus = "Error: ${e.localizedMessage}"
            Log.e(TAG, "Network error", e)
        } finally {
            isSending = false
        }

        // Update notification text with latest status
        updateNotification(lastStatus)
        broadcastUpdate(lat, lon, lastStatus)
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Fleet Tracker",
            NotificationManager.IMPORTANCE_LOW         // silent, no sound
        ).apply {
            description = "Live GPS tracking notification"
        }
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val tapIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Fleet Tracker — Active")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(tapIntent)
            .setOngoing(true)        // user cannot swipe away
            .setSilent(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    // ── Broadcast ────────────────────────────────────────────────────────────

    private fun broadcastUpdate(lat: Double, lon: Double, status: String) {
        val intent = Intent(ACTION_LOCATION_UPDATE).apply {
            putExtra(EXTRA_LAT, lat)
            putExtra(EXTRA_LON, lon)
            putExtra(EXTRA_STATUS, status)
        }
        sendBroadcast(intent)
    }
}
