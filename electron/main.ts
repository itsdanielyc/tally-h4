import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createLedgerApi } from "../application/ledger";
import { currencyForLocale } from "../domain/money";
import { registerLedgerIpc } from "./ipc";
import { FileLedgerStore, LEDGER_FILENAME } from "./store/file-ledger";

const INITIAL_WINDOW = { width: 1080, height: 760, minWidth: 680, minHeight: 500 };
const rendererFile = join(import.meta.dirname, "../renderer/index.html");
const devUrl = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;
const rendererUrl = devUrl ? new URL(devUrl).href : pathToFileURL(rendererFile).href;

function createWindow(): void {
  const window = new BrowserWindow({
    ...INITIAL_WINDOW,
    title: "Tally",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  if (devUrl) void window.loadURL(rendererUrl);
  else void window.loadFile(rendererFile);
}

function start(): void {
  const store = new FileLedgerStore(join(app.getPath("userData"), LEDGER_FILENAME), currencyForLocale(app.getLocale()));
  registerLedgerIpc(createLedgerApi(store), rendererUrl);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

if (app.requestSingleInstanceLock()) {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.whenReady().then(start).catch((error: unknown) => {
    console.error(error);
    app.exit(1);
  });
} else {
  app.quit();
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
