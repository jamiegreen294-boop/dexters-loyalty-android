package co.dexters.loyalty;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.view.Gravity;
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
            if (LiveAudioCaptureService.ACTION_STARTED.equals(intent.getAction())) {
                meter.setProgress(0);
                status.setText("MICROPHONE ARMED. Now open bOnline and make or answer the call. DexterOS will keep recording in the background until you return and tap FINISH & SAVE RECORDING.");
            } else if (LiveAudioCaptureService.ACTION_LEVEL.equals(intent.getAction())) {
                int level = intent.getIntExtra(LiveAudioCaptureService.EXTRA_LEVEL, 0);
                meter.setProgress(level);
                status.setText("Recording is active in the background. Audio level: " + level + "%\nOpen bOnline, complete the call, then come back here to finish the recording.");
            } else if (LiveAudioCaptureService.ACTION_DONE.equals(intent.getAction())) {
                lastPath = intent.getStringExtra(LiveAudioCaptureService.EXTRA_PATH);
                String label = intent.getStringExtra(LiveAudioCaptureService.EXTRA_LABEL);
                meter.setProgress(0);
                play.setEnabled(lastPath != null);
                status.setText("Recording saved: " + label + ". Tap PLAY TEST RECORDING and check whether you can hear both sides of the bOnline call.");
            }
        }
    };

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        IntentFilter f = new IntentFilter();
        f.addAction(LiveAudioCaptureService.ACTION_STARTED);
        f.addAction(LiveAudioCaptureService.ACTION_LEVEL);
        f.addAction(LiveAudioCaptureService.ACTION_DONE);
        if (android.os.Build.VERSION.SDK_INT >= 33) registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(receiver, f);
        restoreLastRecording();
    }

    @Override protected void onResume() {
        super.onResume();
        restoreLastRecording();
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
        info.setText("NEW TEST: start DexterOS first, then open bOnline. The microphone stays armed while DexterOS is in the background. Nothing is uploaded and no order is sent.");
        info.setTextColor(Color.LTGRAY);
        info.setTextSize(15);
        info.setPadding(0, 14, 0, 18);
        root.addView(info);

        status = new TextView(this);
        status.setText("Ready. Tap ARM MICROPHONE BEFORE CALL first.");
        status.setTextColor(Color.WHITE);
        status.setTextSize(16);
        status.setPadding(0, 0, 0, 10);
        root.addView(status);

        meter = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        meter.setMax(100);
        meter.setProgress(0);
        root.addView(meter, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 40));

        Button arm = new Button(this);
        arm.setText("ARM MICROPHONE BEFORE CALL");
        arm.setAllCaps(false);
        arm.setOnClickListener(v -> startTest(MediaRecorder.AudioSource.MIC, "MIC_PRECALL"));
        root.addView(arm, buttonParams());

        Button speaker = new Button(this);
        speaker.setText("Turn speakerphone on");
        speaker.setAllCaps(false);
        speaker.setOnClickListener(v -> {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am != null) {
                am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                am.setSpeakerphoneOn(true);
                status.setText("Speakerphone requested. Now tap ARM MICROPHONE BEFORE CALL, then open bOnline.");
            }
        });
        root.addView(speaker, buttonParams());

        Button stop = new Button(this);
        stop.setText("FINISH & SAVE RECORDING");
        stop.setAllCaps(false);
        stop.setOnClickListener(v -> {
            Intent i = new Intent(this, LiveAudioCaptureService.class);
            i.setAction(LiveAudioCaptureService.ACTION_STOP_CAPTURE);
            startService(i);
            status.setText("Finishing recording… wait a moment, then PLAY TEST RECORDING will become available.");
        });
        root.addView(stop, buttonParams());

        play = new Button(this);
        play.setText("PLAY TEST RECORDING");
        play.setAllCaps(false);
        play.setEnabled(false);
        play.setOnClickListener(v -> playLast());
        root.addView(play, buttonParams());

        TextView fallback = new TextView(this);
        fallback.setText("If this still stops as soon as bOnline connects, Android/bOnline is taking exclusive control of the microphone. This test will prove that before we change anything else.");
        fallback.setTextColor(Color.LTGRAY);
        fallback.setTextSize(13);
        fallback.setPadding(0, 10, 0, 0);
        root.addView(fallback);

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
            status.setText("Microphone permission required. Grant it, then tap ARM MICROPHONE BEFORE CALL again.");
            return;
        }
        stopPlayback();
        lastPath = null;
        play.setEnabled(false);
        meter.setProgress(0);
        getSharedPreferences(LiveAudioCaptureService.PREFS, MODE_PRIVATE).edit()
                .remove(LiveAudioCaptureService.PREF_LAST_PATH)
                .remove(LiveAudioCaptureService.PREF_LAST_LABEL)
                .apply();
        Intent i = new Intent(this, LiveAudioCaptureService.class);
        i.putExtra("audioSource", source);
        i.putExtra("audioSourceLabel", label);
        startForegroundService(i);
        status.setText("Arming microphone… keep DexterOS open until it says MICROPHONE ARMED, then switch to bOnline.");
    }

    private void restoreLastRecording() {
        SharedPreferences p = getSharedPreferences(LiveAudioCaptureService.PREFS, MODE_PRIVATE);
        String path = p.getString(LiveAudioCaptureService.PREF_LAST_PATH, null);
        if (path != null) {
            lastPath = path;
            if (play != null) play.setEnabled(true);
        }
    }

    private void playLast() {
        if (lastPath == null) {
            restoreLastRecording();
            if (lastPath == null) {
                status.setText("No saved recording yet. Arm the microphone, complete a bOnline call, then tap FINISH & SAVE RECORDING.");
                return;
            }
        }
        try {
            stopPlayback();
            player = new MediaPlayer();
            player.setDataSource(lastPath);
            player.prepare();
            player.start();
            status.setText("Playing captured audio. Check whether you can hear BOTH your voice and the remote caller.");
            player.setOnCompletionListener(mp -> {
                stopPlayback();
                status.setText("Playback finished. Tell me whether you heard your voice, the caller, both, or silence.");
            });
        } catch (Exception e) {
            status.setText("Could not play the saved recording: " + e.getClass().getSimpleName());
        }
    }

    private void stopPlayback() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) {}
            player.release();
            player = null;
        }
    }

    @Override protected void onDestroy() {
        try { unregisterReceiver(receiver); } catch (Exception ignored) {}
        stopPlayback();
        // Do NOT stop LiveAudioCaptureService here. It must remain active while bOnline is in front.
        super.onDestroy();
    }
}
