import { contextBridge, ipcRenderer } from "electron";
import { channels } from "../contracts/channels";
import type { LedgerApi } from "../contracts/ledger";

async function invoke<Operation extends keyof LedgerApi>(
  operation: Operation,
  ...args: Parameters<LedgerApi[Operation]>
): Promise<Awaited<ReturnType<LedgerApi[Operation]>>> {
  try {
    return await ipcRenderer.invoke(channels[operation], ...args) as Awaited<ReturnType<LedgerApi[Operation]>>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The ledger is unavailable.";
    throw new Error(message.replace(/^Error invoking remote method '[^']+': Error: /, ""), { cause: error });
  }
}

const bridge: LedgerApi = {
  loadLedger: () => invoke("loadLedger"),
  saveTransaction: (input) => invoke("saveTransaction", input),
  deleteTransaction: (id) => invoke("deleteTransaction", id),
  setCurrency: (currency) => invoke("setCurrency", currency),
  chooseImportFile: () => invoke("chooseImportFile"),
  previewImport: (request) => invoke("previewImport", request),
  confirmImport: (request) => invoke("confirmImport", request),
  addCategory: (name) => invoke("addCategory", name),
  renameCategory: (change) => invoke("renameCategory", change),
  mergeCategory: (change) => invoke("mergeCategory", change),
  deleteCategory: (name) => invoke("deleteCategory", name),
  addPayeeRule: (rule) => invoke("addPayeeRule", rule),
  deletePayeeRule: (id) => invoke("deletePayeeRule", id),
  applyPayeeRules: () => invoke("applyPayeeRules"),
  getMonth: (month) => invoke("getMonth", month),
  setBudget: (budget) => invoke("setBudget", budget),
};

contextBridge.exposeInMainWorld("electronBridge", bridge);
