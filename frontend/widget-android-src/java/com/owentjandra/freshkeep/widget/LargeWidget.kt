package com.owentjandra.freshkeep.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
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
import androidx.glance.color.ColorProvider
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

/**
 * Large (4x4): top 5 items + the highest-priority reason string as a callout.
 */
class FreshKeepLargeWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetCache.load(context)
        provideContent { LargeContent(snapshot, context) }
    }
}

class FreshKeepLargeWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = FreshKeepLargeWidget()
}

@Composable
private fun LargeContent(snapshot: WidgetCache.Snapshot?, context: Context) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color.White))
            .padding(12.dp),
    ) {
        if (snapshot == null || snapshot.items.isEmpty()) {
            EmptyState(
                text = if (snapshot == null) "Open FreshKeep to load items" else "All clear — nothing to use up",
                context = context,
            )
            return@Box
        }

        val top = snapshot.items.firstOrNull()
        Column {
            // Callout for the most urgent reason
            if (top != null && top.reason.isNotEmpty()) {
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .background(ColorProvider(WidgetColors.forAction(top.action)))
                        .padding(8.dp),
                ) {
                    Text(
                        text = "${top.emoji}  ${top.reason}",
                        style = TextStyle(
                            fontSize = 13.sp,
                            color = ColorProvider(Color.White),
                            fontWeight = FontWeight.Medium,
                        ),
                        maxLines = 2,
                    )
                }
            }
            // Top 5 list
            snapshot.items.take(5).forEachIndexed { idx, item ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clickable(actionStartActivity(deepLinkIntentForItem(context, item.id))),
                ) {
                    Text(
                        text = item.emoji,
                        style = TextStyle(fontSize = 18.sp),
                        modifier = GlanceModifier.padding(end = 6.dp),
                    )
                    Text(
                        text = item.name,
                        style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium),
                        modifier = GlanceModifier.defaultWeight(),
                        maxLines = 1,
                    )
                    ActionPill(item.action)
                    Text(
                        text = formatDays(item.daysUntilExpiry),
                        style = TextStyle(fontSize = 12.sp, color = ColorProvider(WidgetColors.Gray)),
                        modifier = GlanceModifier.padding(start = 6.dp),
                    )
                }
            }
            if (snapshot.isStale) StaleHint()
        }
    }
}
