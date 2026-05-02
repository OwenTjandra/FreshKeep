package com.owentjandra.freshkeep.widget

import android.content.Context
import android.util.Log
import org.json.JSONException
import org.json.JSONObject
import java.io.File

/**
 * Reads the shared widget cache written by the React Native app
 * (frontend/lib/widgetCache.ts → expo-file-system documentDirectory).
 *
 * On a development build the file path is:
 *   <Context.getFilesDir()>/widget-cache.json
 *
 * Schema is documented in widgetCache.ts. This parser handles version 1.
 */
object WidgetCache {
    private const val TAG = "FreshKeepWidget"
    private const val FILENAME = "widget-cache.json"
    private const val SUPPORTED_VERSION = 1
    const val STALE_AFTER_MS = 24L * 60L * 60L * 1000L // Step 18

    data class Item(
        val id: String,
        val name: String,
        val emoji: String,
        val daysUntilExpiry: Int,
        val action: String,
        val priority: Int,
        val reason: String,
    )

    data class Snapshot(
        val items: List<Item>,
        val generatedAt: Long, // epoch millis
    ) {
        val isStale: Boolean get() = System.currentTimeMillis() - generatedAt > STALE_AFTER_MS
        val urgentCount: Int get() = items.count { it.action == "eat_now" || it.action == "eat_soon" }
    }

    fun load(context: Context): Snapshot? {
        val file = File(context.filesDir, FILENAME)
        if (!file.exists()) return null
        return try {
            val raw = file.readText()
            val obj = JSONObject(raw)
            val version = obj.optInt("version", -1)
            if (version != SUPPORTED_VERSION) {
                Log.w(TAG, "Unsupported widget cache version: $version")
                return null
            }
            val generatedAtIso = obj.optString("generated_at", "")
            val generatedAt = parseIso8601(generatedAtIso) ?: file.lastModified()
            val itemsJson = obj.optJSONArray("items") ?: return Snapshot(emptyList(), generatedAt)
            val items = (0 until itemsJson.length()).map { i ->
                val it = itemsJson.getJSONObject(i)
                Item(
                    id               = it.optString("id"),
                    name             = it.optString("name"),
                    emoji            = it.optString("emoji", "🍽️"),
                    daysUntilExpiry  = it.optInt("days_until_expiry"),
                    action           = it.optString("action"),
                    priority         = it.optInt("priority", 5),
                    reason           = it.optString("reason", ""),
                )
            }
            Snapshot(items, generatedAt)
        } catch (e: JSONException) {
            Log.e(TAG, "Failed to parse widget cache", e)
            null
        }
    }

    private fun parseIso8601(s: String): Long? {
        if (s.isEmpty()) return null
        return try {
            // java.time.Instant.parse is fine on API 26+; minSdk for Glance is 23,
            // so fall back to manual parsing on lower API levels.
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                java.time.Instant.parse(s).toEpochMilli()
            } else {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US)
                    .parse(s)?.time
            }
        } catch (_: Exception) { null }
    }
}
