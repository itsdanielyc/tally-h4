import type { LedgerSnapshot } from "../contracts/ledger";
import type { Backend } from "./api";

/** Gives a screen access to the latest ledger and the shared commit and feedback path. */
export interface ViewContext {
  readonly backend: Backend;
  readonly ledger: LedgerSnapshot;
  commit(operation: () => Promise<LedgerSnapshot>, message: string | (() => string)): Promise<void>;
  mutationPending(this: void): boolean;
  announce(this: void, message: string): void;
  report(this: void, error: unknown): void;
}
