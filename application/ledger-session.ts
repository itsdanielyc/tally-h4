import type { Ledger } from "../contracts/ledger";
import type { UndoKind } from "../contracts/transfer";

type LedgerResult<Result> = (ledger: Ledger, undo?: UndoKind) => Result;
type Change<Result> = { ledger: Ledger; result: LedgerResult<Result> };

/** The read and atomic commit boundary for a ledger. */
export interface LedgerStore {
  read(): Promise<Ledger>;
  write(ledger: Ledger): Promise<void>;
}

/** Serializes commands so overlapping saves always see the previous committed state. */
export class LedgerSession {
  private tail: Promise<void> = Promise.resolve();
  private undo?: { readonly ledger: Ledger; readonly kind: UndoKind };

  constructor(private readonly store: LedgerStore) {}

  private enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  /** Reads a coherent view after the previous command settles. */
  read<Result>(select: LedgerResult<Result>): Promise<Result> {
    return this.enqueue(async () => select(await this.store.read(), this.undo?.kind));
  }

  /** Computes a new state and returns its result only after the entire state is committed. */
  change<Result>(update: (ledger: Ledger) => Change<Result>, undoKind?: UndoKind): Promise<Result> {
    return this.enqueue(async () => {
      const previous = await this.store.read();
      const { ledger, result } = update(previous);
      if (ledger !== previous) {
        await this.store.write(ledger);
        this.undo = undoKind ? { ledger: previous, kind: undoKind } : undefined;
      }
      return result(ledger, this.undo?.kind);
    });
  }

  /** Restores the single prior commit and consumes the slot only after a successful write. */
  undoLast<Result>(select: LedgerResult<Result>): Promise<Result> {
    return this.enqueue(async () => {
      if (!this.undo) throw new Error("There is no change to undo.");
      const previous = this.undo.ledger;
      await this.store.write(previous);
      this.undo = undefined;
      return select(previous);
    });
  }
}
