package co.dexters.loyalty;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class TravelBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, TravelAlertReceiver.class).setAction("co.dexters.TRAVEL_CHECK");
        PendingIntent pi = PendingIntent.getBroadcast(c, 4501, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis()+120000L, 30*60_000L, pi);
    }
}
