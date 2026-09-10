package co.dexters.meizu.audio;

import android.app.*;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.provider.MediaStore;
import java.io.*;

public class LiveAudioCaptureService extends Service {
    public static final String ACTION_START="co.dexters.meizu.audio.START";
    public static final String ACTION_STOP="co.dexters.meizu.audio.STOP";
    private static final int RATE=16000;
    private volatile boolean running=false;
    private AudioRecord recorder;
    private Thread worker;
    private File pcmFile;

    @Override public void onCreate(){ super.onCreate(); createChannel(); }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        String a=intent==null?ACTION_START:intent.getAction();
        if(ACTION_STOP.equals(a)){ stopCapture(); stopSelf(); return START_NOT_STICKY; }
        startForegroundCompat();
        if(!running) startCapture();
        return START_STICKY;
    }

    private void startForegroundCompat(){
        Notification.Builder b = Build.VERSION.SDK_INT>=26 ? new Notification.Builder(this,"dexteros_audio") : new Notification.Builder(this);
        b.setContentTitle("DEXTEROS AI Listener").setContentText("Listening before/during bOnline call").setSmallIcon(android.R.drawable.ic_btn_speak_now).setOngoing(true);
        Notification n=b.build();
        if(Build.VERSION.SDK_INT>=29) startForeground(4401,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE); else startForeground(4401,n);
    }

    private void createChannel(){ if(Build.VERSION.SDK_INT>=26){ NotificationChannel c=new NotificationChannel("dexteros_audio","DEXTEROS Audio",NotificationManager.IMPORTANCE_LOW); ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);} }

    private void startCapture(){
        int min=AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
        int buf=Math.max(min, RATE*2);
        recorder=new AudioRecord(MediaRecorder.AudioSource.MIC,RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,buf);
        if(recorder.getState()!=AudioRecord.STATE_INITIALIZED){ stopSelf(); return; }
        pcmFile=new File(getCacheDir(),"dexteros-live.pcm");
        running=true;
        recorder.startRecording();
        worker=new Thread(() -> {
            byte[] data=new byte[buf];
            try(FileOutputStream out=new FileOutputStream(pcmFile,false)){
                while(running){ int n=recorder.read(data,0,data.length); if(n>0) out.write(data,0,n); }
            }catch(Exception ignored){}
        },"DexterOS-Audio"); worker.start();
    }

    private synchronized void stopCapture(){
        if(!running) return; running=false;
        try{ if(recorder!=null) recorder.stop(); }catch(Exception ignored){}
        try{ if(worker!=null) worker.join(1200); }catch(Exception ignored){}
        try{ if(recorder!=null) recorder.release(); }catch(Exception ignored){}
        recorder=null;
        if(pcmFile!=null && pcmFile.exists()){
            String name="dexteros-call-test-"+System.currentTimeMillis()+".wav";
            try{ saveWavToDownloads(pcmFile,name); }catch(Exception ignored){}
            pcmFile.delete();
        }
        stopForeground(true);
    }

    private void saveWavToDownloads(File pcm,String fileName) throws IOException {
        if(Build.VERSION.SDK_INT>=29){
            ContentResolver resolver=getContentResolver();
            ContentValues values=new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME,fileName);
            values.put(MediaStore.Downloads.MIME_TYPE,"audio/wav");
            values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/DEXTEROS");
            values.put(MediaStore.Downloads.IS_PENDING,1);
            Uri uri=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
            if(uri==null) throw new IOException("Unable to create Downloads file");
            try(OutputStream out=resolver.openOutputStream(uri)){
                if(out==null) throw new IOException("Unable to open Downloads file");
                pcmToWav(pcm,out);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING,0);
            resolver.update(uri,values,null,null);
        } else {
            File downloads=Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File dir=new File(downloads,"DEXTEROS");
            if(!dir.exists() && !dir.mkdirs()) throw new IOException("Unable to create DEXTEROS folder");
            File wav=new File(dir,fileName);
            try(FileOutputStream out=new FileOutputStream(wav)){ pcmToWav(pcm,out); }
        }
    }

    private void pcmToWav(File pcm,OutputStream out) throws IOException{
        long audioLen=pcm.length(), dataLen=audioLen+36; int byteRate=RATE*2;
        try(FileInputStream in=new FileInputStream(pcm)){
            byte[] h=new byte[44];
            h[0]='R';h[1]='I';h[2]='F';h[3]='F'; putInt(h,4,(int)(dataLen)); h[8]='W';h[9]='A';h[10]='V';h[11]='E'; h[12]='f';h[13]='m';h[14]='t';h[15]=' '; putInt(h,16,16); h[20]=1;h[22]=1; putInt(h,24,RATE); putInt(h,28,byteRate); h[32]=2;h[34]=16; h[36]='d';h[37]='a';h[38]='t';h[39]='a'; putInt(h,40,(int)audioLen); out.write(h);
            byte[] b=new byte[8192]; int n; while((n=in.read(b))!=-1) out.write(b,0,n);
        }
    }
    private void putInt(byte[] a,int p,int v){a[p]=(byte)v;a[p+1]=(byte)(v>>8);a[p+2]=(byte)(v>>16);a[p+3]=(byte)(v>>24);}
    @Override public void onDestroy(){ stopCapture(); super.onDestroy(); }
    @Override public IBinder onBind(Intent i){ return null; }
}
