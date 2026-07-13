import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = path.join(dist, "koubo");
const vendor = path.join(root, "vendor/portrait-talk-theme-kit");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(vendor, site, { recursive: true });

const copies = [
  ["src/index.html", "dist/koubo/index.html"],
  ["src/dual-studio.css", "dist/koubo/dual-studio.css"],
  ["src/dual-studio.js", "dist/koubo/dual-studio.js"],
  ["src/favicon.svg", "dist/favicon.svg"],
  ["src/favicon.svg", "dist/koubo/favicon.svg"],
  ["config/compositions.json", "dist/koubo/tokens/compositions.json"],
  ["docs/chatcut-integration.md", "dist/koubo/docs/chatcut-integration.md"],
  ["vendor/portrait-talk-theme-kit.zip", "dist/koubo/portrait-talk-theme-kit.zip"],
];

for (const [from, to] of copies) {
  const target = path.join(root, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, from), target);
}

console.log(`Built ${site}`);
