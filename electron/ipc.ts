import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { channels } from "../contracts/channels";
import type { LedgerApi } from "../contracts/ledger";

function verifySender(event: IpcMainInvokeEvent, rendererUrl: string): void {
  const frame = event.senderFrame;
  if (!frame || frame.parent !== null || frame.url !== rendererUrl) {
    throw new Error("This window cannot access the ledger.");
  }
}

/** Exposes the ledger contract to the app window's top-level document. */
export function registerLedgerIpc(ledger: LedgerApi, rendererUrl: string): void {
  function register<Operation extends keyof LedgerApi>(operation: Operation, method: LedgerApi[Operation]): void {
    const execute = method as (...args: Parameters<LedgerApi[Operation]>) => ReturnType<LedgerApi[Operation]>;
    ipcMain.handle(channels[operation], (event, ...args: unknown[]) => {
      verifySender(event, rendererUrl);
      return execute(...args as Parameters<LedgerApi[Operation]>);
    });
  }

  register("loadLedger", ledger.loadLedger);
  register("saveTransaction", ledger.saveTransaction);
  register("deleteTransaction", ledger.deleteTransaction);
  register("setCurrency", ledger.setCurrency);
  register("chooseImportFile", ledger.chooseImportFile);
  register("previewImport", ledger.previewImport);
  register("confirmImport", ledger.confirmImport);
}
