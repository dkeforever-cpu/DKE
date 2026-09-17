import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { transform } from "lightningcss";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const input = fs.readFileSync(path.join(REPO_ROOT, "src/app/globals.css"), "utf8");

const result = await postcss([tailwind()]).process(input, {
  from: path.join(REPO_ROOT, "src/app/globals.css"),
  to: path.join(__dirname, "out.css"),
});

const minified = transform({
  filename: "out.css",
  code: Buffer.from(result.css),
  minify: true,
}).code.toString();

fs.writeFileSync(path.join(__dirname, "out.css"), minified);
console.log("out.css regenerated:", (minified.length / 1024).toFixed(1) + "KB");
