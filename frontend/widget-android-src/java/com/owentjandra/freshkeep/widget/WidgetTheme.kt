package com.owentjandra.freshkeep.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color

/**
 * Action → color mapping for widget pills.
 *   eat_now / compost                            → red    (urgent / lost)
 *   eat_soon / freeze_now / use_in_recipe        → amber  (act this week)
 *   monitor                                      → blue   (uncertain)
 *   safe                                         → green  (no action)
 */
object WidgetColors {
    val Red    = Color(0xFFEF4444)
    val Amber  = Color(0xFFF59E0B)
    val Blue   = Color(0xFF3B82F6)
    val Green  = Color(0xFF10B981)
    val Gray   = Color(0xFF9CA3AF)

    fun forAction(action: String): Color = when (action) {
        "eat_now", "compost"                          -> Red
        "eat_soon", "freeze_now", "use_in_recipe"     -> Amber
        "monitor"                                     -> Blue
        "safe"                                        -> Green
        else                                          -> Gray
    }
}

/** Deep link to the item detail screen using the freshkeep:// scheme (Step 7). */
fun deepLinkIntentForItem(@Suppress("UNUSED_PARAMETER") context: Context, itemId: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("freshkeep://item/$itemId"))
        .apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }

/** Open the app's home tab. */
fun homeDeepLinkIntent(@Suppress("UNUSED_PARAMETER") context: Context): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("freshkeep://(tabs)"))
        .apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }

fun formatDays(days: Int): String = when {
    days < 0  -> "${-days}d past"
    days == 0 -> "today"
    days == 1 -> "1d"
    else      -> "${days}d"
}
