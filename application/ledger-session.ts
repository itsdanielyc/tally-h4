import type { Ledger } from "../contracts/ledger";

/** The read and atomic commit boundary for a ledger. */
export interface LedgerStore {
  read(): Promise<Ledger>;
  write(ledger: Ledger): Promise<void>;
}

/** Serializes commands so overlapping saves always see the previous committed state. */
export class LedgerSession {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly store: LedgerStore) {}

  private enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  /** Reads a coherent view after the previous command settles. */
  read<Result>(select: (ledger: Ledger) => Result): Promise<Result> {
    return this.enqueue(async () => select(await this.store.read()));
  }

  /** Computes a new state and returns its result only after the entire state is committed. */
  change<Result>(update: (ledger: Ledger) => { ledger: Ledger; result: Result }): Promise<Result> {
    return this.enqueue(async () => {
      const previous = await this.store.read();
      const { ledger, result } = update(previous);
      if (ledger !== previous) await this.store.write(ledger);
      return result;
    });
  }
}
