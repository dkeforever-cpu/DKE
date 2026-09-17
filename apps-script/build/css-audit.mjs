// out.css(build-css.mjs 결과물)에 out.js가 실제로 쓰는 Tailwind 클래스가
// 전부 들어있는지 확인한다. Tailwind는 소스 파일을 직접 스캔해서 CSS를
// 만드는데, 이 프로젝트는 App.html 하나로 합치는 별도 빌드라 혹시
// 빠지는 클래스가 없는지 여기서 다시 한번 교차 확인한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(REPO_ROOT, "src");
const outCss = fs.readFileSync(path.join(__dirname, "out.css"), "utf8");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk(SRC);
const classSet = new Set();
const classNameRe = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  let m;
  while ((m = classNameRe.exec(content))) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    // strip template expressions ${...}
    const cleaned = raw.replace(/\$\{[^}]*\}/g, " ");
    for (const cls of cleaned.split(/\s+/)) {
      if (cls) classSet.add(cls);
    }
  }
}

function escapeForSelector(cls) {
  return cls.replace(/([:.\[\]\/%()#!,])/g, "\\$1");
}

const missing = [];
for (const cls of classSet) {
  const esc = escapeForSelector(cls);
  const selector = "." + esc;
  if (!outCss.includes(selector)) {
    missing.push(cls);
  }
}

console.log(`Total classes found: ${classSet.size}`);
console.log(`Missing from out.css: ${missing.length}`);
if (missing.length > 0) {
  console.log(missing.slice(0, 100).join("\n"));
}
