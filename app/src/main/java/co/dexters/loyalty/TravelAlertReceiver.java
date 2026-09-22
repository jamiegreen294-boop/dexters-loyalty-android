package co.dexters.loyalty;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

public class TravelAlertReceiver extends BroadcastReceiver {
    private static final String CHANNEL = "dexter_travel";
    private static final String PREFS = "dexter_travel_state";

    @Override public void onReceive(Context context, Intent intent) {
        PendingResult pr = goAsync();
        new Thread(() -> {
            try {
                check(context, "traffic",
                        "https://www.traffic.gov.scot/traffic-information/incidents",
                        new String[]{"cowcaddens","garscube","dobbies","m8","ibrox","govan","paisley road","broomloan"});
                check(context, "subway",
                        "https://www.spt.co.uk/travel-with-spt/disruptions/",
                        new String[]{"subway","ibrox","govan","inner circle","outer circle"});
            } catch (Exception ignored) {
            } finally {
                pr.finish();
            }
        }).start();
    }

    private static void check(Context c, String key, String url, String[] words) throws Exception {
        String html = get(url);
        String text = html.replaceAll("(?is)<script.*?</script>"," ")
                .replaceAll("(?is)<style.*?</style>"," ")
                .replaceAll("(?s)<[^>]+>"," ")
                .replace("&amp;","&").replace("&nbsp;"," ")
                .replaceAll("\\s+"," ").toLowerCase(Locale.UK);

        StringBuilder relevant = new StringBuilder();
        for (String w : words) {
            int from = 0, found = 0;
            while ((from = text.indexOf(w, from)) >= 0 && found < 6) {
                int a = Math.max(0, from - 180);
                int b = Math.min(text.length(), from + w.length() + 220);
                relevant.append(text, a, b).append('|');
                from += w.length();
                found++;
            }
        }
        if (relevant.length() == 0) return;

        String hash = sha256(relevant.toString());
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String old = p.getString(key, null);
        p.edit().putString(key, hash).apply();

        if (old == null || old.equals(hash)) return;

        if ("traffic".equals(key)) {
            notify(c, 8101, "🚧 Dexter Travel: road update",
                    "Official travel information changed around Cowcaddens/Ibrox. Tap to review Traffic Scotland.",
                    url);
        } else {
            notify(c, 8102, "🚇 Dexter Travel: Subway update",
                    "Official SPT disruption information changed. Tap to review before travelling.",
                    url);
        }
    }

    private static String get(String u) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(u).openConnection();
        con.setConnectTimeout(10000);
        con.setReadTimeout(10000);
        con.setInstanceFollowRedirects(true);
        con.setRequestProperty("User-Agent", "DexterBusinessPhone/1.0 (+official-public-travel-check)");
        try (BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null && sb.length() < 1_500_000) sb.append(line).append('\n');
            return sb.toString();
        } finally {
            con.disconnect();
        }
    }

    private static String sha256(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder x = new StringBuilder();
        for (byte b : d) x.append(String.format("%02x", b));
        return x.toString();
    }

    private static void notify(Context c, int id, String title, String body, String url) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Dexter Travel Alerts", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Road and Subway disruption alerts for Cowcaddens and Ibrox");
            nm.createNotificationChannel(ch);
        }

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        android.app.Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new android.app.Notification.Builder(c, CHANNEL)
                : new android.app.Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new android.app.Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pi);
        nm.notify(id, b.build());
    }
}
