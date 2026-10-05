package co.dexters.checkout

import android.app.Application
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk

class CheckoutApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        MobilePaymentsSdk.initialize(SQUARE_APPLICATION_ID, this)
    }
    companion object { const val SQUARE_APPLICATION_ID = "sq0idp-D5GMRNfD6MorTLnfto8e8A" }
}
