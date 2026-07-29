import { execFileSync } from "node:child_process";
import { chmod, copyFile, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(root, "dist");
const assets = [
  "presets/archive.css",
  "presets/archive-runtime.js",
  "presets/briefing.css",
  "presets/pitch.css",
  "presets/slides-dify-x.css",
  "shared/deck.css",
  "shared/deck.js",
  "shared/tokens.css",
];

await rm(dist, { force: true, recursive: true });
execFileSync(
  process.execPath,
  [path.join(root, "node_modules", "typescript", "bin", "tsc"), "--project", path.join(root, "tsconfig.build.json")],
  { cwd: root, stdio: "inherit" },
);
await cp(path.join(root, "src", "templates"), path.join(dist, "templates"), { recursive: true });
for (const asset of assets) {
  const target = path.join(dist, asset);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, "src", asset), target);
}
await chmod(path.join(dist, "bin.js"), 0o755);
