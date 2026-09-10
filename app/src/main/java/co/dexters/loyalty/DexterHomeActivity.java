package co.dexters.loyalty;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class DexterHomeActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildHome();
    }

    private void buildHome() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 42, 28, 28);
        root.setBackgroundColor(Color.rgb(3, 4, 7));

        TextView title = new TextView(this);
        title.setText("DEXTER'S");
        title.setTextColor(Color.WHITE);
        title.setTextSize(34);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        root.addView(title, fullWidth());

        TextView subtitle = new TextView(this);
        subtitle.setText("BUSINESS PHONE");
        subtitle.setTextColor(Color.LTGRAY);
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 4, 0, 26);
        root.addView(subtitle, fullWidth());

        addButton(root, "☎ Calls", v -> startActivity(new Intent(this, CallLogActivity.class)));
        addButton(root, "📞 Dialler", v -> startActivity(new Intent(Intent.ACTION_DIAL)));
        addButton(root, "💬 WhatsApp Business", v -> openWhatsAppBusiness());
        addButton(root, "★ Loyalty / Customers", v -> startActivity(new Intent(this, MainActivity.class)));
        addButton(root, "▣ Back Office", v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://backoffice.dextersspot.co.uk/"))));

        TextView note = new TextView(this);
        note.setText("AI ordering foundation: call history is stored on-device. Live AI answering will connect here once the phone/VoIP audio route is configured.");
        note.setTextColor(Color.LTGRAY);
        note.setTextSize(13);
        note.setPadding(6, 22, 6, 16);
        root.addView(note, fullWidth());

        addButton(root, "⚙ Manager Settings", v -> startActivity(new Intent(Settings.ACTION_SETTINGS)));

        setContentView(root);
    }

    private void addButton(LinearLayout root, String text, android.view.View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(18);
        button.setAllCaps(false);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams p = fullWidth();
        p.setMargins(0, 0, 0, 12);
        root.addView(button, p);
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private void openWhatsAppBusiness() {
        Intent launch = getPackageManager().getLaunchIntentForPackage("com.whatsapp.w4b");
        if (launch != null) {
            startActivity(launch);
            return;
        }
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.whatsapp.com/business/")));
    }
}
