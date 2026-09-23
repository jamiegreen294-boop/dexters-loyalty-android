package co.dexters.loyalty;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
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
import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import net.nyx.printerservice.print.IPrinterService;
import net.nyx.printerservice.print.PrintTextFormat;

public class MainActivity extends Activity {
    private static final String REMOTE_HOME = "https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-pos-live-ui";
    private static final String BACKUP_HOME = "file:///android_asset/index.html";
    private static final String SQUARE_APPLICATION_ID = "sq0idp-D5GMRNfD6MorTLnfto8e8A";
    private static final int SQUARE_CHARGE_REQUEST = 2401;
    private WebView webView;
    private boolean usingBackup = false;
    private PosClient squareClient;
    private boolean squareInProgress = false;
    private int paymentAmountPence = 0;
    private IPrinterService printer;
    private boolean printerBound = false;
    private String pendingReceipt;
    private final ServiceConnection printerConnection = new ServiceConnection() {
        @Override public void onServiceConnected(ComponentName name, IBinder binder) {
            printer = IPrinterService.Stub.asInterface(binder);
            if (pendingReceipt != null) {
                String text = pendingReceipt;
                pendingReceipt = null;
                printReceipt(text);
            }
        }
        @Override public void onServiceDisconnected(ComponentName name) {
            printer = null;
            printerBound = false;
        }
    };

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterKiosk();
        squareClient = PosSdk.createClient(this, SQUARE_APPLICATION_ID);
        bindPrinter();
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
            @JavascriptInterface public void startPayment(int amountPence) {
                runOnUiThread(() -> startSquarePayment(amountPence));
            }
        }, "DextersSquare");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void testPrinter() {
                runOnUiThread(() -> printReceipt("DEXTER'S\nFOODHUB PRINTER TEST\nNo payment taken\n\n\n"));
            }
        }, "DextersPrinter");
        if (savedInstanceState == null) loadRemote(false); else webView.restoreState(savedInstanceState);
    }


    private void startSquarePayment(int amountPence) {
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
            .autoReturn(4, TimeUnit.SECONDS)
            .build();
        try {
            squareInProgress = true;
            paymentAmountPence = amountPence;
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
                String reference = success.clientTransactionId == null ? "" : success.clientTransactionId;
                String receipt = "DEXTER'S\nCARD PAYMENT RECEIPT\n\n" +
                    "Date: " + DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT, Locale.UK).format(new Date()) + "\n" +
                    "Amount paid: " + String.format(Locale.UK, "£%.2f", paymentAmountPence / 100.0) + "\n" +
                    "Status: APPROVED\n" +
                    "Square ref: " + reference + "\n\nThank you\n\n\n";
                printReceipt(receipt);
                sendSquareResult(true, success.clientTransactionId, "", "Approved");
            } else {
                ChargeRequest.Error error = squareClient.parseChargeError(data);
                sendSquareResult(false, "", String.valueOf(error.code), error.debugDescription);
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void bindPrinter() {
        if (printerBound) return;
        Intent intent = new Intent("com.incar.printerservice.IPrinterService");
        intent.setPackage("com.incar.printerservice");
        try { printerBound = bindService(intent, printerConnection, Context.BIND_AUTO_CREATE); }
        catch (Exception e) { android.util.Log.e("DextersPrinter", "Printer bind failed", e); }
    }

    private void printReceipt(String receipt) {
        if (printer == null) {
            pendingReceipt = receipt;
            bindPrinter();
            return;
        }
        new Thread(() -> {
            try {
                PrintTextFormat format = new PrintTextFormat();
                format.setTextSize(22);
                int result = printer.printText(receipt, format);
                if (result != 0) android.util.Log.e("DextersPrinter", "Print returned " + result);
            } catch (Exception e) { android.util.Log.e("DextersPrinter", "Print failed", e); }
        }, "DextersReceipt").start();
    }

    @Override protected void onDestroy() {
        if (printerBound) { unbindService(printerConnection); printerBound = false; }
        super.onDestroy();
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
