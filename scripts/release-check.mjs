import { readFile } from "node:fs/promises";

const [packageText, lockText, changes] = await Promise.all([
  readFile("package.json", "utf8"),
  readFile("package-lock.json", "utf8"),
  readFile("CHANGELOG.md", "utf8"),
]);
const { name, version } = JSON.parse(packageText);
const lock = JSON.parse(lockText);
const lockedApp = lock.packages?.[""];

if (!/^\d+\.\d+\.\d+$/.test(version) || name !== lockedApp?.name ||
    version !== lock.version || version !== lockedApp.version) {
  throw new Error("package.json and package-lock.json must agree on the release name and version.");
}
if (!changes.split(/\r?\n/).some((line) => line.startsWith("## [" + version + "]"))) {
  throw new Error("CHANGELOG.md is missing the release version " + version + ".");
}
if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== "v" + version) {
  throw new Error("The tag must match the package version v" + version + ".");
}
console.log(name + " " + version + " version and changelog agree.");
