package co.dexters.meizu.audio;

import android.app.*;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.IBinder;
import java.io.*;

public class LiveAudioCaptureService extends Service {
    public static final String ACTION_START="co.dexters.meizu.audio.START";
    public static final String ACTION_STOP="co.dexters.meizu.audio.STOP";
    private static final int RATE=16000;
    private static final int SILENT_RESTART_CHUNKS=2;
    private volatile boolean running=false;
    private AudioRecord recorder;
    private Thread worker;
    private File pcmFile;
    private int restartCount=0;

    @Override public void onCreate(){ super.onCreate(); createChannel(); }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        String a=intent==null?ACTION_START:intent.getAction();
        if(ACTION_STOP.equals(a)){
            new Thread(() -> { stopCapture(); stopSelf(); }, "DexterOS-Stop").start();
            return START_NOT_STICKY;
        }
        startForegroundCompat();
        if(!running) startCapture();
        return START_STICKY;
    }

    private SharedPreferences prefs(){ return getSharedPreferences("dexteros_audio",MODE_PRIVATE); }
    private void setStatus(String s){ prefs().edit().putString("last_status",s).apply(); }

    private void startForegroundCompat(){
        Notification.Builder b = Build.VERSION.SDK_INT>=26 ? new Notification.Builder(this,"dexteros_audio") : new Notification.Builder(this);
        b.setContentTitle("DEXTEROS AI Listener").setContentText("Listening before/during bOnline call").setSmallIcon(android.R.drawable.ic_btn_speak_now).setOngoing(true);
        Notification n=b.build();
        if(Build.VERSION.SDK_INT>=29) startForeground(4401,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE); else startForeground(4401,n);
    }

    private void createChannel(){ if(Build.VERSION.SDK_INT>=26){ NotificationChannel c=new NotificationChannel("dexteros_audio","DEXTEROS Audio",NotificationManager.IMPORTANCE_LOW); ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);} }

    private AudioRecord createRecorder(int buf) throws Exception {
        AudioRecord r=new AudioRecord(MediaRecorder.AudioSource.MIC,RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,buf);
        if(r.getState()!=AudioRecord.STATE_INITIALIZED){ try{r.release();}catch(Exception ignored){} throw new IOException("microphone could not initialise"); }
        r.startRecording();
        return r;
    }

    private boolean isAllZero(byte[] data,int n){
        for(int i=0;i<n;i++) if(data[i]!=0) return false;
        return true;
    }

    private synchronized boolean restartRecorder(int buf,String reason){
        if(!running) return false;
        try{ if(recorder!=null) recorder.stop(); }catch(Exception ignored){}
        try{ if(recorder!=null) recorder.release(); }catch(Exception ignored){}
        recorder=null;
        try{ Thread.sleep(250); }catch(InterruptedException ignored){}
        if(!running) return false;
        try{
            recorder=createRecorder(buf);
            restartCount++;
            setStatus("LISTENING — audio recovered "+restartCount+" time"+(restartCount==1?"":"s"));
            return true;
        }catch(Exception e){
            setStatus("ERROR: audio restart failed after "+reason+": "+e.getClass().getSimpleName());
            return false;
        }
    }

    private void startCapture(){
        try {
            int min=AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
            final int buf=Math.max(min, RATE*2);
            recorder=createRecorder(buf);
            pcmFile=new File(getCacheDir(),"dexteros-live.pcm");
            if(pcmFile.exists()) pcmFile.delete();
            restartCount=0;
            running=true;
            setStatus("LISTENING — answer bOnline call now");
            worker=new Thread(() -> {
                byte[] data=new byte[buf];
                int silentChunks=0;
                try(FileOutputStream out=new FileOutputStream(pcmFile,false)){
                    while(running){
                        AudioRecord local=recorder;
                        if(local==null){
                            if(!restartRecorder(buf,"missing recorder")) break;
                            silentChunks=0;
                            continue;
                        }
                        int n;
                        try{ n=local.read(data,0,data.length); }
                        catch(Exception e){ n=AudioRecord.ERROR_DEAD_OBJECT; }

                        if(n>0){
                            out.write(data,0,n);
                            if(isAllZero(data,n)) silentChunks++; else silentChunks=0;
                            if(silentChunks>=SILENT_RESTART_CHUNKS && running){
                                out.flush();
                                if(!restartRecorder(buf,"sustained zero audio")) break;
                                silentChunks=0;
                            }
                        } else if(n==AudioRecord.ERROR_DEAD_OBJECT || n==AudioRecord.ERROR_INVALID_OPERATION || n==AudioRecord.ERROR_BAD_VALUE || n<0){
                            out.flush();
                            if(!restartRecorder(buf,"microphone read "+n)) break;
                            silentChunks=0;
                        }
                    }
                    out.flush();
                }catch(Exception e){ setStatus("ERROR: recording failed: "+e.getClass().getSimpleName()+": "+String.valueOf(e.getMessage())); }
            },"DexterOS-Audio"); worker.start();
        } catch(Exception e){ setStatus("ERROR: "+e.getClass().getSimpleName()+": "+String.valueOf(e.getMessage())); }
    }

    private synchronized void stopCapture(){
        if(!running){ setStatus("Stopped — no active recording"); stopForeground(true); return; }
        setStatus("Stopping recording…");
        running=false;
        try{ if(recorder!=null) recorder.stop(); }catch(Exception ignored){}
        try{ if(worker!=null) worker.join(2500); }catch(Exception ignored){}
        try{ if(recorder!=null) recorder.release(); }catch(Exception ignored){}
        recorder=null;
        try {
            if(pcmFile==null || !pcmFile.exists()) throw new IOException("PCM file missing");
            long pcmBytes=pcmFile.length();
            if(pcmBytes<=0) throw new IOException("No audio data captured");
            File wav=new File(getFilesDir(),"last-test-recording.wav");
            try(FileOutputStream out=new FileOutputStream(wav,false)){ pcmToWav(pcmFile,out); }
            long wavBytes=wav.length();
            prefs().edit().putString("last_path",wav.getAbsolutePath()).putLong("last_bytes",wavBytes).putInt("restart_count",restartCount).putString("last_status","Recording ready — "+wavBytes+" bytes — recoveries: "+restartCount).apply();
        } catch(Exception e){ setStatus("ERROR saving recording: "+e.getClass().getSimpleName()+": "+String.valueOf(e.getMessage())); }
        try{ if(pcmFile!=null) pcmFile.delete(); }catch(Exception ignored){}
        stopForeground(true);
    }

    private void pcmToWav(File pcm,OutputStream out) throws IOException{
        long audioLen=pcm.length(), dataLen=audioLen+36; int byteRate=RATE*2;
        try(FileInputStream in=new FileInputStream(pcm)){
            byte[] h=new byte[44];
            h[0]='R';h[1]='I';h[2]='F';h[3]='F'; putInt(h,4,(int)(dataLen)); h[8]='W';h[9]='A';h[10]='V';h[11]='E'; h[12]='f';h[13]='m';h[14]='t';h[15]=' '; putInt(h,16,16); h[20]=1;h[22]=1; putInt(h,24,RATE); putInt(h,28,byteRate); h[32]=2;h[34]=16; h[36]='d';h[37]='a';h[38]='t';h[39]='a'; putInt(h,40,(int)audioLen); out.write(h);
            byte[] b=new byte[8192]; int n; while((n=in.read(b))!=-1) out.write(b,0,n); out.flush();
        }
    }
    private void putInt(byte[] a,int p,int v){a[p]=(byte)v;a[p+1]=(byte)(v>>8);a[p+2]=(byte)(v>>16);a[p+3]=(byte)(v>>24);}
    @Override public void onDestroy(){ if(running) stopCapture(); super.onDestroy(); }
    @Override public IBinder onBind(Intent i){ return null; }
}
