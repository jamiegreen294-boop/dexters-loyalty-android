package co.dexters.meizu.audio;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private TextView status;
    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(36,36,36,36);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("DEXTEROS Audio Listener");
        title.setTextSize(26f);
        root.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView info = new TextView(this);
        info.setText("Meizu-only test. Start the AI listener BEFORE answering the bOnline call. The listener stays active until you stop it. This app is separate from Dexter's Loyalty.");
        info.setTextSize(16f);
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); ip.setMargins(0,24,0,24);
        root.addView(info, ip);

        status = new TextView(this);
        status.setText("Status: stopped");
        status.setTextSize(18f);
        root.addView(status, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button start = new Button(this); start.setText("START AI LISTENER");
        start.setOnClickListener(v -> ensurePermissionAndStart());
        root.addView(start, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button stop = new Button(this); stop.setText("STOP AI LISTENER");
        stop.setOnClickListener(v -> { Intent i=new Intent(this, LiveAudioCaptureService.class); i.setAction(LiveAudioCaptureService.ACTION_STOP); startService(i); status.setText("Status: stopping / saving WAV…"); });
        root.addView(stop, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView note = new TextView(this);
        note.setText("Test procedure: 1) Start AI Listener. 2) Leave DexterOS running. 3) Answer the bOnline call on the Meizu. 4) Speak for 15–30 seconds. 5) Return here and stop the listener. If Android lets both apps share the mic, the capture continues through the call.");
        note.setTextSize(14f);
        LinearLayout.LayoutParams np = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); np.setMargins(0,24,0,0);
        root.addView(note,np);
        setContentView(root);
    }

    private void ensurePermissionAndStart() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 10); return;
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 11);
        }
        Intent i = new Intent(this, LiveAudioCaptureService.class); i.setAction(LiveAudioCaptureService.ACTION_START);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
        status.setText("Status: LISTENING — answer bOnline call now");
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode==10 && results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED) ensurePermissionAndStart();
        else if (requestCode==10) status.setText("Status: microphone permission required");
    }
}
