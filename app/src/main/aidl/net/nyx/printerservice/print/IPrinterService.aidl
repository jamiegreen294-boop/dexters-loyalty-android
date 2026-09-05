package net.nyx.printerservice.print;

import net.nyx.printerservice.print.PrintTextFormat;

interface IPrinterService {
    String getServiceVersion();
    int getPrinterVersion(out String[] ver);
    int getPrinterModel(out String[] model);
    int getPrinterStatus();
    int paperOut(int px);
    int paperBack(int px);
    int printText(String text, in PrintTextFormat textFormat);
}
