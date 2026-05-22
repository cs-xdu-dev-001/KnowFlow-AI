import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, "..");

const assets = [
  ["styles.css", "react/src/styles.css"],
];

for (const [sourcePath, targetPath] of assets) {
  const source = resolve(frontendDir, sourcePath);
  const target = resolve(frontendDir, targetPath);
  copyFileSync(source, target);
  console.log(`Synced ${source} -> ${target}`);
}
