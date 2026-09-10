package co.dexters.meizu.audio;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.content.FileProvider;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private TextView status;
    private Button upload;
    private Button share;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable poll=new Runnable(){ @Override public void run(){ refreshStatus(); handler.postDelayed(this,500); } };
    private static final String UPLOAD_URL="https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/meizu-audio-upload";
    private static final String UPLOAD_KEY="8jNUH-A8PMYupMt8icZcrovseovMcu2Gv8nkMA57A9s";

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(36,36,36,36);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("DEXTEROS Audio Listener"); title.setTextSize(26f);
        root.addView(title,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView info = new TextView(this);
        info.setText("Meizu-only test. Start the AI listener BEFORE answering the bOnline call. Stop it after the test, then upload or securely share the saved test recording.");
        info.setTextSize(16f);
        LinearLayout.LayoutParams ip=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT); ip.setMargins(0,24,0,24);
        root.addView(info,ip);

        status=new TextView(this); status.setTextSize(18f);
        root.addView(status,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));

        Button start=new Button(this); start.setText("START AI LISTENER"); start.setOnClickListener(v->ensurePermissionAndStart());
        root.addView(start,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));

        Button stop=new Button(this); stop.setText("STOP AI LISTENER");
        stop.setOnClickListener(v->{ Intent i=new Intent(this,LiveAudioCaptureService.class); i.setAction(LiveAudioCaptureService.ACTION_STOP); startService(i); prefs().edit().putString("last_status","Stopping recording…").apply(); refreshStatus(); });
        root.addView(stop,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));

        upload=new Button(this); upload.setText("UPLOAD TEST TO SUPABASE"); upload.setEnabled(false); upload.setOnClickListener(v->uploadLastRecording());
        root.addView(upload,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));

        share=new Button(this); share.setText("SHARE LAST RECORDING"); share.setEnabled(false); share.setOnClickListener(v->shareLastRecording());
        root.addView(share,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView note=new TextView(this);
        note.setText("Test: 1) Start listener. 2) Answer bOnline call. 3) Speak for 15–30 seconds. 4) Stop listener. 5) Wait for 'Recording ready'. 6) Upload to Supabase or tap Share Last Recording to attach the exact newest WAV to ChatGPT.");
        note.setTextSize(14f);
        LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT); np.setMargins(0,24,0,0);
        root.addView(note,np);
        setContentView(root);
        refreshStatus();
    }

    private SharedPreferences prefs(){ return getSharedPreferences("dexteros_audio",MODE_PRIVATE); }
    private File getLastRecording(){
        String p=prefs().getString("last_path","");
        return p.isEmpty()?null:new File(p);
    }
    private void refreshStatus(){
        String s=prefs().getString("last_status","Stopped");
        status.setText("Status: "+s);
        File f=getLastRecording();
        boolean ready=f!=null && f.exists() && f.length()>44 && !s.startsWith("LISTENING") && !s.startsWith("Stopping");
        upload.setEnabled(ready);
        share.setEnabled(ready);
    }

    @Override protected void onResume(){ super.onResume(); handler.post(poll); }
    @Override protected void onPause(){ handler.removeCallbacks(poll); super.onPause(); }

    private void ensurePermissionAndStart(){
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){ requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},10); return; }
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){ requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},11); }
        prefs().edit().remove("last_path").putLong("last_bytes",0).putString("last_status","Starting listener…").apply();
        Intent i=new Intent(this,LiveAudioCaptureService.class); i.setAction(LiveAudioCaptureService.ACTION_START);
        if(Build.VERSION.SDK_INT>=26) startForegroundService(i); else startService(i);
        refreshStatus();
    }

    private void uploadLastRecording(){
        File f=getLastRecording();
        if(f==null || !f.exists()){ prefs().edit().putString("last_status","ERROR: saved recording not found").apply(); refreshStatus(); return; }
        upload.setEnabled(false); status.setText("Status: uploading test recording…");
        new Thread(()->{
            try{
                HttpURLConnection c=(HttpURLConnection)new URL(UPLOAD_URL).openConnection();
                c.setRequestMethod("POST"); c.setDoOutput(true); c.setConnectTimeout(15000); c.setReadTimeout(30000);
                c.setRequestProperty("Content-Type","audio/wav"); c.setRequestProperty("x-dexters-upload-key",UPLOAD_KEY); c.setFixedLengthStreamingMode(f.length());
                try(OutputStream out=c.getOutputStream(); FileInputStream in=new FileInputStream(f)){
                    byte[] b=new byte[8192]; int n; while((n=in.read(b))!=-1) out.write(b,0,n); out.flush();
                }
                int code=c.getResponseCode();
                if(code>=200 && code<300) prefs().edit().putString("last_status","Uploaded to Supabase successfully — ready for review").apply();
                else prefs().edit().putString("last_status","ERROR uploading to Supabase: HTTP "+code).apply();
                c.disconnect();
            }catch(Exception e){ prefs().edit().putString("last_status","ERROR uploading: "+e.getClass().getSimpleName()+": "+String.valueOf(e.getMessage())).apply(); }
            runOnUiThread(this::refreshStatus);
        },"DexterOS-Upload").start();
    }

    private void shareLastRecording(){
        try {
            File f=getLastRecording();
            if(f==null || !f.exists()) throw new FileNotFoundException("saved recording not found");
            Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",f);
            Intent send=new Intent(Intent.ACTION_SEND);
            send.setType("audio/wav");
            send.putExtra(Intent.EXTRA_STREAM,uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(send,"Share DEXTEROS test recording"));
        } catch(Exception e){
            prefs().edit().putString("last_status","ERROR sharing recording: "+e.getClass().getSimpleName()+": "+String.valueOf(e.getMessage())).apply();
            refreshStatus();
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){
        super.onRequestPermissionsResult(requestCode,permissions,results);
        if(requestCode==10 && results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED) ensurePermissionAndStart();
        else if(requestCode==10){ prefs().edit().putString("last_status","ERROR: microphone permission required").apply(); refreshStatus(); }
    }
}
