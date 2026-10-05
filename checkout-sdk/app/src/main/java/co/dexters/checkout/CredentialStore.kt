package co.dexters.checkout

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Only encrypted bytes go to disk. Android excludes this store from backup. */
class CredentialStore(context: Context) {
    private val prefs = context.getSharedPreferences("checkout-secure", Context.MODE_PRIVATE)
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (!store.containsAlias(ALIAS)) KeyGenerator.getInstance("AES", "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            generateKey()
        }
        return store.getKey(ALIAS, null) as SecretKey
    }
    @Synchronized fun write(name: String, data: JSONObject?) {
        if (data == null) { check(prefs.edit().remove(name).commit()); return }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val bytes = cipher.doFinal(data.toString().toByteArray(Charsets.UTF_8))
        check(prefs.edit().putString(name, Base64.encodeToString(cipher.iv + bytes, Base64.NO_WRAP)).commit())
    }
    @Synchronized fun read(name: String): JSONObject? {
        val value = prefs.getString(name, null) ?: return null
        val bytes = Base64.decode(value, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        }
        return JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
    }
    companion object { private const val ALIAS = "dexters-checkout-session-v1" }
}
