package co.dexters.loyalty;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.IBinder;

public class LiveAudioCaptureService extends Service {
    private static final String CHANNEL_ID = "dexteros_audio_test";
    private static final int NOTIFICATION_ID = 4101;
    private volatile boolean running;
    private AudioRecord recorder;
    private Thread worker;

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        int source = intent != null ? intent.getIntExtra("audioSource", MediaRecorder.AudioSource.MIC) : MediaRecorder.AudioSource.MIC;
        String label = intent != null ? intent.getStringExtra("audioSourceLabel") : "MIC";
        Notification n = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("DexterOS audio test")
                .setContentText("Testing " + (label == null ? "audio" : label))
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
        beginCapture(source);
        return START_NOT_STICKY;
    }

    private void beginCapture(int source) {
        stopCapture();
        int sampleRate = 16000;
        int min = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        if (min <= 0) {
            stopSelf();
            return;
        }
        try {
            recorder = new AudioRecord(source, sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, Math.max(min * 2, 4096));
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
                stopSelf();
                return;
            }
            running = true;
            recorder.startRecording();
            worker = new Thread(() -> {
                byte[] buffer = new byte[Math.max(min, 2048)];
                while (running && recorder != null) {
                    int read = recorder.read(buffer, 0, buffer.length);
                    if (read < 0) break;
                    // Test-only capture. Audio is deliberately not saved or uploaded yet.
                    // The later transcription bridge can consume these PCM frames once
                    // the Meizu/bOnline audio path has been verified.
                }
            }, "DexterOS-AudioTest");
            worker.start();
        } catch (SecurityException | IllegalArgumentException e) {
            stopSelf();
        }
    }

    private void stopCapture() {
        running = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            recorder.release();
            recorder = null;
        }
        worker = null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "DexterOS audio test", NotificationManager.IMPORTANCE_LOW);
                channel.setDescription("Visible while DexterOS tests microphone capture for telephone transcription.");
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override public void onDestroy() {
        stopCapture();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
