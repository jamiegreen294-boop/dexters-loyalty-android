package co.dexters.meizu.upload;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int PICK_WAV = 701;
    private static final long MAX_BYTES = 50L * 1024L * 1024L;
    private static final String UPLOAD_URL = "https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/meizu-audio-upload";
    private static final String DEVICE_KEY = "8jNUH-A8PMYupMt8icZcrovseovMcu2Gv8nkMA57A9s";

    private Uri selectedUri;
    private String selectedName = "";
    private long selectedSize = -1L;
    private TextView selectedView;
    private TextView statusView;
    private Button uploadButton;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(36, 36, 36, 36);

        TextView title = new TextView(this);
        title.setText("DEXTEROS Test Upload");
        title.setTextSize(26f);
        root.addView(title, fullWrap());

        TextView info = new TextView(this);
        info.setText("Manual Meizu test uploader. Choose the WAV saved by DEXTEROS Audio Listener, then press Upload. Nothing is uploaded until you press the upload button.");
        info.setTextSize(16f);
        LinearLayout.LayoutParams infoParams = fullWrap();
        infoParams.setMargins(0, 24, 0, 24);
        root.addView(info, infoParams);

        Button chooseButton = new Button(this);
        chooseButton.setText("CHOOSE SAVED WAV");
        chooseButton.setOnClickListener(v -> chooseWav());
        root.addView(chooseButton, fullWrap());

        selectedView = new TextView(this);
        selectedView.setText("No file selected");
        selectedView.setTextSize(15f);
        LinearLayout.LayoutParams selectedParams = fullWrap();
        selectedParams.setMargins(0, 18, 0, 18);
        root.addView(selectedView, selectedParams);

        uploadButton = new Button(this);
        uploadButton.setText("UPLOAD SELECTED TEST RECORDING");
        uploadButton.setEnabled(false);
        uploadButton.setOnClickListener(v -> uploadSelected());
        root.addView(uploadButton, fullWrap());

        statusView = new TextView(this);
        statusView.setText("Status: waiting for a WAV file");
        statusView.setTextSize(16f);
        LinearLayout.LayoutParams statusParams = fullWrap();
        statusParams.setMargins(0, 24, 0, 0);
        root.addView(statusView, statusParams);

        TextView note = new TextView(this);
        note.setText("The recording is stored in Dexter's private Supabase test bucket. This app has no access to Loyalty, POS, KDS, bOnline or the Yealink setup.");
        note.setTextSize(14f);
        LinearLayout.LayoutParams noteParams = fullWrap();
        noteParams.setMargins(0, 28, 0, 0);
        root.addView(note, noteParams);

        setContentView(root);
    }

    private LinearLayout.LayoutParams fullWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private void chooseWav() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("audio/*");
        String[] types = new String[]{"audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave", "application/octet-stream"};
        intent.putExtra(Intent.EXTRA_MIME_TYPES, types);
        startActivityForResult(intent, PICK_WAV);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_WAV || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        selectedUri = data.getData();
        try { getContentResolver().takePersistableUriPermission(selectedUri, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) {}
        readMetadata(selectedUri);
        if (selectedSize > MAX_BYTES) {
            selectedView.setText(selectedName + "\nFile is larger than 50 MB and cannot be uploaded.");
            uploadButton.setEnabled(false);
            statusView.setText("Status: file too large");
        } else {
            selectedView.setText(selectedName + (selectedSize >= 0 ? "\n" + formatBytes(selectedSize) : ""));
            uploadButton.setEnabled(true);
            statusView.setText("Status: ready to upload");
        }
    }

    private void readMetadata(Uri uri) {
        selectedName = "dexteros-test.wav";
        selectedSize = -1L;
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int nameIndex = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = c.getColumnIndex(OpenableColumns.SIZE);
                if (nameIndex >= 0 && !c.isNull(nameIndex)) selectedName = c.getString(nameIndex);
                if (sizeIndex >= 0 && !c.isNull(sizeIndex)) selectedSize = c.getLong(sizeIndex);
            }
        } catch (Exception ignored) {}
    }

    private void uploadSelected() {
        if (selectedUri == null) return;
        uploadButton.setEnabled(false);
        statusView.setText("Status: uploading to private Supabase storage…");

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                byte[] data = readAll(selectedUri);
                if (data.length == 0) throw new Exception("Selected file is empty");
                if (data.length > MAX_BYTES) throw new Exception("File is larger than 50 MB");

                URL url = new URL(UPLOAD_URL);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(60000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "audio/wav");
                connection.setRequestProperty("x-dexters-upload-key", DEVICE_KEY);
                connection.setFixedLengthStreamingMode(data.length);

                try (OutputStream out = connection.getOutputStream()) {
                    out.write(data);
                }

                int code = connection.getResponseCode();
                InputStream responseStream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
                String response = responseStream == null ? "" : new String(readStream(responseStream), StandardCharsets.UTF_8);

                if (code >= 200 && code < 300) {
                    runOnUiThread(() -> {
                        statusView.setText("Status: uploaded to Supabase successfully\n" + formatBytes(data.length));
                        uploadButton.setEnabled(true);
                    });
                } else {
                    throw new Exception("Upload failed (HTTP " + code + ") " + response);
                }
            } catch (Exception e) {
                String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
                runOnUiThread(() -> {
                    statusView.setText("Status: upload failed\n" + message);
                    uploadButton.setEnabled(true);
                });
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "DexterOS-Test-Upload").start();
    }

    private byte[] readAll(Uri uri) throws Exception {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) throw new Exception("Unable to open selected file");
            return readStream(in);
        }
    }

    private byte[] readStream(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int n;
        while ((n = in.read(buffer)) != -1) {
            out.write(buffer, 0, n);
            if (out.size() > MAX_BYTES) throw new Exception("File is larger than 50 MB");
        }
        return out.toByteArray();
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " bytes";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
    }
}
