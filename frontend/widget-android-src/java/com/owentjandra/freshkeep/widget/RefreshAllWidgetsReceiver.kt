package com.owentjandra.freshkeep.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Receives the daily 6am AlarmManager broadcast and updates all widgets. */
class RefreshAllWidgetsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == RefreshScheduler.ACTION_REFRESH_ALL) {
            RefreshScheduler.refreshAllWidgets(context)
        }
    }
}
