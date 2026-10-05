package co.dexters.checkout

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ApiFailure(val status: Int, message: String) : Exception(message)
class BridgeClient(private val store: CredentialStore) {
    private var session = store.read("session")
    fun signedIn() = session != null
    fun signOut() { store.write("session", null); session = null }
    fun login(email: String, password: String) {
        val value = call("/auth/v1/token?grant_type=password", JSONObject().put("email", email).put("password", password))
        save(value)
    }
    private fun save(value: JSONObject) {
        require(value.optString("access_token").isNotBlank()) { "No staff session returned" }
        val expires = value.optLong("expires_in", 3600)
        value.put("expires_at_ms", System.currentTimeMillis() + expires * 1000)
        store.write("session", value)
        session = value
    }
    private fun refresh() {
        val s = session ?: throw ApiFailure(401, "Staff sign-in required")
        val refreshToken = s.optString("refresh_token")
        if (refreshToken.isBlank()) throw ApiFailure(401, "Staff sign-in required")
        // Never discard credentials on network/server errors. A later retry can recover.
        val value = call("/auth/v1/token?grant_type=refresh_token", JSONObject().put("refresh_token", refreshToken))
        if (value.optString("refresh_token").isBlank()) value.put("refresh_token", refreshToken)
        save(value)
    }
    @Synchronized fun action(body: JSONObject): JSONObject {
        if (session == null) throw ApiFailure(401, "Staff sign-in required")
        if (!body.getString("action").startsWith("sdk_")) body.put("action", "sdk_" + body.getString("action"))
        if (session!!.optLong("expires_at_ms") < System.currentTimeMillis() + 120000) refresh()
        try { return call("/functions/v1/pc-pos-square-bridge", body, session!!.getString("access_token")) }
        catch (e: ApiFailure) {
            if (e.status != 401) throw e
            refresh()
            return call("/functions/v1/pc-pos-square-bridge", body, session!!.getString("access_token"))
        }
    }
    private fun call(path: String, body: JSONObject, token: String = ""): JSONObject {
        val connection = URL(BASE + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10000
            connection.readTimeout = 15000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", KEY)
            if (token.isNotBlank()) connection.setRequestProperty("Authorization", "Bearer $token")
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val input = if (status in 200..299) connection.inputStream else connection.errorStream
            val value = input?.bufferedReader()?.use { JSONObject(it.readText()) } ?: JSONObject()
            if (status !in 200..299) throw ApiFailure(status, value.optString("error_description", value.optString("error", "Connection failed ($status)")))
            return value
        } finally { connection.disconnect() }
    }
    companion object {
        const val BASE = "https://bpnkouymdvcogeaqjmxl.supabase.co"
        const val KEY = "sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa"
    }
}
