# Fleet Tracker — Android App

## Overview

A simple Kotlin Android app that sends your phone's GPS location to the Fleet backend every 5 seconds.

## Folder Structure

```
mobile/
├── app/
│   └── src/main/
│       ├── java/com/fleettracker/
│       │   ├── MainActivity.kt           ← Single screen: start/stop + live status
│       │   ├── LocationTrackingService.kt ← Foreground service: GPS + HTTP POST
│       │   ├── DeviceUtils.kt            ← Stable device ID (ANDROID_ID)
│       │   └── api/
│       │       ├── ApiClient.kt          ← Retrofit singleton
│       │       ├── FleetApiService.kt    ← Interface: POST /location
│       │       └── Models.kt             ← LocationPayload / LocationResponse
│       ├── res/
│       │   ├── layout/activity_main.xml  ← Dark-themed UI
│       │   └── values/
│       │       ├── strings.xml
│       │       ├── colors.xml
│       │       └── themes.xml
│       └── AndroidManifest.xml
├── build.gradle
├── settings.gradle
└── gradle.properties
```

## ⚡ How to set your backend IP

Open `app/build.gradle` and find this line:

```groovy
buildConfigField "String", "BASE_URL", '"http://10.0.2.2:8000"'
```

**For a real Android phone on the same WiFi:**
1. Run `ipconfig` on your PC
2. Find IPv4 Address under your WiFi adapter (e.g. `192.168.1.45`)
3. Change the line to:
```groovy
buildConfigField "String", "BASE_URL", '"http://192.168.1.45:8000"'
```

**For an emulator:** keep `http://10.0.2.2:8000` (default — maps to localhost).

## How to Build & Install

### Requirements
- Android Studio Hedgehog (2023.1.1) or newer
- Android phone with USB debugging enabled OR Android emulator

### Steps

1. Open Android Studio
2. Click **File → Open** → select the `mobile/` folder
3. Wait for Gradle sync to complete
4. Update the BASE_URL in `app/build.gradle` to your PC's IP
5. Click **Run ▶** (or press Shift+F10)
6. Select your device/emulator

### Enabling USB Debugging on your phone
1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times → "Developer options" unlocked
3. Go to **Settings → Developer Options**
4. Enable **USB Debugging**
5. Connect phone to PC via USB → tap "Allow" on the phone prompt

## How it works

```
Phone GPS → FusedLocationProvider (every 5s)
         → LocationTrackingService.kt
         → POST http://<your-pc-ip>:8000/location
              {
                "device_id": "9774d56d682e549c",
                "latitude": 6.9271,
                "longitude": 79.8612,
                "timestamp": "2025-01-01T12:00:00Z"
              }
         → Backend saves to PostgreSQL
         → Backend broadcasts to WebSocket
         → Dashboard updates live
```

## Permissions requested

| Permission | Why |
|-----------|-----|
| `ACCESS_FINE_LOCATION` | Precise GPS coordinates |
| `ACCESS_COARSE_LOCATION` | Fallback for network-based location |
| `ACCESS_BACKGROUND_LOCATION` | Track when screen is off |
| `FOREGROUND_SERVICE` | Keep the GPS service running |
| `INTERNET` | Send data to backend |
