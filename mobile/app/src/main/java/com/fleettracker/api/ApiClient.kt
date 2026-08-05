package com.fleettracker.api

import com.fleettracker.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton Retrofit client.
 *
 * BASE_URL is injected at build time from app/build.gradle:
 *   - Emulator  → http://10.0.2.2:8000
 *   - Real phone → http://<your-PC-LAN-IP>:8000
 */
object ApiClient {

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl("${BuildConfig.BASE_URL}/")   // trailing slash required by Retrofit
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val api: FleetApiService = retrofit.create(FleetApiService::class.java)
}
