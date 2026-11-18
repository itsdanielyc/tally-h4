import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const targets = {
  win32: { architecture: "x64", extensions: [".exe"] },
  darwin: { architecture: "arm64", extensions: [".dmg"] },
  linux: { architecture: "x64", extensions: [".deb", ".AppImage"] },
};
const output = process.argv[2] ?? "release";
const target = targets[process.platform];
if (!target || process.arch !== target.architecture) {
  throw new Error("Unsupported release runner " + process.platform + "-" + process.arch + ".");
}

const entries = await readdir(output, { withFileTypes: true });
const bundles = [];
for (const extension of target.extensions) {
  const matches = entries.filter((entry) => entry.isFile() && entry.name.endsWith(extension));
  if (matches.length !== 1) throw new Error("Expected exactly one tested " + extension + " in " + output + ".");
  bundles.push(matches[0].name);
}

const checksums = [];
for (const bundle of bundles.sort()) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(join(output, bundle))) digest.update(chunk);
  checksums.push(digest.digest("hex") + "  " + bundle);
}
const checksumFile = "SHA256SUMS-" + process.platform + "-" + process.arch + ".txt";
await writeFile(join(output, checksumFile), checksums.join("\n") + "\n");
console.log(checksumFile + "\n" + checksums.join("\n"));
