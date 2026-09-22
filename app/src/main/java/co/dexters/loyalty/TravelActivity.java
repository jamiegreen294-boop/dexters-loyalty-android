package co.dexters.loyalty;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class TravelActivity extends Activity {
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        build();
        ensureNotificationPermission();
        scheduleChecks();
    }

    private void build() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 36, 28, 28);
        root.setBackgroundColor(Color.rgb(3,4,7));

        TextView title = new TextView(this);
        title.setText("Travel Alerts");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        root.addView(title, full());

        TextView sub = new TextView(this);
        sub.setText("Cowcaddens + Ibrox · official/public sources only");
        sub.setTextColor(Color.LTGRAY);
        sub.setTextSize(14);
        sub.setPadding(0,6,0,20);
        root.addView(sub, full());

        status = new TextView(this);
        status.setText("Automatic checks are enabled every 30 minutes. Camera images are never copied or stored.");
        status.setTextColor(Color.LTGRAY);
        status.setTextSize(14);
        status.setPadding(0,0,0,18);
        root.addView(status, full());

        add(root, "Check now", v -> {
            status.setText("Checking official travel sources…");
            sendBroadcast(new Intent(this, TravelAlertReceiver.class).setAction("co.dexters.TRAVEL_CHECK_MANUAL"));
            status.postDelayed(() -> status.setText("Check sent. You will be notified if relevant travel information changed."), 1200);
        });
        add(root, "Traffic Scotland incidents", v -> open("https://www.traffic.gov.scot/traffic-information/incidents"));
        add(root, "Traffic Scotland cameras", v -> open("https://www.traffic.gov.scot/traffic-cameras"));
        add(root, "Scottish roadworks open data", v -> open("https://roadworks.scot/opendata"));
        add(root, "SPT disruptions", v -> open("https://www.spt.co.uk/travel-with-spt/disruptions/"));

        TextView legal = new TextView(this);
        legal.setText("Legal mode: Dexter checks public travel information only. Camera alerts open Traffic Scotland's own viewer; Dexter does not scrape, embed, record or redistribute camera images.");
        legal.setTextColor(Color.LTGRAY);
        legal.setTextSize(12);
        legal.setPadding(0,20,0,0);
        root.addView(legal, full());

        setContentView(root);
    }

    private void add(LinearLayout root, String text, android.view.View.OnClickListener l) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(16);
        b.setGravity(Gravity.CENTER_VERTICAL);
        b.setOnClickListener(l);
        LinearLayout.LayoutParams p = full();
        p.setMargins(0,0,0,10);
        root.addView(b,p);
    }

    private LinearLayout.LayoutParams full() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private void open(String url) {
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    }

    private void ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 2201);
        }
    }

    private void scheduleChecks() {
        AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
        Intent i = new Intent(this, TravelAlertReceiver.class).setAction("co.dexters.TRAVEL_CHECK");
        PendingIntent pi = PendingIntent.getBroadcast(this, 4501, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        long first = System.currentTimeMillis() + 60_000L;
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, first, 30 * 60_000L, pi);
    }
}
