// esbuild가 만든 out.js는 압축(minifyWhitespace)으로 거의 전체가 한 줄(90만자)로
// 이어져 있다. 이렇게 극단적으로 긴 한 줄은 Apps Script 편집기(코드 에디터)가
// 붙여넣기 중 내용을 잘못 처리하는 원인일 가능성이 높다. terser를 압축 없이
// "포맷팅 전용"으로 돌려서, 문자열/템플릿 리터럴 안쪽은 건드리지 않고
// 안전한 지점(문/표현식 경계)에서만 줄바꿈을 넣는다 — 코드 자체(변수명, 로직)는
// 전혀 바뀌지 않는다.
import { minify } from "terser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = fs.readFileSync(path.join(__dirname, "out.js"), "utf8");

const result = await minify(src, {
  compress: false,
  mangle: false,
  format: {
    max_line_len: 500,
    comments: false,
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

fs.writeFileSync(path.join(__dirname, "out.wrapped.js"), result.code);
const lineCount = result.code.split("\n").length;
console.log(`줄바꿈 적용 완료: ${lineCount}줄, ${(result.code.length / 1024).toFixed(1)}KB`);
