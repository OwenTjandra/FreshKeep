package com.owentjandra.freshkeep.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager
import android.util.Log
import java.util.Calendar

/**
 * Step 18 — schedules the 6am-local-time daily widget refresh.
 *
 * Android also runs the built-in 30-minute schedule (set in
 * widget_*_info.xml's updatePeriodMillis). This adds a guaranteed
 * morning refresh so the widget reflects what's expiring today even
 * if the app hasn't opened in 24h.
 *
 * Kicked off from each Glance receiver's onEnabled (first widget add)
 * and from BootReceiver on reboot.
 */
object RefreshScheduler {
    private const val TAG = "FreshKeepWidget"
    private const val ALARM_REQUEST_CODE = 0xF7E5

    fun scheduleDaily6am(context: Context) {
        val now = System.currentTimeMillis()
        val target = Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, 6)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= now) add(Calendar.DAY_OF_YEAR, 1)
        }

        val intent = Intent(context, RefreshAllWidgetsReceiver::class.java).apply {
            action = ACTION_REFRESH_ALL
        }
        val pi = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val alarm = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarm == null) {
            Log.w(TAG, "AlarmManager unavailable; skipping 6am schedule")
            return
        }

        // setInexactRepeating: Samsung One UI is aggressive about exact alarms,
        // and we don't need second-precision for a morning refresh.
        alarm.setInexactRepeating(
            AlarmManager.RTC,
            target.timeInMillis,
            AlarmManager.INTERVAL_DAY,
            pi,
        )
        Log.d(TAG, "Scheduled daily 6am refresh — first fire at ${target.time}")
    }

    const val ACTION_REFRESH_ALL = "com.owentjandra.freshkeep.widget.REFRESH_ALL"

    /** Broadcast an APPWIDGET_UPDATE for every FreshKeep widget receiver. */
    fun refreshAllWidgets(context: Context) {
        val receivers = listOf(
            FreshKeepSmallWidgetReceiver::class.java,
            FreshKeepMediumWidgetReceiver::class.java,
            FreshKeepLargeWidgetReceiver::class.java,
        )
        val mgr = AppWidgetManager.getInstance(context)
        for (cls in receivers) {
            val component = ComponentName(context, cls)
            val ids = mgr.getAppWidgetIds(component) ?: continue
            if (ids.isEmpty()) continue
            val update = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                this.component = component
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(update)
        }
    }
}
