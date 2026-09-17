import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(REPO_ROOT, "src");

const NM = path.join(REPO_ROOT, "node_modules");

const EXTS = [".tsx", ".ts", ".jsx", ".js"];
function resolveWithExt(basePath) {
  for (const ext of EXTS) {
    if (fs.existsSync(basePath + ext)) return basePath + ext;
  }
  for (const ext of EXTS) {
    const indexPath = path.join(basePath, "index" + ext);
    if (fs.existsSync(indexPath)) return indexPath;
  }
  return basePath;
}

const aliasPlugin = {
  name: "alias",
  setup(build) {
    build.onResolve({ filter: /^next\/navigation$/ }, () => ({
      path: path.join(__dirname, "next-navigation-shim.js"),
    }));
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: resolveWithExt(path.join(SRC, args.path.slice(2))),
    }));
    // entry.jsx and next-navigation-shim.js live outside the repo tree, so
    // their bare `react`/`react-dom` imports won't naturally resolve up to
    // the repo's node_modules — point them there explicitly. Once resolved,
    // those files' own internal imports resolve normally since they're
    // inside node_modules already.
    build.onResolve({ filter: /^react$/ }, () => ({ path: path.join(NM, "react/index.js") }));
    build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({
      path: path.join(NM, "react/jsx-runtime.js"),
    }));
    build.onResolve({ filter: /^react-dom\/client$/ }, () => ({
      path: path.join(NM, "react-dom/client.js"),
    }));
  },
};

await esbuild.build({
  entryPoints: [path.join(__dirname, "entry.jsx")],
  bundle: true,
  outfile: path.join(__dirname, "out.js"),
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  loader: { ".js": "jsx", ".tsx": "tsx", ".ts": "ts" },
  resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
  plugins: [aliasPlugin],
  define: { "process.env.NODE_ENV": '"production"' },
  // "Mg is not defined", "ThemeProvider is not defined" 등 이전에 압축
  // 옵션 탓으로 의심했던 버그들은, 다시 살펴보니 실제로는 전부 Apps Script
  // 편집기에 큰 파일을 붙여넣는 과정에서 내용이 손상된 것으로 확인됐다
  // (해당 심볼이 소스에 정상적으로 존재하는데도 "정의 안 됨" 에러가 났었음
  // — esbuild가 선언은 이름을 바꾸고 참조는 안 바꾸는 일은 있을 수 없고,
  // 그런 불일치는 중간 내용이 잘려나가야만 생긴다). 그래서 압축을 최대로
  // (변수명 포함) 걸어서 파일 크기 자체를 최대한 줄인다 — 사용자가 여러
  // 파일로 나누는 것을 원치 않아서, 단일 파일 크기를 줄이는 쪽으로 접근.
  // wrap-lines.mjs(포맷팅 전용 terser 패스)를 뒤에 한 번 더 거쳐 극단적으로
  // 긴 한 줄이 생기는 것도 방지한다.
  minify: true,
  // 매번 다른 빌드에서도 "Unexpected identifier '$'" 에러가 비슷한 위치
  // (템플릿 리터럴 `${...}` 근처)에서 반복돼서, 백틱(`) 문자 자체가
  // 어딘가에서 다른 문자로 깨지는 것으로 의심된다(예: 붙여넣는 경로 중
  // 스마트 따옴표 자동 변환). 템플릿 리터럴만 콕 집어 일반 문자열 연결
  // (+)로 바꿔서 백틱을 아예 없앤다 — 화살표 함수/async 등 다른 문법은
  // 그대로 최신 문법으로 유지해 불필요한 변환(코드 팽창) 없이 이 부분만
  // 고친다.
  supported: { "template-literal": false },
  logLevel: "info",
});

console.log("esbuild bundle written to out.js");
