package co.dexters.backoffice;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String HOME = "https://backoffice.dextersspot.co.uk/";
    private static final int CAMERA_REQUEST = 1001;
    private static final int FILE_REQUEST = 1002;
    private WebView webView;
    private PermissionRequest pendingPermission;
    private ValueCallback<Uri[]> pendingFiles;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webView.clearCache(true);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(HOME) && !url.contains("money-owed.html")) {
                    String js = "(function(){" +
                        "function installMoneyOwed(){" +
                        "var tabs=document.querySelector('#customerRecordView .staff-subtabs');if(!tabs)return false;" +
                        "var existing=tabs.querySelector('[data-custtab=moneyowed]');if(existing)return true;" +
                        "var b=document.createElement('button');b.setAttribute('data-custtab','moneyowed');b.textContent='Money Owed';" +
                        "var audit=tabs.querySelector('[data-custtab=audit]');if(audit)tabs.insertBefore(b,audit);else tabs.appendChild(b);" +
                        "var pane=document.getElementById('custPane-moneyowed');if(!pane){pane=document.createElement('div');pane.className='staff-tabpane';pane.id='custPane-moneyowed';pane.innerHTML='<div class=\"card\" style=\"padding:0;overflow:hidden\"><iframe id=\"custMoneyOwedFrame\" title=\"Money Owed\" style=\"width:100%;height:760px;border:0;background:#fff\"></iframe></div>';tabs.parentNode.appendChild(pane);}" +
                        "b.addEventListener('click',function(){document.querySelectorAll('#customerRecordView .staff-subtabs button').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('#customerRecordView .staff-tabpane').forEach(function(x){x.classList.remove('active')});b.classList.add('active');pane.classList.add('active');var n=(document.getElementById('cuPhone')||{}).value||(document.getElementById('cuName')||{}).value||(document.getElementById('cuEmail')||{}).value||'';var f=document.getElementById('custMoneyOwedFrame');if(f)f.src='/money-owed.html?embed=1&v=20260913-4&q='+encodeURIComponent(n);});" +
                        "return true;}" +
                        "installMoneyOwed();" +
                        "if(window.__DEX_MONEY_OWED_TIMER)clearInterval(window.__DEX_MONEY_OWED_TIMER);" +
                        "window.__DEX_MONEY_OWED_TIMER=setInterval(installMoneyOwed,750);" +
                        "})();";
                    view.evaluateJavascript(js, null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                            else {
                                pendingPermission = request;
                                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                            }
                            return;
                        }
                    }
                    request.deny();
                });
            }

            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try { startActivityForResult(intent, FILE_REQUEST); return true; }
                catch (Exception e) { pendingFiles = null; return false; }
            }
        });

        if (savedInstanceState == null) webView.loadUrl(HOME + "?appv=1.3"); else webView.restoreState(savedInstanceState);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && pendingFiles != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            pendingFiles.onReceiveValue(results);
            pendingFiles = null;
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_REQUEST && pendingPermission != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingPermission.deny();
            pendingPermission = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }
}
