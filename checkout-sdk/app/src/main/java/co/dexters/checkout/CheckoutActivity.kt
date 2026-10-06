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
import androidx.appcompat.app.AlertDialog
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
    private lateinit var basketContainer: LinearLayout
    private lateinit var subtotalView: TextView
    private lateinit var discountView: TextView
    private lateinit var deliveryView: TextView
    private lateinit var totalView: TextView
    private lateinit var idleView: TextView
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
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) { printer = IPrinterService.Stub.asInterface(service) }
        override fun onServiceDisconnected(name: ComponentName?) { printer = null }
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
        val gold = Color.rgb(230, 190, 71)
        val goldSoft = Color.rgb(196, 156, 48)
        val bg = Color.rgb(5, 6, 7)
        val panel = Color.rgb(13, 14, 15)
        val muted = Color.rgb(165, 168, 171)

        layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(18), dp(22), dp(24))
            setBackgroundColor(bg)
        }
        setContentView(ScrollView(this).apply {
            isFillViewport = true
            setBackgroundColor(bg)
            addView(layout)
        })

        status = textView(if (bridge.provisioned()) "Connecting…" else "Managed checkout setup required", 1f, Color.TRANSPARENT)
        amount = textView("", 1f, Color.TRANSPARENT)

        val logo = ImageView(this).apply {
            setImageResource(R.drawable.dexters_logo_straight)
            adjustViewBounds = true
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            contentDescription = "Dexter's"
            setPadding(dp(22), 0, dp(22), 0)
            setOnLongClickListener {
                showMaintenance()
                true
            }
        }
        layout.addView(logo, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(190)
        ).apply {
            bottomMargin = dp(4)
        })

        layout.addView(textView("YOUR ORDER", 24f, gold, true).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.16f
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            bottomMargin = dp(16)
        })

        val orderCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(18))
            background = rounded(panel, goldSoft, 20)
        }

        idleView = textView("Waiting for your order…", 17f, muted).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(32), 0, dp(32))
        }
        orderCard.addView(idleView)

        basketContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            visibility = View.GONE
        }
        orderCard.addView(basketContainer)

        val divider = View(this).apply { setBackgroundColor(goldSoft) }
        orderCard.addView(divider, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
        ).apply {
            topMargin = dp(14)
            bottomMargin = dp(12)
        })

        fun totalRow(label: String, bold: Boolean = false): Pair<LinearLayout, TextView> {
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(if (bold) 7 else 5), 0, dp(if (bold) 7 else 5))
            }
            val left = textView(
                label,
                if (bold) 27f else 17f,
                if (bold) gold else Color.rgb(222, 224, 226),
                bold
            )
            val right = textView(
                "£0.00",
                if (bold) 31f else 17f,
                if (bold) gold else Color.WHITE,
                bold
            ).apply { gravity = Gravity.END }

            row.addView(left, LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
            ))
            row.addView(right, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ))
            return row to right
        }

        val (subtotalRow, subtotalText) = totalRow("Subtotal")
        subtotalView = subtotalText
        orderCard.addView(subtotalRow)

        val (discountRow, discountText) = totalRow("Discount")
        discountView = discountText
        discountRow.visibility = View.GONE
        discountView.tag = discountRow
        orderCard.addView(discountRow)

        val (deliveryRow, deliveryText) = totalRow("Delivery")
        deliveryView = deliveryText
        deliveryRow.visibility = View.GONE
        deliveryView.tag = deliveryRow
        orderCard.addView(deliveryRow)

        val totalDivider = View(this).apply { setBackgroundColor(gold) }
        orderCard.addView(totalDivider, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(2)
        ).apply {
            topMargin = dp(10)
            bottomMargin = dp(10)
        })

        val (totalRow, totalText) = totalRow("TOTAL", true)
        totalView = totalText
        orderCard.addView(totalRow)

        layout.addView(orderCard, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        layout.addView(textView("Thank you for choosing Dexter’s", 12f, Color.rgb(110, 113, 116)).apply {
            gravity = Gravity.CENTER
            setPadding(0, dp(18), 0, 0)
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        showIdle()
    }

    private fun money(pence: Long): String =
        String.format(java.util.Locale.UK, "£%.2f", pence / 100.0)

    private fun showIdle() {
        if (!::basketContainer.isInitialized) return
        basketContainer.removeAllViews()
        basketContainer.visibility = View.GONE
        idleView.visibility = View.VISIBLE
        idleView.text = "Waiting for your order…"
        subtotalView.text = "£0.00"
        totalView.text = "£0.00"
        (discountView.tag as? View)?.visibility = View.GONE
        (deliveryView.tag as? View)?.visibility = View.GONE
    }

    private fun renderBasket(request: JSONObject) {
        val gold = Color.rgb(228,190,76)
        val muted = Color.rgb(174,174,174)
        val data = request.optJSONObject("checkout_data") ?: JSONObject()
        val items = data.optJSONArray("items")
        basketContainer.removeAllViews()

        if (items == null || items.length() == 0) {
            basketContainer.visibility = View.GONE
            idleView.visibility = View.VISIBLE
            idleView.text = "Card payment"
        } else {
            idleView.visibility = View.GONE
            basketContainer.visibility = View.VISIBLE
            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                val qty = item.optInt("qty", 1).coerceAtLeast(1)
                val name = item.optString("name", "Item")
                val linePence = item.optLong("line_pence", item.optLong("unit_pence", 0L) * qty)
                val mods = item.optJSONArray("mods")

                val row = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(0, dp(13), 0, dp(13))
                }
                val left = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
                left.addView(textView(if (qty > 1) "$qty × $name" else name, 18f, Color.WHITE, true))
                if (mods != null && mods.length() > 0) {
                    val values = mutableListOf<String>()
                    for (m in 0 until mods.length()) {
                        val value = mods.optString(m).trim()
                        if (value.isNotEmpty()) values.add(value)
                    }
                    if (values.isNotEmpty()) {
                        left.addView(textView(values.joinToString(" · "), 13f, muted).apply { setPadding(0, dp(3), dp(8), 0) })
                    }
                }
                val price = textView(money(linePence), 18f, gold, true).apply {
                    gravity = Gravity.END
                    setPadding(dp(8), 0, 0, 0)
                }
                row.addView(left, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
                row.addView(price, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
                basketContainer.addView(row)

                if (i < items.length() - 1) {
                    basketContainer.addView(View(this).apply { setBackgroundColor(Color.rgb(68,59,31)) },
                        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1)))
                }
            }
        }

        val total = request.optLong("amount_pence", 0L)
        val subtotal = data.optLong("subtotal_pence", total)
        val discount = data.optLong("discount_pence", 0L)
        val delivery = data.optLong("delivery_fee_pence", 0L)
        subtotalView.text = money(subtotal)
        totalView.text = money(total)

        val discountRow = discountView.tag as? View
        discountRow?.visibility = if (discount > 0) View.VISIBLE else View.GONE
        discountView.text = "-${money(discount)}"

        val deliveryRow = deliveryView.tag as? View
        deliveryRow?.visibility = if (delivery > 0) View.VISIBLE else View.GONE
        deliveryView.text = money(delivery)
    }

    private fun showMaintenance() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(12), dp(22), 0)
        }
        val current = textView(status.text?.toString().orEmpty().ifBlank { "Checkout maintenance" }, 15f, Color.DKGRAY)
        box.addView(current)
        AlertDialog.Builder(this)
            .setTitle("Staff checkout controls")
            .setView(box)
            .setPositiveButton("Square settings") { _, _ ->
                if (sdkReady) {
                    MobilePaymentsSdk.settingsManager().showSettings { result ->
                        if (result is Failure) status.text = result.errorMessage
                    }
                }
            }
            .setNeutralButton("Check connection") { _, _ -> if (!busy) tick() }
            .setNegativeButton("Close", null)
            .show()
    }
    private fun tick() {
        if (busy || authorizing || !bridge.provisioned()) return
        busy = true
        worker.execute {
            try {
                val current = journal
                if (current != null) {
                    runOnUiThread { renderBasket(current.getJSONObject("request")) }
                    if (current.has("result")) deliver(current)
                    else recover(current)
                } else if (!sdkReady) {
                    val config = bridge.action(JSONObject().put("action", "configure"))
                    runOnUiThread { busy = false; authorize(config) }
                    return@execute
                } else {
                    val response = bridge.action(JSONObject().put("action", "next"))
                    val request = response.optJSONObject("request")
                    if (request == null) runOnUiThread {
                        status.text = "Ready for till payments"
                        amount.text = ""
                        showIdle()
                    } else {
                        val pending = JSONObject().put("request", request).put("attempt_id", UUID.randomUUID().toString())
                        store.write("payment", pending); journal = pending
                        runOnUiThread {
                            renderBasket(request)
                            busy = false
                            startPayment(pending)
                        }
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
        runOnUiThread {
            status.text = if (approved) "Payment approved — till updated" else "Payment not completed"
            amount.text = ""
            showIdle()
        }
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
    override fun onResume() { super.onResume(); foreground = true }
    override fun onPause() { foreground = false; super.onPause() }
    override fun onDestroy() {
        handler.removeCallbacks(poll)
        if (printerBound) unbindService(connection)
        worker.shutdown()
        super.onDestroy()
    }
}