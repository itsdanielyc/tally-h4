import type { LedgerApi } from "../contracts/ledger";
import { createMock } from "./mock/backend";

export type Backend = LedgerApi & { readonly kind: "native" | "mock" };

declare global {
  interface Window {
    electronBridge?: LedgerApi;
  }
}

/** Selects the native bridge or the explicitly labelled browser test backend. */
export function connectBackend(): Backend {
  const bridge = window.electronBridge;
  if (bridge) return { ...bridge, kind: "native" };
  if (window.location.protocol === "file:") throw new Error("Tally could not connect to the local ledger.");
  return { ...createMock(), kind: "mock" };
}
