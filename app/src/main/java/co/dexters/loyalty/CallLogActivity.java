package co.dexters.loyalty;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.CallLog;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.text.DateFormat;
import java.util.Date;

public class CallLogActivity extends Activity {
    private static final int CALL_LOG_REQUEST = 2001;
    private LinearLayout list;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        if (checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
            loadCalls();
        } else {
            requestPermissions(new String[]{Manifest.permission.READ_CALL_LOG}, CALL_LOG_REQUEST);
        }
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 28, 28, 28);
        root.setBackgroundColor(Color.rgb(3, 4, 7));

        TextView title = new TextView(this);
        title.setText("DEXTER'S CALLS");
        title.setTextColor(Color.WHITE);
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER_VERTICAL);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView subtitle = new TextView(this);
        subtitle.setText("Recent business calls • tap a number to call back");
        subtitle.setTextColor(Color.LTGRAY);
        subtitle.setTextSize(14);
        subtitle.setPadding(0, 8, 0, 20);
        root.addView(subtitle);

        ScrollView scroll = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(list, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        Button ai = new Button(this);
        ai.setText("AI ORDER SETUP");
        ai.setAllCaps(false);
        ai.setOnClickListener(v -> {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://backoffice.dextersspot.co.uk/"));
            startActivity(i);
        });
        root.addView(ai, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        setContentView(root);
    }

    private void loadCalls() {
        list.removeAllViews();
        Cursor c = getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                new String[]{CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION},
                null, null,
                CallLog.Calls.DATE + " DESC");
        if (c == null) return;

        int numberIndex = c.getColumnIndex(CallLog.Calls.NUMBER);
        int typeIndex = c.getColumnIndex(CallLog.Calls.TYPE);
        int dateIndex = c.getColumnIndex(CallLog.Calls.DATE);
        int durationIndex = c.getColumnIndex(CallLog.Calls.DURATION);
        int shown = 0;

        while (c.moveToNext() && shown < 50) {
            String number = c.getString(numberIndex);
            int type = c.getInt(typeIndex);
            long date = c.getLong(dateIndex);
            long duration = c.getLong(durationIndex);
            addCallRow(number, type, date, duration);
            shown++;
        }
        c.close();

        if (shown == 0) {
            TextView empty = new TextView(this);
            empty.setText("No calls found yet.");
            empty.setTextColor(Color.LTGRAY);
            empty.setTextSize(16);
            empty.setPadding(0, 30, 0, 30);
            list.addView(empty);
        }
    }

    private void addCallRow(String number, int type, long date, long duration) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(18, 18, 18, 18);
        row.setBackgroundColor(Color.rgb(20, 22, 27));

        TextView n = new TextView(this);
        n.setText(number == null || number.isEmpty() ? "Unknown number" : number);
        n.setTextColor(Color.WHITE);
        n.setTextSize(19);
        n.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        row.addView(n);

        String kind = type == CallLog.Calls.INCOMING_TYPE ? "Incoming" :
                type == CallLog.Calls.OUTGOING_TYPE ? "Outgoing" :
                type == CallLog.Calls.MISSED_TYPE ? "Missed" : "Call";
        TextView meta = new TextView(this);
        meta.setText(kind + " • " + DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(new Date(date)) + " • " + duration + "s");
        meta.setTextColor(Color.LTGRAY);
        meta.setTextSize(13);
        meta.setPadding(0, 5, 0, 0);
        row.addView(meta);

        if (number != null && !number.isEmpty()) {
            row.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number)))));
        }

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 12);
        list.addView(row, lp);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CALL_LOG_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) loadCalls();
            else {
                TextView denied = new TextView(this);
                denied.setText("Call history permission is needed to show business calls.");
                denied.setTextColor(Color.WHITE);
                denied.setTextSize(16);
                denied.setPadding(0, 30, 0, 30);
                list.addView(denied);
            }
        }
    }
}
