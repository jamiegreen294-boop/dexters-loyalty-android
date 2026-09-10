package co.dexters.loyalty;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.CallLog;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int REQ_PERMS = 44;
    private static final int BG = Color.rgb(7, 16, 29);
    private static final int PANEL = Color.rgb(16, 27, 45);
    private static final int GOLD = Color.rgb(246, 183, 60);
    private static final int TEXT = Color.WHITE;
    private static final int MUTED = Color.rgb(159, 176, 200);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(10, 20, 35));
        getWindow().setNavigationBarColor(Color.rgb(10, 20, 35));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(buildHome());
        requestBusinessPermissions();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // If this app is selected as the Android Home app, pressing Home returns here.
    }

    private View buildHome() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(22), dp(18), dp(28));
        scroll.addView(root, new ScrollView.LayoutParams(-1, -1));

        TextView eyebrow = text("DEXTER'S", 13, GOLD, true);
        eyebrow.setLetterSpacing(.18f);
        root.addView(eyebrow);

        TextView title = text("Business Phone", 30, TEXT, true);
        root.addView(title, lp(-1, -2, 0, 4, 0, 0));

        TextView subtitle = text("Dedicated staff handset", 14, MUTED, false);
        root.addView(subtitle, lp(-1, -2, 0, 0, 0, 22));

        LinearLayout callCard = card();
        callCard.addView(text("PHONE", 12, GOLD, true));
        callCard.addView(text("Ready for Dexter's calls", 22, TEXT, true), lp(-1, -2, 0, 4, 0, 4));
        callCard.addView(text("Use the normal phone network or the bOnline app. Orders and customer tools stay one tap away.", 14, MUTED, false));
        root.addView(callCard, lp(-1, -2, 0, 0, 0, 14));

        root.addView(action("☎  MAKE A CALL", v -> openDialer()), lp(-1, dp(58), 0, 0, 0, 10));
        root.addView(action("↺  RECENT CALLS", v -> openRecentCalls()), lp(-1, dp(58), 0, 0, 0, 10));
        root.addView(action("☁  bONLINE", v -> openUrl("https://www.bonline.com/")), lp(-1, dp(58), 0, 0, 0, 10));

        TextView ops = text("DEXTER'S BUSINESS", 12, GOLD, true);
        ops.setLetterSpacing(.12f);
        root.addView(ops, lp(-1, -2, 0, 18, 0, 8));

        root.addView(action("▣  BACK OFFICE", v -> openUrl("https://backoffice.dextersspot.co.uk/")), lp(-1, dp(58), 0, 0, 0, 10));
        root.addView(action("✦  PHONE ORDER MODE", v -> showOrderMode()), lp(-1, dp(58), 0, 0, 0, 10));
        root.addView(action("⚙  DEVICE SETTINGS", v -> openDeviceSettings()), lp(-1, dp(58), 0, 0, 0, 10));

        TextView note = text("Test build • Meizu dedicated Dexter's handset", 12, MUTED, false);
        note.setGravity(Gravity.CENTER);
        root.addView(note, lp(-1, -2, 0, 22, 0, 0));
        return scroll;
    }

    private LinearLayout card() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(dp(16), dp(16), dp(16), dp(16));
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setColor(PANEL);
        g.setCornerRadius(dp(18));
        g.setStroke(dp(1), Color.rgb(38, 55, 81));
        l.setBackground(g);
        return l;
    }

    private Button action(String label, View.OnClickListener listener) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(16);
        b.setTextColor(TEXT);
        b.setAllCaps(false);
        b.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        b.setPadding(dp(18), 0, dp(14), 0);
        b.setOnClickListener(listener);
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setColor(PANEL);
        g.setCornerRadius(dp(15));
        g.setStroke(dp(1), Color.rgb(38, 55, 81));
        b.setBackground(g);
        return b;
    }

    private TextView text(String s, int sp, int colour, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(colour);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        return t;
    }

    private LinearLayout.LayoutParams lp(int w, int h, int l, int t, int r, int b) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(w, h);
        p.setMargins(dp(l), dp(t), dp(r), dp(b));
        return p;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private void openDialer() {
        try {
            startActivity(new Intent(Intent.ACTION_DIAL));
        } catch (Exception e) {
            toast("Phone app could not be opened.");
        }
    }

    private void openRecentCalls() {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, CallLog.Calls.CONTENT_URI);
            startActivity(i);
        } catch (Exception e) {
            openDialer();
        }
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            toast("No browser is available on this handset.");
        }
    }

    private void openDeviceSettings() {
        try {
            startActivity(new Intent(Settings.ACTION_SETTINGS));
        } catch (Exception e) {
            toast("Settings unavailable.");
        }
    }

    private void showOrderMode() {
        new android.app.AlertDialog.Builder(this)
                .setTitle("Dexter's Phone Order Mode")
                .setMessage("This handset is prepared for the next stage: caller matching, live order transcription, POS basket/modifiers and Send to KDS. Those services will connect to Dexter's existing order system rather than changing the live loyalty app.")
                .setPositiveButton("OK", null)
                .show();
    }

    private void requestBusinessPermissions() {
        if (android.os.Build.VERSION.SDK_INT < 23) return;
        List<String> p = new ArrayList<>();
        addIfMissing(p, Manifest.permission.READ_PHONE_STATE);
        addIfMissing(p, Manifest.permission.READ_CALL_LOG);
        addIfMissing(p, Manifest.permission.WRITE_CALL_LOG);
        addIfMissing(p, Manifest.permission.READ_CONTACTS);
        addIfMissing(p, Manifest.permission.RECORD_AUDIO);
        if (!p.isEmpty()) requestPermissions(p.toArray(new String[0]), REQ_PERMS);
    }

    private void addIfMissing(List<String> list, String permission) {
        if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) list.add(permission);
    }

    private void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }
}
