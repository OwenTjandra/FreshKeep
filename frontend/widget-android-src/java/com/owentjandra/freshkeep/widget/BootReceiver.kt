package com.owentjandra.freshkeep.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-schedule the daily 6am widget refresh after a device reboot.
 * AlarmManager schedules don't survive reboots; this receiver fixes that.
 *
 * Requires the RECEIVE_BOOT_COMPLETED permission (added by the config plugin).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                RefreshScheduler.scheduleDaily6am(context)
                RefreshScheduler.refreshAllWidgets(context)
            }
        }
    }
}
