#!/usr/bin/env node
/**
 * Build `keyboard.pkg` — the PJOS keyboard package.
 *
 * A .pkg is a gzipped tar with a flat, self-describing layout:
 *
 *   manifest.json      package metadata + Input API contract (abi: 1)
 *   dist/...           built provider bundle (vite output)
 *   README.md          install/run notes shipped with the package
 *   SHA256SUMS         checksums for every file above
 *
 * The format is intentionally simple so an installer only needs tar + sha256sum.
 * `keyboard.pj` is reserved for the future PocketJS-native package format; this
 * script emits `keyboard.pkg` until that ABI exists.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, cpSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const distDir = join(root, "dist");
const staging = join(root, "packaging", ".stage");
const outFile = join(root, "keyboard.pkg");

if (!statSync(distDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error("packaging: dist/ missing — run `npm run build` first");
  process.exit(1);
}

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

cpSync(distDir, join(staging, "dist"), { recursive: true });
cpSync(join(root, "packaging", "manifest.json"), join(staging, "manifest.json"));
cpSync(join(root, "README.md"), join(staging, "README.md"));

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const manifest = JSON.parse(readFileSync(join(staging, "manifest.json"), "utf8"));
const sums = walk(staging)
  .map((file) => relative(staging, file))
  .sort()
  .map((rel) => `${createHash("sha256").update(readFileSync(join(staging, rel))).digest("hex")}  ${rel}`);

writeFileSync(join(staging, "SHA256SUMS"), `${sums.join("\n")}\n`);

rmSync(outFile, { force: true });
execFileSync("tar", ["-czf", outFile, "-C", staging, "."], { stdio: "inherit" });
rmSync(staging, { recursive: true, force: true });

const bytes = statSync(outFile).size;
const digest = createHash("sha256").update(readFileSync(outFile)).digest("hex");
writeFileSync(`${outFile}.sha256`, `${digest}  keyboard.pkg\n`);

console.log(`packaged ${relative(root, outFile)} (${bytes} bytes)`);
console.log(`${manifest.id}@${manifest.version} abi=${manifest.abi}`);
console.log(`sha256 ${digest}`);
