package co.dexters.terminal;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.IBinder;
import android.os.RemoteException;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import net.nyx.printerservice.print.IPrinterService;
import net.nyx.printerservice.print.PrintTextFormat;

public class MainActivity extends Activity {
    private static final String HOME = "https://dexters-loyalty-v15.vercel.app";
    private static final int CAMERA_REQUEST = 1001;
    private static final int SCAN_REQUEST = 2001;

    private WebView webView;
    private TextView printerState;
    private PermissionRequest pendingPermission;
    private IPrinterService printerService;
    private boolean printerBound;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final StringBuilder scanBuffer = new StringBuilder();
    private long lastKeyAt;

    private final ServiceConnection printerConnection = new ServiceConnection() {
        @Override public void onServiceConnected(ComponentName name, IBinder service) {
            printerService = IPrinterService.Stub.asInterface(service);
            printerBound = true;
            refreshPrinterStatus();
        }

        @Override public void onServiceDisconnected(ComponentName name) {
            printerService = null;
            printerBound = false;
            setPrinterState("Printer reconnecting…");
            printerState.postDelayed(() -> bindPrinter(), 3000);
        }
    };

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        configureWebView();
        bindPrinter();
        if (savedInstanceState == null) webView.loadUrl(HOME); else webView.restoreState(savedInstanceState);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(8, 8, 14));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), dp(8), dp(12), dp(8));
        bar.setBackgroundColor(Color.rgb(33, 16, 27));

        TextView brand = new TextView(this);
        brand.setText("DEXTER'S TERMINAL");
        brand.setTextColor(Color.WHITE);
        brand.setTextSize(18);
        brand.setGravity(Gravity.CENTER_VERTICAL);
        brand.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        bar.addView(brand, new LinearLayout.LayoutParams(0, dp(48), 1f));

        printerState = new TextView(this);
        printerState.setText("Printer connecting…");
        printerState.setTextColor(Color.rgb(220, 203, 210));
        printerState.setTextSize(13);
        printerState.setGravity(Gravity.CENTER);
        bar.addView(printerState, new LinearLayout.LayoutParams(dp(190), dp(48)));

        Button scan = button("SCAN CUSTOMER");
        scan.setOnClickListener(v -> launchHardwareScanner());
        bar.addView(scan, new LinearLayout.LayoutParams(dp(170), dp(48)));

        Button print = button("PRINTER TEST");
        print.setOnClickListener(v -> printTestReceipt());
        bar.addView(print, new LinearLayout.LayoutParams(dp(150), dp(48)));

        Button home = button("HOME");
        home.setOnClickListener(v -> webView.loadUrl(HOME));
        bar.addView(home, new LinearLayout.LayoutParams(dp(100), dp(48)));

        root.addView(bar, new LinearLayout.LayoutParams(-1, dp(64)));

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1f));
        setContentView(root);
    }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextSize(12);
        b.setTextColor(Color.rgb(24, 13, 8));
        b.setBackgroundColor(Color.rgb(255, 129, 62));
        b.setAllCaps(false);
        b.setPadding(dp(6), 0, dp(6), 0);
        return b;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        webView.addJavascriptInterface(new TerminalBridge(), "DextersTerminal");
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectTerminalHook();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                            } else {
                                pendingPermission = request;
                                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                            }
                            return;
                        }
                    }
                    request.deny();
                });
            }
        });
    }

    private void injectTerminalHook() {
        String js = "(function(){if(window.__dextersTerminalHook)return;window.__dextersTerminalHook=1;" +
                "window.addEventListener('dexters:hardware-scan',function(e){var raw=e&&e.detail&&e.detail.raw;if(!raw)return;" +
                "var open=document.getElementById('uqOpen');if(open)open.click();" +
                "setTimeout(function(){var code=document.getElementById('uqCode'),form=document.getElementById('uqForm');" +
                "if(code&&form){code.value=raw;code.dispatchEvent(new Event('input',{bubbles:true}));" +
                "if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}},120);});})();";
        webView.evaluateJavascript(js, null);
    }

    private void deliverScan(String raw) {
        if (raw == null) return;
        raw = raw.trim();
        if (raw.isEmpty()) return;
        final String value = raw;
        webView.post(() -> {
            injectTerminalHook();
            String js = "window.dispatchEvent(new CustomEvent('dexters:hardware-scan',{detail:{raw:" +
                    JSONObject.quote(value) + "}}));";
            webView.evaluateJavascript(js, null);
            Toast.makeText(this, "Dexter's QR scanned", Toast.LENGTH_SHORT).show();
        });
    }

    private void launchHardwareScanner() {
        try {
            Intent i = new Intent();
            i.setClassName("net.nyx.scanner", "net.nyx.scanner.ScannerActivity");
            startActivityForResult(i, SCAN_REQUEST);
        } catch (Exception first) {
            try {
                Intent i = new Intent("android.intent.action.VIEW");
                i.setClassName("net.nyx.scanner", "net.nyx.scanner.ScannerActivity");
                startActivityForResult(i, SCAN_REQUEST);
            } catch (Exception second) {
                openWebCameraScanner();
            }
        }
    }

    private void openWebCameraScanner() {
        webView.evaluateJavascript("(function(){var o=document.getElementById('uqOpen');if(o)o.click();setTimeout(function(){var c=document.getElementById('uqCamera');if(c)c.click();},150);})();", null);
        Toast.makeText(this, "Hardware scanner unavailable — camera scanner opened", Toast.LENGTH_LONG).show();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SCAN_REQUEST || data == null) return;
        String raw = firstNonBlank(
                data.getStringExtra("SCAN_RESULT"),
                data.getStringExtra("scan_result"),
                data.getStringExtra("RESULT"),
                data.getStringExtra("result"),
                data.getStringExtra("barcode"),
                data.getStringExtra("data"),
                data.getDataString()
        );
        if (raw != null) deliverScan(raw);
    }

    private String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.trim().isEmpty()) return v;
        return null;
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            long now = System.currentTimeMillis();
            if (now - lastKeyAt > 180) scanBuffer.setLength(0);
            lastKeyAt = now;
            int code = event.getKeyCode();
            if (code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_NUMPAD_ENTER) {
                if (scanBuffer.length() >= 6) {
                    String scanned = scanBuffer.toString();
                    scanBuffer.setLength(0);
                    deliverScan(scanned);
                    return true;
                }
            } else {
                int unicode = event.getUnicodeChar();
                if (unicode >= 32 && unicode <= 126) scanBuffer.append((char) unicode);
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void bindPrinter() {
        if (printerBound) return;
        Intent i = new Intent("com.incar.printerservice.IPrinterService");
        i.setPackage("com.incar.printerservice");
        try {
            if (!bindService(i, printerConnection, Context.BIND_AUTO_CREATE)) bindPrinterFallback();
        } catch (Exception e) {
            bindPrinterFallback();
        }
    }

    private void bindPrinterFallback() {
        Intent i = new Intent("net.nyx.printerservice.IPrinterService");
        i.setPackage("net.nyx.printerservice");
        try {
            if (!bindService(i, printerConnection, Context.BIND_AUTO_CREATE)) setPrinterState("Printer service not found");
        } catch (Exception e) {
            setPrinterState("Printer service not found");
        }
    }

    private void refreshPrinterStatus() {
        io.execute(() -> {
            try {
                String version = printerService.getServiceVersion();
                int status = printerService.getPrinterStatus();
                setPrinterState(printerMessage(status) + " · v" + version);
            } catch (Exception e) {
                setPrinterState("Printer service error");
            }
        });
    }

    private String printerMessage(int code) {
        switch (code) {
            case 0: return "Printer ready";
            case -1201: return "Cover open";
            case -1202: return "Printer parameter error";
            case -1203: return "No paper";
            case -1204: return "Printer too hot";
            case -1206: return "Printer busy";
            case -1209: return "Low battery";
            default: return "Printer status " + code;
        }
    }

    private void printTestReceipt() {
        if (printerService == null) {
            Toast.makeText(this, "Printer is still connecting", Toast.LENGTH_SHORT).show();
            bindPrinter();
            return;
        }
        io.execute(() -> {
            try {
                int status = printerService.getPrinterStatus();
                if (status != 0) {
                    setPrinterState(printerMessage(status));
                    runOnUiThread(() -> Toast.makeText(this, printerMessage(status), Toast.LENGTH_LONG).show());
                    return;
                }

                PrintTextFormat title = new PrintTextFormat();
                title.setTextSize(32);
                title.setStyle(1);
                title.setAli(1);

                PrintTextFormat body = new PrintTextFormat();
                body.setTextSize(24);
                body.setAli(1);

                PrintTextFormat small = new PrintTextFormat();
                small.setTextSize(20);
                small.setAli(1);

                int r = printerService.printText("DEXTER'S\n", title);
                if (r == 0) r = printerService.printText("Built-in 58mm Printer Test\n", body);
                if (r == 0) r = printerService.printText("Dexter's Terminal connected\n", body);
                if (r == 0) r = printerService.printText(new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.UK).format(new Date()) + "\n", small);
                if (r == 0) r = printerService.printText("--------------------------------\n", small);
                if (r == 0) r = printerService.printText("DEXTER'S TERMINAL READY\n", body);
                if (r == 0) r = printerService.paperOut(80);

                final int result = r;
                refreshPrinterStatus();
                runOnUiThread(() -> Toast.makeText(this,
                        result == 0 ? "Dexter's test receipt sent to printer" : "Printer returned " + result,
                        Toast.LENGTH_LONG).show());
            } catch (RemoteException e) {
                setPrinterState("Printer connection lost");
            }
        });
    }

    private void setPrinterState(String message) {
        if (printerState != null) printerState.post(() -> printerState.setText(message));
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_REQUEST && pendingPermission != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else pendingPermission.deny();
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

    @Override protected void onDestroy() {
        try { if (printerBound) unbindService(printerConnection); } catch (Exception ignored) {}
        printerBound = false;
        printerService = null;
        io.shutdownNow();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    public class TerminalBridge {
        @JavascriptInterface public void scan() { runOnUiThread(() -> launchHardwareScanner()); }
        @JavascriptInterface public void printTest() { runOnUiThread(() -> printTestReceipt()); }
        @JavascriptInterface public String printerStatus() {
            try { return printerService == null ? "disconnected" : printerMessage(printerService.getPrinterStatus()); }
            catch (Exception e) { return "error"; }
        }
    }
}
