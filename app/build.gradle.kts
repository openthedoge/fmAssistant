plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.hwoa47.fm"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.hwoa47.fm"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "alpha-e0d5a567"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
}