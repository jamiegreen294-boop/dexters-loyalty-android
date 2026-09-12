package co.dexters.loyalty;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class MainActivity extends Activity {
    private static final String REMOTE_HOME = "https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-pos-live-ui";
    private static final String BACKUP_HOME = "file:///android_asset/index.html";
    private WebView webView;
    private boolean usingBackup = false;

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
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(BACKUP_HOME)) injectBackupEnhancements(view);
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame() && !usingBackup) loadBackup();
            }

            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request != null && request.isForMainFrame() && !usingBackup && errorResponse != null && errorResponse.getStatusCode() >= 500) loadBackup();
            }
        });
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void checkForUpdates() { runOnUiThread(() -> loadRemote(true)); }
        }, "DextersUpdater");
        if (savedInstanceState == null) loadRemote(false); else webView.restoreState(savedInstanceState);
    }

    private void loadRemote(boolean manual) {
        usingBackup = false;
        webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        String url = REMOTE_HOME + "?t=" + System.currentTimeMillis();
        webView.loadUrl(url);
    }

    private void loadBackup() {
        usingBackup = true;
        webView.loadUrl(BACKUP_HOME);
    }

    private void injectAsset(WebView view, String assetName) {
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(getAssets().open(assetName), "UTF-8"));
            StringBuilder js = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) js.append(line).append('\n');
            br.close();
            view.evaluateJavascript(js.toString(), null);
        } catch (Exception ignored) {}
    }

    private void injectBackupEnhancements(WebView view) {
        injectAsset(view, "sunday-roast-pos.js");
        injectAsset(view, "pos-category-labels.js");
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

    @Override protected void onResume() {
        super.onResume();
        enterKiosk();
        if (webView != null && usingBackup) loadRemote(false);
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterKiosk();
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }
}
