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
 * Medium (4x2): top 3 items with name, days, and the action label
 * color-coded. Tapping each row deep-links to the item detail.
 */
class FreshKeepMediumWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetCache.load(context)
        provideContent { MediumContent(snapshot, context) }
    }
}

class FreshKeepMediumWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = FreshKeepMediumWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        RefreshScheduler.scheduleDaily6am(context)
    }
}

@Composable
private fun MediumContent(snapshot: WidgetCache.Snapshot?, context: Context) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color.White))
            .padding(8.dp),
    ) {
        if (snapshot == null) {
            EmptyState(text = "Open FreshKeep to load items", context = context)
            return@Box
        }
        if (snapshot.items.isEmpty()) {
            EmptyState(text = "All clear", context = context)
            return@Box
        }
        Column(modifier = GlanceModifier.fillMaxSize()) {
            snapshot.items.take(3).forEach { item ->
                ItemRow(item, context)
            }
            if (snapshot.isStale) StaleHint()
        }
    }
}

@Composable
private fun ItemRow(item: WidgetCache.Item, context: Context) {
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
            style = TextStyle(fontSize = 13.sp, color = ColorProvider(WidgetColors.Gray)),
            modifier = GlanceModifier.padding(start = 6.dp),
        )
    }
}

@Composable
internal fun ActionPill(action: String) {
    val color = WidgetColors.forAction(action)
    Box(
        modifier = GlanceModifier
            .background(ColorProvider(color))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text = labelForAction(action),
            style = TextStyle(fontSize = 10.sp, color = ColorProvider(Color.White), fontWeight = FontWeight.Bold),
        )
    }
}

@Composable
internal fun EmptyState(text: String, context: Context) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .clickable(actionStartActivity(homeDeepLinkIntent(context))),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = text, style = TextStyle(fontSize = 13.sp, color = ColorProvider(WidgetColors.Gray)))
    }
}

@Composable
internal fun StaleHint() {
    Text(
        text = "tap to refresh",
        style = TextStyle(fontSize = 10.sp, color = ColorProvider(WidgetColors.Amber)),
        modifier = GlanceModifier.padding(top = 4.dp),
    )
}

internal fun labelForAction(a: String): String = when (a) {
    "eat_now"        -> "EAT"
    "eat_soon"       -> "SOON"
    "freeze_now"     -> "FREEZE"
    "use_in_recipe"  -> "COOK"
    "compost"        -> "TOSS"
    "monitor"        -> "CHECK"
    "safe"           -> "OK"
    else             -> "?"
}
