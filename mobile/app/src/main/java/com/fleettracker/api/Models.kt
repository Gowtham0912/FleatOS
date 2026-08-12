package com.fleettracker.api

import com.google.gson.annotations.SerializedName

/**
 * JSON payload sent to POST /location on every GPS ping.
 *
 * Matches the FastAPI LocationCreate schema exactly.
 */
data class LocationPayload(
    @SerializedName("device_id")
    val deviceId: String,

    @SerializedName("latitude")
    val latitude: Double,

    @SerializedName("longitude")
    val longitude: Double,

    @SerializedName("speed")
    val speed: Float?,

    @SerializedName("heading")
    val heading: Float?,

    @SerializedName("timestamp")
    val timestamp: String          // ISO-8601 UTC string, e.g. "2025-01-01T12:00:00Z"
)

/**
 * Response body from POST /location.
 */
data class LocationResponse(
    @SerializedName("id")
    val id: Long,

    @SerializedName("vehicle_id")
    val vehicleId: Long,

    @SerializedName("latitude")
    val latitude: Double,

    @SerializedName("longitude")
    val longitude: Double,

    @SerializedName("timestamp")
    val timestamp: String
)
