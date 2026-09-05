package co.dexters.loyalty;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String HOME = "file:///android_asset/index.html";
    private static final String UPDATE_JSON = "https://raw.githubusercontent.com/jamiegreen294-boop/dexters-loyalty-android/dexters-pos-tablet-live/updates/pos-latest.json";
    private WebView webView;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterKiosk();
        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        if (savedInstanceState == null) webView.loadUrl(HOME); else webView.restoreState(savedInstanceState);
        new Thread(this::checkForUpdate).start();
    }

    private void enterKiosk() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private void checkForUpdate() {
        try {
            URL u = new URL(UPDATE_JSON);
            HttpURLConnection c = (HttpURLConnection) u.openConnection();
            c.setConnectTimeout(5000);
            c.setReadTimeout(5000);
            BufferedReader br = new BufferedReader(new InputStreamReader(c.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            br.close();
            String json = sb.toString();
            int v = parseInt(json, "versionCode");
            String apk = parseString(json, "apkUrl");
            String notes = parseString(json, "notes");
            int current = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            if (v > current && apk != null && !apk.isEmpty()) runOnUiThread(() -> showUpdate(apk, notes));
        } catch (Exception ignored) {}
    }

    private int parseInt(String j, String key) {
        try {
            String p = "\"" + key + "\"";
            int i = j.indexOf(p); if (i < 0) return 0;
            i = j.indexOf(':', i) + 1;
            while (i < j.length() && Character.isWhitespace(j.charAt(i))) i++;
            int e = i; while (e < j.length() && Character.isDigit(j.charAt(e))) e++;
            return Integer.parseInt(j.substring(i, e));
        } catch (Exception e) { return 0; }
    }

    private String parseString(String j, String key) {
        try {
            String p = "\"" + key + "\"";
            int i = j.indexOf(p); if (i < 0) return null;
            i = j.indexOf('"', j.indexOf(':', i)) + 1;
            int e = j.indexOf('"', i);
            return j.substring(i, e);
        } catch (Exception e) { return null; }
    }

    private void showUpdate(String apkUrl, String notes) {
        new AlertDialog.Builder(this)
            .setTitle("Dexter's POS update available")
            .setMessage((notes == null || notes.isEmpty()) ? "A new POS update is ready to download over Wi-Fi." : notes)
            .setCancelable(true)
            .setPositiveButton("Update now", (d, w) -> startUpdate(apkUrl))
            .setNegativeButton("Later", null)
            .show();
    }

    private void startUpdate(String apkUrl) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
                Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
                startActivity(i);
                return;
            }
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(apkUrl));
            r.setTitle("Dexter's POS update");
            r.setDescription("Downloading latest version");
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "Dexters-POS-Tablet-latest.apk");
            dm.enqueue(r);
            new AlertDialog.Builder(this)
                .setTitle("Update downloading")
                .setMessage("When the download finishes, tap the notification and approve the install.")
                .setPositiveButton("OK", null).show();
        } catch (Exception e) {
            new AlertDialog.Builder(this).setTitle("Update failed").setMessage(e.getMessage()).setPositiveButton("OK", null).show();
        }
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) enterKiosk(); }
    @Override public void onBackPressed() { if (webView != null && webView.canGoBack()) webView.goBack(); }
    @Override protected void onSaveInstanceState(Bundle outState) { webView.saveState(outState); super.onSaveInstanceState(outState); }
}