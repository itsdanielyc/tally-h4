import type { Ledger } from "../contracts/ledger";
import { connectBackend, type Backend } from "./api";
import { renderCategories } from "./categories-view";
import { element, required } from "./dom";
import { renderImport } from "./import-view";
import { renderMonth } from "./month-view";
import { renderSettings } from "./settings-view";
import { renderTransactions } from "./transactions-view";
import type { ViewContext } from "./view-context";

const renderScreen = {
  transactions: renderTransactions, import: renderImport, categories: renderCategories,
  month: renderMonth, settings: renderSettings,
};
type Screen = keyof typeof renderScreen;

class App {
  private readonly view = required(document, "#view");
  private readonly notice = required(document, "#notice");
  private readonly error = required(document, "#error");
  private readonly navigation = document.querySelectorAll<HTMLButtonElement>("nav button[data-screen]");
  private ledger?: Ledger;
  private screen: Screen = "transactions";

  constructor(private readonly backend: Backend) {}

  async start(): Promise<void> {
    const badge = required(document, "#backend-badge");
    badge.textContent = this.backend.kind;
    badge.hidden = this.backend.kind === "native";
    for (const button of this.navigation) {
      button.addEventListener("click", () => this.navigate(button.dataset.screen));
    }
    this.ledger = await this.backend.loadLedger();
    this.render();
  }

  private navigate(screen?: string): void {
    if (!screen || !Object.hasOwn(renderScreen, screen)) return;
    this.screen = screen as Screen;
    this.notice.textContent = "";
    this.error.textContent = "";
    this.render();
  }

  private render(): void {
    if (!this.ledger) return;
    for (const button of this.navigation) {
      if (button.dataset.screen === this.screen) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    this.view.replaceChildren();
    const context: ViewContext = {
      backend: this.backend,
      ledger: this.ledger,
      commit: async (operation, message) => {
        this.ledger = await operation();
        this.render();
        this.error.textContent = "";
        this.notice.textContent = message;
      },
      report: (error) => {
        this.error.textContent = error instanceof Error ? error.message : "The ledger is unavailable.";
      },
    };
    renderScreen[this.screen](this.view, context);
  }
}

function reportStartup(error: unknown): void {
  const title = element("h1", "Ledger unavailable");
  title.id = "screen-title";
  required(document, "#view").replaceChildren(title);
  required(document, "#error").textContent = error instanceof Error ? error.message : "The ledger could not be opened.";
}

try {
  void new App(connectBackend()).start().catch(reportStartup);
} catch (error) {
  reportStartup(error);
}
