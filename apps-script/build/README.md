# App.html 빌드 파이프라인

`apps-script/App.html`은 `src/` 전체(Next.js 프론트엔드)를 빌드해 만든
단일 HTML+JS+CSS 파일입니다. 사람이 직접 편집하지 않고, `src/` 코드를
고친 뒤 이 폴더의 스크립트로 다시 만들어냅니다.

## 실행 순서 (반드시 저장소 루트에서 실행)

```bash
# 저장소 루트(/…/DKE)에서 실행 — apps-script/build/ 안에서 실행하면
# 아래 "중요" 항목의 이유로 Tailwind 클래스가 대부분 빠진 CSS가 나온다.
node apps-script/build/build-css.mjs      # 1. Tailwind CSS 빌드 → out.css
node apps-script/build/build.mjs          # 2. esbuild로 src/ 전체 번들 → out.js
node apps-script/build/css-audit.mjs      # 3. 검증: "Missing from out.css: 0" 이어야 함
node apps-script/build/wrap-lines.mjs     # 4. terser로 긴 한 줄을 안전하게 줄바꿈 → out.wrapped.js
node apps-script/build/assemble-single.mjs # 5. App.html 조립 (apps-script/App.html에 직접 씀)
```

다섯 단계 전부 순서대로 실행해야 합니다(뒷 단계가 앞 단계의 출력 파일을
읽습니다). `apps-script/App.html`이 갱신되면 그걸 Apps Script 편집기에
붙여넣고 재배포하면 됩니다 — 위 5단계는 배포 자체가 아니라 "배포할 파일을
만드는" 과정입니다.

## ⚠️ 중요: 반드시 저장소 루트에서 실행할 것

`build-css.mjs`가 쓰는 Tailwind v4(`@tailwindcss/postcss`)는 소스 파일을
스캔해서 실제 쓰인 클래스만 CSS로 만드는데, 이 스캔 범위를 **현재 작업
디렉터리(cwd) 기준**으로 판단합니다. `cd apps-script/build && node
build-css.mjs`처럼 이 폴더 안에서 실행하면 `src/`를 못 찾아서 CSS가
거의 텅 비게 나옵니다(경험상 263개 클래스 중 260개가 누락됨 — 화면이
스타일 없이 깨져 보이는 원인). 항상 저장소 루트에서
`node apps-script/build/build-css.mjs` 형태로 실행하세요. 4번째 단계
(`css-audit.mjs`)가 정확히 이 문제를 잡아내는 검증 단계이니, 실행할 때마다
"Missing from out.css: 0"인지 꼭 확인하세요 — 0이 아니면 CSS가 잘못 빌드된
것입니다.

## 파일 설명

| 파일 | 역할 |
| --- | --- |
| `entry.jsx` | 번들의 진입점. `src/app/*/page.tsx`들을 직접 import해서 해시(`#/…`) 기반으로 라우팅하는 최소 라우터를 만든다 — Next.js의 실제 파일 기반 라우팅은 여기 없다. |
| `next-navigation-shim.js` | `next/navigation`(`useRouter`/`usePathname`/`useParams`)을 해시 라우팅으로 대체하는 shim. `src/` 코드는 이 shim의 존재를 모르고 평소처럼 `next/navigation`을 import한다 — `build.mjs`의 esbuild 플러그인이 그 import를 이 파일로 바꿔치기한다. |
| `build-css.mjs` | `src/app/globals.css`(Tailwind)를 빌드해 `out.css` 생성 |
| `build.mjs` | `entry.jsx`부터 esbuild로 `src/` 전체를 번들링해 `out.js` 생성 |
| `css-audit.mjs` | `src/**/*.tsx`에 실제 쓰인 Tailwind 클래스가 `out.css`에 다 있는지 검증 |
| `wrap-lines.mjs` | `out.js`(minify로 한 줄 90만자)를 terser 포맷팅 전용 패스로 안전하게 줄바꿈 → `out.wrapped.js`. 극단적으로 긴 한 줄이 Apps Script 편집기 붙여넣기 중 내용 손상을 일으키는 것으로 추정되어 추가됨(`CHECKPOINT.md` 참고) |
| `assemble-single.mjs` | `out.wrapped.js` + `out.css`를 합쳐 `apps-script/App.html`(및 참고용 `final.html`)을 씀 |

## ⚠️ App.html을 여러 파일로 쪼개지 말 것

`CHECKPOINT.md`에 기록된 대로, `<?!= include(...); ?>` 스크립틀릿으로
App.html을 여러 파일로 쪼개 합치는 방식은 실제 배포에서 파싱 에러가
반복 재현되어 포기했습니다. 지금처럼 하나의 큰 파일로 유지하는 게
검증된 방식입니다.

## entry.jsx에 새 페이지 추가하는 법

`src/app/<새 페이지>/page.tsx`를 만들었다면, `entry.jsx`의 `Router` 함수에도
해당 경로 분기를 **직접 추가**해야 배포판에서 접근 가능합니다. Next.js
개발 서버(`npm run dev`)는 파일 기반 라우팅이라 자동으로 되지만, 이 번들은
`entry.jsx`의 수동 라우터를 쓰기 때문입니다 — 이 단계를 빠뜨리면 "개발
환경에서는 되는데 배포판에서는 그 메뉴가 안 눌린다"는 문제가 생깁니다
(실제로 겪었던 버그입니다).
