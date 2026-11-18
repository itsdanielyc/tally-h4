import type { PickedCsv } from "../../application/import-commands";

/** Uses Chromium's file input to drive the labelled mock with a selected fixture. */
export function pickMockCsv(): Promise<PickedCsv | null> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,.tsv,.txt,text/csv";
  input.hidden = true;
  document.body.append(input);
  return new Promise((resolve, reject) => {
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    }, { once: true });
    input.addEventListener("change", () => {
      const file = input.files?.item(0);
      input.remove();
      if (!file) resolve(null);
      else void file.text().then((contents) => resolve({ name: file.name, contents }), reject);
    }, { once: true });
    input.click();
  });
}
