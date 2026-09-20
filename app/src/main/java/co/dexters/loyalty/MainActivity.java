package co.dexters.loyalty;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.squareup.sdk.pos.ChargeRequest;
import com.squareup.sdk.pos.CurrencyCode;
import com.squareup.sdk.pos.PosClient;
import com.squareup.sdk.pos.PosSdk;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class MainActivity extends Activity {
    private static final String REMOTE_HOME = "https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-pos-live-ui";
    private static final String BACKUP_HOME = "file:///android_asset/index.html";
    private static final String SQUARE_APPLICATION_ID = "sq0idp-D5GMRNfD6MorTLnfto8e8A";
    private static final int SQUARE_CHARGE_REQUEST = 2401;
    private WebView webView;
    private boolean usingBackup = false;
    private PosClient squareClient;
    private boolean squareInProgress = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterKiosk();
        squareClient = PosSdk.createClient(this, SQUARE_APPLICATION_ID);
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
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void startPayment(long amountPence) {
                runOnUiThread(() -> startSquarePayment(amountPence));
            }
        }, "DextersSquare");
        if (savedInstanceState == null) loadRemote(false); else webView.restoreState(savedInstanceState);
    }


    private void startSquarePayment(long amountPence) {
        if (squareInProgress) {
            sendSquareResult(false, "", "transaction_in_progress", "A Square payment is already in progress");
            return;
        }
        if (amountPence <= 0) {
            sendSquareResult(false, "", "invalid_amount", "Payment amount must be greater than zero");
            return;
        }
        if (squareClient == null || !squareClient.isPointOfSaleInstalled()) {
            sendSquareResult(false, "", "square_not_installed", "Square Point of Sale is not installed");
            return;
        }
        ChargeRequest request = new ChargeRequest.Builder(amountPence, CurrencyCode.GBP)
            .note("Dexter's POS")
            .restrictTenderTypesTo(ChargeRequest.TenderType.CARD)
            .build();
        try {
            squareInProgress = true;
            Intent intent = squareClient.createChargeIntent(request);
            startActivityForResult(intent, SQUARE_CHARGE_REQUEST);
        } catch (ActivityNotFoundException e) {
            squareInProgress = false;
            sendSquareResult(false, "", "square_not_installed", "Square Point of Sale is not installed");
        } catch (Exception e) {
            squareInProgress = false;
            sendSquareResult(false, "", "square_launch_failed", e.getMessage() == null ? "Could not open Square" : e.getMessage());
        }
    }

    private void sendSquareResult(boolean ok, String transactionId, String errorCode, String message) {
        if (webView == null) return;
        String js = "window.onDextersSquareResult&&window.onDextersSquareResult({" +
            "ok:" + (ok ? "true" : "false") + "," +
            "transactionId:" + JSONObject.quote(transactionId == null ? "" : transactionId) + "," +
            "errorCode:" + JSONObject.quote(errorCode == null ? "" : errorCode) + "," +
            "message:" + JSONObject.quote(message == null ? "" : message) +
            "});";
        webView.evaluateJavascript(js, null);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == SQUARE_CHARGE_REQUEST) {
            squareInProgress = false;
            if (data == null) {
                sendSquareResult(false, "", "no_result", "Square closed without returning a result");
                return;
            }
            if (resultCode == Activity.RESULT_OK) {
                ChargeRequest.Success success = squareClient.parseChargeSuccess(data);
                sendSquareResult(true, success.clientTransactionId, "", "Approved");
            } else {
                ChargeRequest.Error error = squareClient.parseChargeError(data);
                sendSquareResult(false, "", String.valueOf(error.code), error.debugDescription);
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
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
