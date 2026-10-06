package co.dexters.checkout

import android.Manifest
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.*
import android.provider.Settings
import android.view.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk
import com.squareup.sdk.mobilepayments.core.Result.Success
import com.squareup.sdk.mobilepayments.core.Result.Failure
import com.squareup.sdk.mobilepayments.payment.*
import net.nyx.printerservice.print.IPrinterService
import net.nyx.printerservice.print.PrintTextFormat
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.Executors

class CheckoutActivity : AppCompatActivity() {
    private lateinit var store: CredentialStore
    private lateinit var bridge: BridgeClient
    private lateinit var layout: LinearLayout
    private lateinit var status: TextView
    private lateinit var amount: TextView
    private lateinit var scan: TextView
    private val worker = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private var authorizing = false
    private var sdkReady = false
    private var busy = false
    private var foreground = false
    private var journal: JSONObject? = null
    private var authorizationCallback: Any? = null
    private var paymentCallback: Any? = null
    private var printer: IPrinterService? = null
    private var printerBound = false
    private var infraredService: IPrinterService? = null
    private var infraredBound = false
    private var qscReceiverRegistered = false
    private var scannerText = StringBuilder()
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) { printer = IPrinterService.Stub.asInterface(service) }
        override fun onServiceDisconnected(name: ComponentName?) { printer = null }
    }
    private val infraredConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            infraredService = IPrinterService.Stub.asInterface(service)
            runOnUiThread { if (::scan.isInitialized) scan.text = "Infrared scanner ready" }
        }
        override fun onServiceDisconnected(name: ComponentName?) {
            infraredService = null
            runOnUiThread { if (::scan.isInitialized) scan.text = "Infrared scanner disconnected" }
        }
    }
    private val qscReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.android.NYX_QSC_DATA") {
                val value = intent.getStringExtra("qsc").orEmpty()
                if (value.isNotBlank()) scan.text = "Scanned: $value"
            }
        }
    }
    private val poll = object : Runnable {
        override fun run() {
            if (foreground && !busy && !authorizing && bridge.provisioned()) tick()
            handler.postDelayed(this, 2500)
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        store = CredentialStore(this)
        try { bridge = BridgeClient(store); val did = intent.getStringExtra("device_id"); val dsec = intent.getStringExtra("device_secret"); if (!did.isNullOrBlank() && !dsec.isNullOrBlank()) bridge.provision(did, dsec); journal = store.read("payment") }
        catch (e: Exception) { fatal("Secure storage could not be opened. Keep any payment record for review."); return }
        printerBound = try { bindService(Intent("com.incar.printerservice.IPrinterService").setPackage("com.incar.printerservice"), connection, BIND_AUTO_CREATE) } catch (e: Exception) { false }
        screen()
        qscReceiverRegistered = try {
            val filter = IntentFilter("com.android.NYX_QSC_DATA")
            if (Build.VERSION.SDK_INT >= 33) registerReceiver(qscReceiver, filter, Context.RECEIVER_EXPORTED)
            else @Suppress("DEPRECATION") registerReceiver(qscReceiver, filter)
            true
        } catch (e: Exception) { false }
        infraredBound = try {
            bindService(Intent("net.nyx.printerservice.IPrinterService").setPackage("net.nyx.printerservice"), infraredConnection, BIND_AUTO_CREATE)
        } catch (e: Exception) { false }
        if (!bridge.provisioned()) {
            worker.execute {
                try {
                    bridge.claimFoodhub()
                    runOnUiThread { screen(); tick() }
                } catch (e: Exception) {
                    runOnUiThread { status.text = "Managed checkout setup failed: " + (e.message ?: "retry") }
                }
            }
        }
        handler.post(poll)
    }
    private fun fatal(message: String) { setContentView(TextView(this).apply { text = message; setPadding(24,24,24,24) }) }
    private fun label(text: String, size: Float = 18f): TextView = TextView(this).apply {
        this.text = text; textSize = size; setTextColor(Color.rgb(235,235,235)); setPadding(0,12,0,12)
    }
    private fun button(text: String, click: () -> Unit) { layout.addView(Button(this).apply { this.text = text; setOnClickListener { click() } }) }
    private fun screen() {
        layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(26,26,26,26); setBackgroundColor(Color.rgb(16,16,16)) }
        setContentView(ScrollView(this).apply { addView(layout) })
        layout.addView(label("DEXTER’S", 32f).apply { setTextColor(Color.rgb(213,175,87)) })
        layout.addView(label("CHECKOUT", 22f))
        status = label(if (bridge.provisioned()) "Connecting…" else "Managed checkout setup required")
        amount = label("", 38f).apply { setTextColor(Color.rgb(213,175,87)) }
        scan = label("Scanner ready")
        layout.addView(status); layout.addView(amount); layout.addView(scan)
        if (bridge.provisioned()) {
            button("CHECK CONNECTION") { if (!busy) tick() }
            button("SCAN BARCODE") { triggerInfrared() }
            button("SQUARE PAYMENT SETTINGS") {
                if (!sdkReady) { status.text = "Connect Square before opening payment settings"; return@button }
                MobilePaymentsSdk.settingsManager().showSettings { result -> if (result is Failure) status.text = result.errorMessage }
            }
        }
    }
    private fun triggerInfrared() {
        val service = infraredService
        if (service == null) {
            scan.text = "Infrared scanner service is connecting"
            return
        }
        scan.text = "Starting infrared scanner…"
        worker.execute {
            try {
                val ret = service.triggerQscScan(0)
                runOnUiThread {
                    scan.text = if (ret == 0) "Infrared scanner active — scan item" else "Infrared scanner error ($ret)"
                }
            } catch (e: Exception) {
                runOnUiThread { scan.text = "Infrared scanner unavailable: ${e.message ?: "unknown error"}" }
            }
        }
    }

    private fun tick() {
        if (busy || authorizing || !bridge.provisioned()) return
        busy = true
        worker.execute {
            try {
                val current = journal
                if (current != null) {
                    if (current.has("result")) deliver(current)
                    else recover(current)
                } else if (!sdkReady) {
                    val config = bridge.action(JSONObject().put("action", "configure"))
                    runOnUiThread { busy = false; authorize(config) }
                    return@execute
                } else {
                    val response = bridge.action(JSONObject().put("action", "next"))
                    val request = response.optJSONObject("request")
                    if (request == null) runOnUiThread { status.text = "Ready for till payments"; amount.text = "" }
                    else {
                        val pending = JSONObject().put("request", request).put("attempt_id", UUID.randomUUID().toString())
                        store.write("payment", pending); journal = pending
                        runOnUiThread { busy = false; startPayment(pending) }
                        return@execute
                    }
                }
            } catch (e: Exception) { runOnUiThread { status.text = e.message ?: "Connection unavailable — retrying" } }
            runOnUiThread { busy = false }
        }
    }
    private fun authorize(config: JSONObject) {
        if (config.optString("application_id") != CheckoutApplication.SQUARE_APPLICATION_ID) { status.text = "Square application registration does not match"; return }
        if (Settings.Global.getInt(contentResolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0) {
            status.text = "Setup connected. Turn Developer options off before taking payments."; return
        }
        val needed = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= 31) needed.addAll(listOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN))
        val missing = needed.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) { requestPermissions(missing.toTypedArray(), 101); status.text = "Allow the payment permissions, then check connection"; return }
        authorizing = true; status.text = "Connecting Square…"
        authorizationCallback = MobilePaymentsSdk.authorizationManager().authorize(config.getString("access_token"), config.getString("location_id")) { result ->
            authorizing = false
            when (result) {
                is Success -> { sdkReady = true; status.text = "Ready for till payments" }
                is Failure -> { sdkReady = false; status.text = "Square: ${result.errorMessage}" }
            }
        }
    }
    private fun startPayment(pending: JSONObject) {
        // The attempt is journalled before Square starts. On restart we reconcile instead of charging again.
        if (!sdkReady) { status.text = "Payment needs review — Square was not connected"; return }
        val request = pending.getJSONObject("request")
        val pence = request.getLong("amount_pence")
        amount.text = String.format(java.util.Locale.UK, "£%.2f", pence / 100.0)
        status.text = "Tap or insert your card"
        busy = true
        val parameters = PaymentParameters.Builder(amount = Money(pence, CurrencyCode.GBP), paymentAttemptId = pending.getString("attempt_id"), processingMode = ProcessingMode.ONLINE_ONLY, allowCardSurcharge = false)
            .referenceId(request.getString("id")).note("Dexter's ${request.optString("reference")}").autocomplete(true).build()
        try {
            paymentCallback = MobilePaymentsSdk.paymentManager().startPaymentActivity(parameters, PromptParameters(mode = PromptMode.DEFAULT)) { result ->
                val returned = when (result) {
                    is Success -> when (val payment = result.value) {
                        is Payment.OnlinePayment -> JSONObject().put("approved", true).put("payment_id", payment.id)
                        else -> null // Unexpected/offline result: reconcile instead of reporting a failed charge.
                    }
                    is Failure -> {
                        sdkReady = false
                        val code = result.errorCode.toString()
                        if (code.contains("CANCEL") || code.contains("DECLIN")) JSONObject().put("approved", false).put("error_code", code).put("error_message", result.errorMessage)
                        else null // Network/device errors can be ambiguous; never permit an automatic second charge.
                    }
                }
                if (returned == null) {
                    busy = false
                    status.text = "Payment interrupted — checking before any retry"
                    return@startPaymentActivity
                }
                pending.put("result", returned)
                worker.execute {
                    try { store.write("payment", pending); deliver(pending) }
                    catch (e: Exception) { runOnUiThread { status.text = "Payment result saved for retry: ${e.message}" } }
                    runOnUiThread { busy = false }
                }
            }
        } catch (e: Exception) {
            // A launch exception may be ambiguous. Preserve the attempt and ask the server to reconcile it.
            busy = false; status.text = "Payment interrupted — checking before any retry"
        }
    }
    private fun deliver(pending: JSONObject) {
        val request = pending.getJSONObject("request")
        val result = pending.getJSONObject("result")
        val body = JSONObject(result.toString()).put("action", "result").put("id", request.getString("id"))
        val response = bridge.action(body)
        val approved = response.getJSONObject("request").getString("status") == "approved"
        val receipt = if (approved) "DEXTER'S\nCARD PAYMENT RECEIPT\n\nAmount paid: " + String.format(java.util.Locale.UK, "£%.2f", request.getLong("amount_pence") / 100.0) + "\nStatus: APPROVED\nSquare ref: " + result.optString("payment_id") + "\n\nThank you\n\n\n" else null
        // Clear only after the server acknowledges. Scanner/printing errors cannot trigger another charge.
        store.write("payment", null); journal = null
        if (receipt != null) { store.write("last_receipt", JSONObject().put("text", receipt)); printReceipt(receipt) }
        runOnUiThread { status.text = if (approved) "Payment approved — till updated" else "Payment not completed"; amount.text = "" }
    }
    private fun recover(pending: JSONObject) {
        val response = bridge.action(JSONObject().put("action", "recover").put("id", pending.getJSONObject("request").getString("id")))
        val result = response.optJSONObject("result")
        if (result == null) { runOnUiThread { status.text = "Payment needs review. No new charge will start." }; return }
        pending.put("result", result); store.write("payment", pending); deliver(pending)
    }
    private fun printReceipt(text: String) {
        try { printer?.printText(text, PrintTextFormat().apply { setTextSize(22) }) }
        catch (e: Exception) { runOnUiThread { status.text = "Payment recorded. Printer unavailable." } }
    }
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 7001) {
            val value = data?.getStringExtra("SCAN_RESULT")
                ?: data?.getStringExtra("scan_result")
                ?: data?.dataString
                ?: ""
            if (value.isNotBlank()) {
                scan.text = "Scanned: $value"
            } else {
                scan.text = "Scanner closed"
            }
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN && event.deviceId != -1 && currentFocus !is EditText) {
            if (event.keyCode == KeyEvent.KEYCODE_ENTER && scannerText.isNotEmpty()) {
                scan.text = "Scanned: $scannerText"; scannerText.clear(); return true
            }
            val character = event.unicodeChar
            if (character > 31) { if (scannerText.length < 2048) scannerText.append(character.toChar()) }
        }
        return super.dispatchKeyEvent(event)
    }
    override fun onResume() { super.onResume(); foreground = true }
    override fun onPause() { foreground = false; super.onPause() }
    override fun onDestroy() {
        handler.removeCallbacks(poll)
        if (printerBound) unbindService(connection)
        if (infraredBound) unbindService(infraredConnection)
        if (qscReceiverRegistered) unregisterReceiver(qscReceiver)
        worker.shutdown()
        super.onDestroy()
    }
}
