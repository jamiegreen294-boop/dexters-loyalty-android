package co.dexters.loyalty;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class AudioCaptureTestActivity extends Activity {
    private static final int MIC_REQUEST = 3101;
    private TextView status;
    private ProgressBar meter;
    private Button play;
    private String lastPath;
    private MediaPlayer player;

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (LiveAudioCaptureService.ACTION_LEVEL.equals(intent.getAction())) {
                int level = intent.getIntExtra(LiveAudioCaptureService.EXTRA_LEVEL, 0);
                meter.setProgress(level);
                status.setText("Recording 15-second sample… Audio level: " + level + "%\nHave both people speak during the test.");
            } else if (LiveAudioCaptureService.ACTION_DONE.equals(intent.getAction())) {
                lastPath = intent.getStringExtra(LiveAudioCaptureService.EXTRA_PATH);
                String label = intent.getStringExtra(LiveAudioCaptureService.EXTRA_LABEL);
                meter.setProgress(0);
                play.setEnabled(lastPath != null);
                status.setText("Test finished: " + label + ". Tap PLAY TEST RECORDING and check whether you can hear both staff and caller.");
            }
        }
    };

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        IntentFilter f = new IntentFilter();
        f.addAction(LiveAudioCaptureService.ACTION_LEVEL);
        f.addAction(LiveAudioCaptureService.ACTION_DONE);
        if (android.os.Build.VERSION.SDK_INT >= 33) registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(receiver, f);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 28, 28, 28);
        root.setBackgroundColor(Color.rgb(3, 4, 7));

        TextView title = new TextView(this);
        title.setText("DEXTEROS AUDIO TEST"); title.setTextColor(Color.WHITE); title.setTextSize(24); title.setGravity(Gravity.CENTER_VERTICAL);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD); root.addView(title);

        TextView info = new TextView(this);
        info.setText("Run this during a bOnline call. Each test records 15 seconds locally on this Meizu only. Nothing is uploaded and no order is sent.");
        info.setTextColor(Color.LTGRAY); info.setTextSize(15); info.setPadding(0, 14, 0, 18); root.addView(info);

        status = new TextView(this);
        status.setText("Ready to test"); status.setTextColor(Color.WHITE); status.setTextSize(16); status.setPadding(0, 0, 0, 10); root.addView(status);

        meter = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        meter.setMax(100); meter.setProgress(0); root.addView(meter, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 40));

        addTestButton(root, "Test microphone", MediaRecorder.AudioSource.MIC, "MIC");
        addTestButton(root, "Test voice recognition audio", MediaRecorder.AudioSource.VOICE_RECOGNITION, "VOICE_RECOGNITION");
        addTestButton(root, "Test voice communication audio", MediaRecorder.AudioSource.VOICE_COMMUNICATION, "VOICE_COMMUNICATION");

        Button speaker = new Button(this);
        speaker.setText("Turn speakerphone on"); speaker.setAllCaps(false);
        speaker.setOnClickListener(v -> {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am != null) { am.setMode(AudioManager.MODE_IN_COMMUNICATION); am.setSpeakerphoneOn(true); status.setText("Speakerphone requested. Keep the bOnline call active, then tap Test microphone."); }
        });
        root.addView(speaker, buttonParams());

        play = new Button(this);
        play.setText("Play test recording"); play.setAllCaps(false); play.setEnabled(false); play.setOnClickListener(v -> playLast()); root.addView(play, buttonParams());

        Button stop = new Button(this);
        stop.setText("Stop audio test"); stop.setAllCaps(false);
        stop.setOnClickListener(v -> { stopService(new Intent(this, LiveAudioCaptureService.class)); meter.setProgress(0); status.setText("Audio test stopped"); });
        root.addView(stop, buttonParams());

        setContentView(root);
    }

    private void addTestButton(LinearLayout root, String text, int source, String label) {
        Button b = new Button(this); b.setText(text); b.setAllCaps(false); b.setOnClickListener(v -> startTest(source, label)); root.addView(b, buttonParams());
    }

    private LinearLayout.LayoutParams buttonParams() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); lp.setMargins(0, 0, 0, 12); return lp;
    }

    private void startTest(int source, String label) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST); status.setText("Microphone permission required. Grant it, then tap the test again."); return;
        }
        stopPlayback(); lastPath = null; play.setEnabled(false); meter.setProgress(0);
        Intent i = new Intent(this, LiveAudioCaptureService.class); i.putExtra("audioSource", source); i.putExtra("audioSourceLabel", label); startForegroundService(i);
        status.setText("Starting 15-second " + label + " recording. Have both people speak now.");
    }

    private void playLast() {
        if (lastPath == null) return;
        try {
            stopPlayback(); player = new MediaPlayer(); player.setDataSource(lastPath); player.prepare(); player.start();
            status.setText("Playing captured audio. Confirm whether you can hear BOTH the Meizu staff side and the remote caller.");
            player.setOnCompletionListener(mp -> { stopPlayback(); status.setText("Playback finished. If both sides were clear, this audio source is usable for AI transcription."); });
        } catch (Exception e) { status.setText("Could not play the test recording: " + e.getClass().getSimpleName()); }
    }

    private void stopPlayback() { if (player != null) { try { player.stop(); } catch (Exception ignored) {} player.release(); player = null; } }

    @Override protected void onDestroy() {
        try { unregisterReceiver(receiver); } catch (Exception ignored) {}
        stopPlayback(); stopService(new Intent(this, LiveAudioCaptureService.class)); super.onDestroy();
    }
}