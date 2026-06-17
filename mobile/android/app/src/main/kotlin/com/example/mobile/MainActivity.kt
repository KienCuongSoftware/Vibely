package com.example.mobile

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import java.security.MessageDigest

class MainActivity : FlutterActivity() {

    override fun onStart() {
        super.onStart()
        if (isDebugBuild()) {
            logFacebookKeyHash()
        }
    }

    private fun isDebugBuild(): Boolean {
        return (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    }

    private fun logFacebookKeyHash() {
        try {
            val packageName = applicationContext.packageName
            val flags =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    PackageManager.GET_SIGNING_CERTIFICATES
                } else {
                    @Suppress("DEPRECATION")
                    PackageManager.GET_SIGNATURES
                }

            val packageInfo =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageManager.getPackageInfo(packageName, flags)
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.getPackageInfo(packageName, flags)
                }

            val signatures =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.signingInfo?.apkContentsSigners
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.signatures
                } ?: return

            for (signature in signatures) {
                val digest = MessageDigest.getInstance("SHA")
                digest.update(signature.toByteArray())
                val hash = Base64.encodeToString(digest.digest(), Base64.NO_WRAP)
                Log.i(
                    "VibelyOAuth",
                    "Facebook Key Hash for $packageName: $hash — add this in Meta Developer Console → Android",
                )
            }
        } catch (error: Exception) {
            Log.w("VibelyOAuth", "Could not compute Facebook key hash", error)
        }
    }
}
