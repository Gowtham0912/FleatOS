package com.fleettracker

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.fleettracker.databinding.ActivityMainBinding

/**
 * MainActivity — single-screen UI
 *
 * Shows:
 *  - Device ID
 *  - Current GPS coordinates
 *  - Backend connection status
 *  - Ping counter
 *  - Start / Stop tracking button
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var isTracking = false

    // ── Location broadcast receiver ──────────────────────────────────────────
    private val locationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val lat    = intent.getDoubleExtra(LocationTrackingService.EXTRA_LAT, 0.0)
            val lon    = intent.getDoubleExtra(LocationTrackingService.EXTRA_LON, 0.0)
            val status = intent.getStringExtra(LocationTrackingService.EXTRA_STATUS) ?: ""
            updateLocationUI(lat, lon, status)
        }
    }

    // ── Permission launcher ──────────────────────────────────────────────────
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted   = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        if (fineGranted || coarseGranted) {
            // Request background location separately on Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestBackgroundLocation()
            } else {
                startTracking()
            }
        } else {
            Toast.makeText(this, "Location permission is required for tracking.", Toast.LENGTH_LONG).show()
        }
    }

    private val backgroundPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startTracking()
        } else {
            // Foreground-only tracking still works — just no background
            Toast.makeText(
                this,
                "Background location denied. Tracking pauses when app is minimised.",
                Toast.LENGTH_LONG
            ).show()
            startTracking()
        }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvDeviceId.text = DeviceUtils.getDeviceId(this)
        binding.tvStatus.text   = "Idle"

        binding.btnToggle.setOnClickListener {
            if (isTracking) stopTracking() else checkPermissionsAndStart()
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(LocationTrackingService.ACTION_LOCATION_UPDATE)
        ContextCompat.registerReceiver(
            this, locationReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(locationReceiver)
    }

    // ── Permission logic ─────────────────────────────────────────────────────

    private fun checkPermissionsAndStart() {
        when {
            hasFineLocation() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    requestBackgroundLocation()
                } else {
                    startTracking()
                }
            }
            shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) -> {
                Toast.makeText(this, "Please allow location access to track this device.", Toast.LENGTH_LONG).show()
                requestForegroundLocation()
            }
            else -> requestForegroundLocation()
        }
    }

    private fun hasFineLocation() = ContextCompat.checkSelfPermission(
        this, Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    private fun requestForegroundLocation() {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    private fun requestBackgroundLocation() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                backgroundPermissionLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            } else {
                startTracking()
            }
        }
    }

    // ── Service control ──────────────────────────────────────────────────────

    private fun startTracking() {
        val serviceIntent = Intent(this, LocationTrackingService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)
        isTracking = true
        updateTrackingUI()
    }

    private fun stopTracking() {
        stopService(Intent(this, LocationTrackingService::class.java))
        isTracking = false
        updateTrackingUI()
        binding.tvStatus.text  = "Stopped"
        binding.tvCoords.text  = "—"
    }

    // ── UI helpers ───────────────────────────────────────────────────────────

    private fun updateTrackingUI() {
        if (isTracking) {
            binding.btnToggle.text = "Stop Tracking"
            binding.btnToggle.setBackgroundColor(getColor(android.R.color.holo_red_dark))
            binding.cardStatus.visibility = View.VISIBLE
        } else {
            binding.btnToggle.text = "Start Tracking"
            binding.btnToggle.setBackgroundColor(getColor(android.R.color.holo_green_dark))
            binding.cardStatus.visibility = View.GONE
        }
    }

    private fun updateLocationUI(lat: Double, lon: Double, status: String) {
        binding.tvCoords.text  = "%.6f, %.6f".format(lat, lon)
        binding.tvStatus.text  = status
    }
}
