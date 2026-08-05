package com.fleettracker.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Retrofit interface — defines the API endpoints the app will call.
 */
interface FleetApiService {

    /**
     * Send a GPS ping to the backend.
     * Maps to: POST /location
     */
    @POST("location")
    suspend fun postLocation(@Body payload: LocationPayload): Response<LocationResponse>
}
