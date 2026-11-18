/** Inclusive bounds used by the transaction screen and the native exporter. */
export interface TransactionFilter {
  readonly search?: string;
  readonly category?: string | null;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly minimumMinor?: number;
  readonly maximumMinor?: number;
}

export interface ExportReceipt {
  readonly name: string;
  readonly count: number;
}

export type UndoKind = "delete" | "merge" | "import";

/** Identifies the exact undo offered by the currently displayed snapshot. */
export interface UndoOffer {
  readonly kind: UndoKind;
  readonly token: number;
}
