package co.dexters.checkout

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom

class ApiFailure(val status: Int, message: String) : Exception(message)
class BridgeClient(private val store: CredentialStore) {
    private var device = store.read("device")

    fun provisioned() = device != null &&
        device!!.optString("device_id").isNotBlank() &&
        device!!.optString("device_secret").isNotBlank()

    fun provision(deviceId: String, deviceSecret: String) {
        require(deviceId.isNotBlank() && deviceSecret.length >= 32) { "Invalid managed device setup" }
        val value = JSONObject().put("device_id", deviceId).put("device_secret", deviceSecret)
        store.write("device", value)
        device = value
    }

    @Synchronized fun claimFoodhub() {
        if (provisioned()) return
        val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val localValue = bytes.joinToString("") { "%02x".format(it) }
        val digest = MessageDigest.getInstance("SHA-256").digest(localValue.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        provision(FOODHUB_DEVICE_ID, localValue)
        try {
            val connection = URL(BASE + "/functions/v1/pc-pos-square-bridge").openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.connectTimeout = 10000
                connection.readTimeout = 15000
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("apikey", KEY)
                connection.setRequestProperty("x-dexter-device-id", FOODHUB_DEVICE_ID)
                connection.setRequestProperty("x-dexter-device-serial", FOODHUB_SERIAL)
                val body = JSONObject().put("action", "sdk_claim_foodhub").put("secret_hash", digest)
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                val status = connection.responseCode
                val input = if (status in 200..299) connection.inputStream else connection.errorStream
                val raw = input?.bufferedReader()?.use { it.readText() } ?: "{}"
                val value = try { JSONObject(raw) } catch (_: Exception) { JSONObject().put("error", "Provisioning failed ($status)") }
                if (status !in 200..299) throw ApiFailure(status, value.optString("error", "Provisioning failed ($status)"))
            } finally { connection.disconnect() }
        } catch (e: Exception) {
            store.write("device", null)
            device = null
            throw e
        }
    }

    @Synchronized fun action(body: JSONObject): JSONObject {
        val d = device ?: throw ApiFailure(401, "Managed checkout setup required")
        val sdkBody = JSONObject(body.toString()).put("action", "sdk_" + body.optString("action"))
        return call("/functions/v1/pc-pos-square-bridge", sdkBody, d)
    }

    private fun call(path: String, body: JSONObject, device: JSONObject): JSONObject {
        val connection = URL(BASE + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10000
            connection.readTimeout = 15000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", KEY)
            connection.setRequestProperty("x-dexter-device-id", device.getString("device_id"))
            connection.setRequestProperty("x-dexter-device-secret", device.getString("device_secret"))
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val input = if (status in 200..299) connection.inputStream else connection.errorStream
            val raw = input?.bufferedReader()?.use { it.readText() } ?: "{}"
            val value = try { JSONObject(raw) } catch (_: Exception) { JSONObject().put("error", "Connection failed ($status)") }
            if (status !in 200..299) throw ApiFailure(status, value.optString("error", "Connection failed ($status)"))
            return value
        } finally { connection.disconnect() }
    }

    companion object {
        const val BASE = "https://bpnkouymdvcogeaqjmxl.supabase.co"
        const val KEY = "sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa"
        private const val FOODHUB_DEVICE_ID = "bde3a386-fd2d-4fec-8aff-704be635aa86"
        private const val FOODHUB_SERIAL = "100820240700092"
    }
}
