package co.dexters.loyalty;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AudioCaptureTestActivity extends Activity {
    private static final int MIC_REQUEST = 3101;
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 28, 28, 28);
        root.setBackgroundColor(Color.rgb(3, 4, 7));

        TextView title = new TextView(this);
        title.setText("DEXTEROS AUDIO TEST");
        title.setTextColor(Color.WHITE);
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER_VERTICAL);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("Tests the Meizu microphone audio path while bOnline is in use. Android may block direct capture of the caller audio from another app; if that happens, use speakerphone so the microphone can hear both sides.");
        info.setTextColor(Color.LTGRAY);
        info.setTextSize(15);
        info.setPadding(0, 14, 0, 22);
        root.addView(info);

        status = new TextView(this);
        status.setText("Ready to test");
        status.setTextColor(Color.WHITE);
        status.setTextSize(16);
        status.setPadding(0, 0, 0, 18);
        root.addView(status);

        Button mic = new Button(this);
        mic.setText("Test microphone");
        mic.setAllCaps(false);
        mic.setOnClickListener(v -> startTest(MediaRecorder.AudioSource.MIC, "MIC"));
        root.addView(mic, buttonParams());

        Button voiceRecognition = new Button(this);
        voiceRecognition.setText("Test voice recognition audio");
        voiceRecognition.setAllCaps(false);
        voiceRecognition.setOnClickListener(v -> startTest(MediaRecorder.AudioSource.VOICE_RECOGNITION, "VOICE_RECOGNITION"));
        root.addView(voiceRecognition, buttonParams());

        Button voiceComm = new Button(this);
        voiceComm.setText("Test voice communication audio");
        voiceComm.setAllCaps(false);
        voiceComm.setOnClickListener(v -> startTest(MediaRecorder.AudioSource.VOICE_COMMUNICATION, "VOICE_COMMUNICATION"));
        root.addView(voiceComm, buttonParams());

        Button speaker = new Button(this);
        speaker.setText("Turn speakerphone on");
        speaker.setAllCaps(false);
        speaker.setOnClickListener(v -> {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am != null) {
                am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                am.setSpeakerphoneOn(true);
                status.setText("Speakerphone requested. Start a bOnline call, then run a microphone test.");
            }
        });
        root.addView(speaker, buttonParams());

        Button stop = new Button(this);
        stop.setText("Stop audio test");
        stop.setAllCaps(false);
        stop.setOnClickListener(v -> {
            stopService(new Intent(this, LiveAudioCaptureService.class));
            status.setText("Audio test stopped");
        });
        root.addView(stop, buttonParams());

        setContentView(root);
    }

    private LinearLayout.LayoutParams buttonParams() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 12);
        return lp;
    }

    private void startTest(int source, String label) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            status.setText("Microphone permission required. Grant it, then tap the test again.");
            return;
        }
        Intent i = new Intent(this, LiveAudioCaptureService.class);
        i.putExtra("audioSource", source);
        i.putExtra("audioSourceLabel", label);
        startForegroundService(i);
        status.setText("Testing " + label + ". Make a bOnline call and check whether both sides are audible. No order is sent anywhere from this test.");
    }
}
