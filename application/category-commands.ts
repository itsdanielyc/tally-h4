import type { Ledger, LedgerApi } from "../contracts/ledger";
import { applyRules, createCategory, mergeCategory, removeCategory, renameCategory, validateRule } from "../domain/categories";
import type { LedgerSession } from "./ledger-session";

type CategoryCommands = Pick<LedgerApi,
  "addCategory" | "renameCategory" | "mergeCategory" | "deleteCategory" | "addPayeeRule" | "deletePayeeRule" | "applyPayeeRules">;

/** Runs category and rule mutations through the common atomic ledger session. */
export function createCategoryCommands(
  session: LedgerSession, view: (ledger: Ledger) => Ledger, makeId: () => string,
): CategoryCommands {
  function change(mutation: (previous: Ledger) => Ledger): Promise<Ledger> {
    return session.change((previous) => {
      const ledger = mutation(previous);
      return { ledger, result: view(ledger) };
    });
  }
  return {
    addCategory: (name) => change((ledger) => createCategory(ledger, name)),
    renameCategory: (input) => change((ledger) => renameCategory(ledger, input)),
    mergeCategory: (input) => change((ledger) => mergeCategory(ledger, input)),
    deleteCategory: (name) => change((ledger) => removeCategory(ledger, name)),
    addPayeeRule: (input) => change((ledger) => {
      const rule = { ...validateRule(input, ledger.categories), id: makeId() };
      return { ...ledger, rules: [...ledger.rules, rule] };
    }),
    deletePayeeRule: (id) => change((ledger) => {
      const rules = ledger.rules.filter((rule) => rule.id !== id);
      if (rules.length === ledger.rules.length) throw new Error("This rule no longer exists.");
      return { ...ledger, rules };
    }),
    applyPayeeRules: () => change(applyRules),
  };
}
