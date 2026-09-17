// 파일을 여러 개로 쪼개지 않고 하나로 유지하되, terser로 안전한 지점마다
// 줄바꿈을 넣은 out.wrapped.js를 사용해 앱스크립트 편집기가 다루기 쉬운
// 형태로 만든다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const js = fs.readFileSync(path.join(__dirname, "out.wrapped.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "out.css"), "utf8");

const appHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>물류센터 업무관리 시스템</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css">
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, "App.html"), appHtml);
fs.writeFileSync(path.join(__dirname, "..", "App.html"), appHtml);

const finalHtml = `<script defer src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
<style>${css}</style>
<div id="root"></div>
<script>
${js}
</script>
`;
fs.writeFileSync(path.join(__dirname, "final.html"), finalHtml);

console.log(`App.html: ${(appHtml.length / 1024).toFixed(1)}KB`);
console.log(`final.html: ${(finalHtml.length / 1024).toFixed(1)}KB`);
