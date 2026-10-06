package co.dexters.checkout

import android.Manifest
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
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

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun rounded(fill: Int, stroke: Int? = null, radius: Int = 18): GradientDrawable =
        GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(fill)
            cornerRadius = dp(radius).toFloat()
            if (stroke != null) setStroke(dp(1), stroke)
        }

    private fun textView(textValue: String, size: Float, colour: Int, bold: Boolean = false): TextView =
        TextView(this).apply {
            text = textValue
            textSize = size
            setTextColor(colour)
            if (bold) setTypeface(typeface, Typeface.BOLD)
        }

    private fun addAction(textValue: String, primary: Boolean = false, click: () -> Unit) {
        val gold = Color.rgb(213,175,87)
        val button = Button(this).apply {
            text = textValue
            textSize = 16f
            isAllCaps = false
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(if (primary) Color.rgb(18,18,18) else Color.WHITE)
            background = rounded(if (primary) gold else Color.rgb(30,32,34), if (primary) null else Color.rgb(64,66,68), 16)
            minHeight = dp(58)
            setPadding(dp(18), 0, dp(18), 0)
            setOnClickListener { click() }
        }
        layout.addView(button, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(58)).apply {
            topMargin = dp(10)
        })
    }

    private fun screen() {
        val gold = Color.rgb(213,175,87)
        val bg = Color.rgb(13,15,16)
        val panel = Color.rgb(24,26,28)
        val muted = Color.rgb(176,180,184)

        layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(28), dp(24), dp(30))
            setBackgroundColor(bg)
        }
        setContentView(ScrollView(this).apply {
            isFillViewport = true
            setBackgroundColor(bg)
            addView(layout)
        })

        val brand = textView("DEXTER’S", 34f, gold, true).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.08f
        }
        layout.addView(brand, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        layout.addView(textView("CHECKOUT", 15f, muted, true).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.22f
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(2)
            bottomMargin = dp(24)
        })

        val statusCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(16))
            background = rounded(panel, Color.rgb(52,54,56), 18)
        }
        statusCard.addView(textView("TERMINAL STATUS", 12f, gold, true))
        status = textView(if (bridge.provisioned()) "Connecting…" else "Managed checkout setup required", 18f, Color.WHITE, true).apply {
            setPadding(0, dp(6), 0, 0)
        }
        statusCard.addView(status)
        layout.addView(statusCard, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        amount = textView("", 42f, gold, true).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(18), 0, dp(8))
        }
        layout.addView(amount, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        val scannerCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(14), dp(18), dp(14))
            background = rounded(Color.rgb(20,22,24), Color.rgb(50,52,54), 16)
        }
        scannerCard.addView(textView("SCANNER", 12f, gold, true))
        scan = textView("Scanner ready", 17f, Color.WHITE, false).apply { setPadding(0, dp(5), 0, 0) }
        scannerCard.addView(scan)
        layout.addView(scannerCard, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(6)
            bottomMargin = dp(10)
        })

        addAction("Scan barcode", primary = true) { triggerInfrared() }

        if (bridge.provisioned()) {
            addAction("Check connection") { if (!busy) tick() }
            addAction("Square payment settings") {
                if (!sdkReady) { status.text = "Connect Square before opening payment settings"; return@addAction }
                MobilePaymentsSdk.settingsManager().showSettings { result -> if (result is Failure) status.text = result.errorMessage }
            }
        }

        layout.addView(textView("DEXTER’S • SECURE CHECKOUT", 11f, Color.rgb(112,116,120), true).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(26), 0, dp(8))
        }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    }
    private fun triggerInfrared() {
        val incar = printer
        val nyx = infraredService
        if (incar == null && nyx == null) {
            scan.text = "Infrared scanner service is connecting"
            return
        }
        scan.text = "Starting infrared scanner…"
        worker.execute {
            var incarError: String? = null
            try {
                if (incar != null) {
                    val ret = incar.triggerQscScan(0)
                    if (ret == 0) {
                        runOnUiThread { scan.text = "Infrared scanner active — scan item" }
                        return@execute
                    }
                    incarError = "Incar $ret"
                }
            } catch (e: Exception) {
                incarError = "Incar ${e.message ?: "unsupported"}"
            }
            try {
                if (nyx != null) {
                    val ret = nyx.triggerQscScan(0)
                    runOnUiThread {
                        scan.text = if (ret == 0) "Infrared scanner active — scan item"
                        else "Infrared scanner unavailable: ${incarError ?: "Incar unsupported"} / Nyx $ret"
                    }
                } else {
                    runOnUiThread { scan.text = "Infrared scanner unavailable: ${incarError ?: "unsupported"}" }
                }
            } catch (e: Exception) {
                runOnUiThread { scan.text = "Infrared scanner unavailable: ${incarError ?: "Incar unsupported"} / Nyx ${e.message ?: "error"}" }
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
