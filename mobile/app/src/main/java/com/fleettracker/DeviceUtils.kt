package com.fleettracker

import android.content.Context
import android.provider.Settings

/**
 * Device utility — provides a stable unique device identifier.
 *
 * Uses ANDROID_ID which is unique per app + device combination
 * and does not require any special permissions.
 */
object DeviceUtils {

    /**
     * Returns a stable 16-character hex string unique to this app install.
     * Example: "9774d56d682e549c"
     */
    fun getDeviceId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown-device"
    }
}
