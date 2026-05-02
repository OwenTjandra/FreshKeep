package com.owentjandra.freshkeep.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.color.ColorProvider
import androidx.glance.unit.ColorProvider as ColorProviderUnit
import androidx.compose.ui.graphics.Color

/**
 * Small (2x2): single number — count of eat_now + eat_soon items.
 * Tap → opens the app home.
 */
class FreshKeepSmallWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetCache.load(context)
        provideContent {
            SmallContent(
                count = snapshot?.urgentCount ?: 0,
                stale = snapshot?.isStale ?: false,
                missing = snapshot == null,
                context = context,
            )
        }
    }
}

class FreshKeepSmallWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = FreshKeepSmallWidget()
}

@Composable
private fun SmallContent(count: Int, stale: Boolean, missing: Boolean, context: Context) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color.White))
            .padding(8.dp)
            .clickable(actionStartActivity(homeDeepLinkIntent(context))),
        contentAlignment = Alignment.Center,
    ) {
        if (missing) {
            Text(
                text = "Open FreshKeep",
                style = TextStyle(fontSize = 13.sp, color = ColorProvider(WidgetColors.Gray)),
            )
        } else {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "$count",
                    style = TextStyle(
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(if (count == 0) WidgetColors.Green else WidgetColors.Red),
                    ),
                )
                Text(
                    text = if (count == 1) "to use" else "to use",
                    style = TextStyle(fontSize = 12.sp, color = ColorProvider(WidgetColors.Gray)),
                )
                if (stale) {
                    Text(
                        text = "tap to refresh",
                        style = TextStyle(fontSize = 10.sp, color = ColorProvider(WidgetColors.Amber)),
                    )
                }
            }
        }
    }
}
