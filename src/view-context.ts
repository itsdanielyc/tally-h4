import type { Ledger } from "../contracts/ledger";
import type { Backend } from "./api";

/** Gives a screen access to the latest ledger and the shared commit and feedback path. */
export interface ViewContext {
  readonly backend: Backend;
  readonly ledger: Ledger;
  commit(operation: () => Promise<Ledger>, message: string): Promise<void>;
  report(this: void, error: unknown): void;
}
