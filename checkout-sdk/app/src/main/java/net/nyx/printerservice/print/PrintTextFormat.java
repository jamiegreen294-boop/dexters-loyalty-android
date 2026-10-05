package net.nyx.printerservice.print;

import android.os.Parcel;
import android.os.Parcelable;

// Parcel layout expected by the Foodhub 1008 printer service.
public final class PrintTextFormat implements Parcelable {
    private int textSize = 24;
    public void setTextSize(int size) { textSize = size; }
    @Override public int describeContents() { return 0; }
    @Override public void writeToParcel(Parcel out, int flags) {
        out.writeInt(textSize);
        out.writeByte((byte) 0);
        out.writeFloat(1f); out.writeFloat(1f); out.writeFloat(0f); out.writeFloat(0f);
        out.writeInt(0); out.writeInt(0); out.writeInt(0); out.writeInt(0); out.writeInt(0);
        out.writeString(null);
    }
    private PrintTextFormat(Parcel in) {
        textSize = in.readInt(); in.readByte();
        in.readFloat(); in.readFloat(); in.readFloat(); in.readFloat();
        in.readInt(); in.readInt(); in.readInt(); in.readInt(); in.readInt(); in.readString();
    }
    public PrintTextFormat() {}
    public static final Creator<PrintTextFormat> CREATOR = new Creator<PrintTextFormat>() {
        @Override public PrintTextFormat createFromParcel(Parcel in) { return new PrintTextFormat(in); }
        @Override public PrintTextFormat[] newArray(int n) { return new PrintTextFormat[n]; }
    };
}
