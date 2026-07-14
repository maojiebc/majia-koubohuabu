import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const errors = [];
const fail = (message) => errors.push(message);

function sha256(relative) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
}

function inside(box, canvas) {
  return box.x >= 0 && box.y >= 0 && box.w > 0 && box.h > 0
    && box.x + box.w <= canvas.width
    && box.y + box.h <= canvas.height;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const lock = JSON.parse(read("vendor/manifest.sha256.json"));
for (const [relative, expected] of Object.entries(lock.files)) {
  if (!exists(relative)) fail(`missing locked vendor file: ${relative}`);
  else if (sha256(relative) !== expected) fail(`vendor file changed: ${relative}`);
}

const themes = JSON.parse(read("vendor/portrait-talk-theme-kit/tokens/themes.json"));
if (themes.themes?.length !== 8) fail("portrait-talk-theme-kit must keep exactly 8 original themes");

// PNG 渲染器用同一格式解析主题渐变；若 vendor 渐变格式变化，这里先失败
const gradientPattern = /^linear-gradient\(\s*[\d.]+deg(\s*,\s*#[0-9A-Fa-f]{6}\s+[\d.]+%){2,}\s*\)$/;
for (const theme of themes.themes || []) {
  if (theme.gradient && !gradientPattern.test(theme.gradient)) fail(`theme gradient not canvas-parseable: ${theme.id}`);
}

const data = JSON.parse(read("config/compositions.json"));
const ids = new Set();
let layoutCount = 0;
if (data.formats?.length !== 2) fail("composition registry must contain landscape and portrait formats");
for (const format of data.formats || []) {
  if (ids.has(format.id)) fail(`duplicate id: ${format.id}`);
  ids.add(format.id);
  for (const layout of format.layouts || []) {
    layoutCount += 1;
    if (ids.has(layout.id)) fail(`duplicate id: ${layout.id}`);
    ids.add(layout.id);
    for (const key of ["screen", "speaker", "title", "point", "subtitle"]) {
      if (!layout[key] || !inside(layout[key], format.canvas)) fail(`${layout.id}.${key}: outside canvas`);
    }
    if (layout.speakerShape === "circle" && layout.speaker.w !== layout.speaker.h) fail(`${layout.id}: circle is not square`);
    if (layout.subtitle.maxLines !== 1) fail(`${layout.id}: subtitles must be one line`);
    if (overlaps(layout.subtitle, layout.speaker)) fail(`${layout.id}: subtitle overlaps speaker`);
  }
}
if (layoutCount !== 8) fail(`expected 8 dual-source layouts, got ${layoutCount}`);

const html = read("src/index.html");
for (const marker of ["录屏画面 1", "主讲人画面 2", "dual-studio.css", "dual-studio.js", "tokens/compositions.json", "advanced-fields", "handoff-pack", "/koubo/favicon.svg"]) {
  if (!html.includes(marker)) fail(`src/index.html missing marker: ${marker}`);
}
if (/<script[^>]+src=["']https?:\/\//i.test(html) || /<link[^>]+href=["']https?:\/\/[^"']+\.css/i.test(html)) {
  fail("runtime assets must not depend on remote JavaScript or CSS");
}

try {
  execFileSync(process.execPath, ["--check", path.join(root, "src/dual-studio.js")], { stdio: "pipe" });
} catch (error) {
  fail(`dual-studio.js syntax check failed: ${error.stderr?.toString() || error.message}`);
}

for (const relative of [
  "dist/favicon.svg",
  "dist/koubo/favicon.svg",
  "dist/koubo/index.html",
  "dist/koubo/dual-studio.css",
  "dist/koubo/dual-studio.js",
  "dist/koubo/tokens/compositions.json",
  "dist/koubo/tokens/themes.json",
  "dist/koubo/portrait-talk-theme-kit.zip",
]) {
  if (!exists(relative)) fail(`build output missing: ${relative}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`PASS vendor lock / 8 themes / 2 formats / ${layoutCount} layouts / standalone build`);
