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

import java.io.File;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;

public class LiveAudioCaptureService extends Service {
    public static final String ACTION_LEVEL = "co.dexters.loyalty.AUDIO_LEVEL";
    public static final String ACTION_DONE = "co.dexters.loyalty.AUDIO_DONE";
    public static final String EXTRA_LEVEL = "level";
    public static final String EXTRA_PATH = "path";
    public static final String EXTRA_LABEL = "label";

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
                .setContentText("Recording 15s test: " + (label == null ? "audio" : label))
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        else startForeground(NOTIFICATION_ID, n);
        beginCapture(source, label == null ? "MIC" : label);
        return START_NOT_STICKY;
    }

    private void beginCapture(int source, String label) {
        stopCapture();
        final int sampleRate = 16000;
        int min = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        if (min <= 0) { stopSelf(); return; }
        try {
            recorder = new AudioRecord(source, sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, Math.max(min * 2, 4096));
            if (recorder.getState() != AudioRecord.STATE_INITIALIZED) { stopSelf(); return; }
            File wav = new File(getCacheDir(), "dexteros-audio-test.wav");
            FileOutputStream out = new FileOutputStream(wav, false);
            writeWavHeader(out, sampleRate, 1, 16);
            running = true;
            recorder.startRecording();
            worker = new Thread(() -> {
                byte[] buffer = new byte[Math.max(min, 2048)];
                long start = System.currentTimeMillis();
                long dataBytes = 0;
                try {
                    while (running && recorder != null && System.currentTimeMillis() - start < 15000) {
                        int read = recorder.read(buffer, 0, buffer.length);
                        if (read <= 0) break;
                        out.write(buffer, 0, read);
                        dataBytes += read;
                        long sum = 0;
                        int samples = 0;
                        for (int i = 0; i + 1 < read; i += 2) {
                            short s = (short)((buffer[i] & 0xff) | (buffer[i + 1] << 8));
                            sum += Math.abs((int)s);
                            samples++;
                        }
                        int level = samples == 0 ? 0 : (int)Math.min(100, (sum / samples) * 100L / 12000L);
                        Intent levelIntent = new Intent(ACTION_LEVEL).setPackage(getPackageName());
                        levelIntent.putExtra(EXTRA_LEVEL, level);
                        sendBroadcast(levelIntent);
                    }
                    out.flush();
                    out.close();
                    patchWavHeader(wav, dataBytes);
                    Intent done = new Intent(ACTION_DONE).setPackage(getPackageName());
                    done.putExtra(EXTRA_PATH, wav.getAbsolutePath());
                    done.putExtra(EXTRA_LABEL, label);
                    sendBroadcast(done);
                } catch (Exception ignored) {
                    try { out.close(); } catch (Exception ignored2) {}
                }
                running = false;
                stopSelf();
            }, "DexterOS-AudioTest");
            worker.start();
        } catch (Exception e) { stopSelf(); }
    }

    private static void writeWavHeader(FileOutputStream out, int sampleRate, int channels, int bits) throws Exception {
        byte[] h = new byte[44];
        h[0]='R';h[1]='I';h[2]='F';h[3]='F'; h[8]='W';h[9]='A';h[10]='V';h[11]='E';
        h[12]='f';h[13]='m';h[14]='t';h[15]=' '; putInt(h,16,16); putShort(h,20,(short)1); putShort(h,22,(short)channels);
        putInt(h,24,sampleRate); int byteRate=sampleRate*channels*bits/8; putInt(h,28,byteRate); putShort(h,32,(short)(channels*bits/8)); putShort(h,34,(short)bits);
        h[36]='d';h[37]='a';h[38]='t';h[39]='a'; out.write(h);
    }
    private static void patchWavHeader(File f, long dataBytes) throws Exception {
        RandomAccessFile raf = new RandomAccessFile(f,"rw"); raf.seek(4); writeIntLE(raf, 36 + dataBytes); raf.seek(40); writeIntLE(raf, dataBytes); raf.close();
    }
    private static void putInt(byte[] b,int o,int v){b[o]=(byte)v;b[o+1]=(byte)(v>>8);b[o+2]=(byte)(v>>16);b[o+3]=(byte)(v>>24);} 
    private static void putShort(byte[] b,int o,short v){b[o]=(byte)v;b[o+1]=(byte)(v>>8);} 
    private static void writeIntLE(RandomAccessFile r,long v)throws Exception{r.write((byte)v);r.write((byte)(v>>8));r.write((byte)(v>>16));r.write((byte)(v>>24));}

    private void stopCapture() {
        running = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            recorder.release(); recorder = null;
        }
        worker = null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel c = new NotificationChannel(CHANNEL_ID, "DexterOS audio test", NotificationManager.IMPORTANCE_LOW);
                c.setDescription("Visible while DexterOS tests microphone capture for telephone transcription."); nm.createNotificationChannel(c);
            }
        }
    }

    @Override public void onDestroy() { stopCapture(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}