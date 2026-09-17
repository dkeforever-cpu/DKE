# AI 인수인계 문서

다른 AI 도구(또는 새 세션)로 이 프로젝트 작업을 이어받을 때 필요한 내용을
전부 모아둔 문서입니다. **작업을 시작하기 전에 이 문서 전체와
`apps-script/CHECKPOINT.md`를 먼저 읽으세요.** CHECKPOINT.md에는 "이미
시도했다가 실패해서 다시 시도하면 안 되는 방법들"이 기록되어 있습니다 —
안 읽으면 똑같은 시행착오를 반복하게 됩니다.

## 이 프로젝트는 무엇인가

한국 물류회사의 **내부 업무관리 시스템**(사내 전용, 약 10명이 사용).
업무 등록/체크리스트/댓글/첨부파일/캘린더/알림/엑셀 내보내기/관리자
설정을 갖춘 협업 툴입니다. 외부 공개 서비스가 아니라 **구글 인프라
안에서만 돌아가는** 자체 호스팅 시스템입니다.

## 아키텍처 — 반드시 이해해야 할 이중 구조

이 저장소에는 **서로 다른 두 가지 실행 형태**가 있습니다. 헷갈리기 쉬운
부분이니 명확히 구분하세요.

### 1. 개발용 — Next.js 앱 (`src/`)
- 평범한 Next.js 16 + React 19 + TypeScript + Tailwind v4 앱
- `npm run dev`로 로컬 개발 서버 실행, `http://localhost:3000`
- 코드 작성·수정은 전부 여기서 합니다
- **이건 실제 서비스에 배포되는 형태가 아닙니다** — 로컬 테스트 전용

### 2. 실제 배포 — Google Apps Script 단일 파일 번들 (`apps-script/`)
- 실사용자가 접속하는 진짜 시스템은 **구글 시트에 바인딩된 Apps Script
  웹 앱**입니다
- `src/` 전체를 빌드해서 **`apps-script/App.html` 파일 하나**(HTML+CSS+JS
  전부 인라인, ~430KB)로 합칩니다
- 백엔드는 별도 서버가 아니라 `apps-script/*.gs` 파일들(Google Apps
  Script) — 구글 시트를 DB로, 구글 드라이브를 파일 저장소로 씁니다
- **배포는 자동이 아니라 수동입니다**: `App.html`/`Code.gs` 등을
  Apps Script 온라인 편집기에 직접 복사해 붙여넣고 재배포해야 실제
  화면에 반영됩니다. 사용자가 이 저장소를 git으로 pull하는 게 아니라,
  파일 내용을 편집기에 붙여넣는 방식입니다.

**빌드 방법**: `apps-script/build/README.md` 참고. 요약하면:
```bash
# 반드시 저장소 루트에서! (apps-script/build/README.md의 "중요" 항목 참고)
node apps-script/build/build-css.mjs
node apps-script/build/build.mjs
node apps-script/build/css-audit.mjs   # "Missing from out.css: 0" 확인 필수
node apps-script/build/wrap-lines.mjs
node apps-script/build/assemble-single.mjs   # apps-script/App.html 갱신
```

**`src/`에 새 페이지(`app/새경로/page.tsx`)를 추가했다면**, `apps-script/
build/entry.jsx`의 수동 라우터에도 그 경로를 추가해야 배포판에서 접근
가능합니다(Next.js 개발 서버는 파일 기반 라우팅이라 자동이지만, 번들은
`entry.jsx`가 직접 만든 해시 라우터를 씁니다). 이걸 빠뜨려서 "개발
환경에서는 되는데 배포판에서는 안 된다"는 버그가 실제로 있었습니다.

## 저장소 / 브랜치 정보

- GitHub: `dkeforever-cpu/DKE` (**비공개** 저장소 — 2026-09-17에 공개에서
  전환함)
- 작업 브랜치: `claude/internal-task-management-system-ei53xq`
- 이 문서 작성 시점 최신 커밋: `1c6dab6`

## 롤백 방법

모든 변경이 git 커밋으로 남아있습니다. 특정 시점으로 되돌리려면:
```bash
git log --oneline          # 되돌릴 커밋 확인
git revert <커밋해시>        # 그 커밋만 취소하는 새 커밋 생성 (추천 — 이력 보존)
# 또는
git reset --hard <커밋해시>  # 그 시점 상태로 강제 되돌리기 (이후 커밋들 사라짐, 주의)
```
**중요**: git을 되돌리는 것만으로는 실제 배포 화면이 안 바뀝니다. 위
"빌드 방법"으로 `App.html`을 다시 만든 뒤, 그 내용을 Apps Script
편집기에 다시 붙여넣고 재배포해야 실제로 예전 모습으로 돌아갑니다.

## 로컬 테스트 방법

```bash
npm install
npm run dev
```
- 로그인: `admin` / `blp00487`
- 백엔드 연동 없이 열면 브라우저 `localStorage`를 DB처럼 쓰는 "로컬 저장
  모드"로 동작 — 실제 구글 시트 연동 없이도 대부분 기능을 테스트 가능
- Playwright로 UI 테스트할 때: Next.js 개발 도구 플로팅 버튼
  (`<nextjs-portal>`)이 화면 좌하단 근처 클릭을 가로챌 수 있음 —
  `.click()` 대신 `.dispatchEvent('click')` 사용 권장
- 코드 수정 후 항상 `npx tsc --noEmit`과 `npx eslint <수정한 파일>`을
  통과시킬 것

## 코드 구조 요약

- `src/lib/store.tsx` — 전역 상태 + 모든 CRUD 로직 (React Context, 제일
  큰 파일)
- `src/lib/types.ts` — 전체 데이터 모델(타입) 정의
- `src/lib/gas-client.ts` — 백엔드(Apps Script) 통신 클라이언트
- `src/app/` — 페이지들 (Next.js App Router 구조, 각 폴더가 라우트)
- `src/components/` — 재사용 컴포넌트, `admin/` 하위는 관리자 설정 탭들
- `apps-script/Schema.gs` — 구글 시트 테이블 스키마 정의 (여기가 DB
  스키마의 원본)
- `apps-script/Code.gs` — API 진입점(`doGet`)과 CRUD 라우팅
- `apps-script/Drive.gs` — 파일 업로드/삭제 (구글 드라이브)
- `apps-script/CHECKPOINT.md` — **실패했던 시도들의 기록. 필독.**

## 알아야 할 설계상 특이사항

1. **통신이 전부 GET** — Apps Script 웹 앱 리다이렉트가 POST 본문을
   날려버리는 문제 때문에, 모든 요청(action/token/payload)을 JSON으로
   묶어 `?data=` 쿼리 파라미터 하나에 실어 보냅니다. 그래서 **큰 값을
   저장하려는 요청은 URL 길이 제한에 걸려 400 오류가 날 수 있습니다**
   (실제로 로고 이미지 저장 기능에서 이 문제로 여러 번 시행착오를
   겪었습니다 — `apps-script/CHECKPOINT.md` 참고). 큰 값을 보내야 하면
   `google.script.run`(자체 호스팅 화면에서만 동작) 경로를 쓰세요
   (`Drive.gs`의 `getUploadUrl`/`finalizeDirectUpload` 패턴 참고).
2. **파일 업로드는 구글 드라이브로 직접** — 브라우저가 Apps Script를
   거치지 않고 드라이브에 직접 PUT합니다 (빠름). 드라이브의 "공개 보기
   링크"(`uc?export=view`)를 `<img src>`에 직접 거는 방식은 안정적으로
   안 뜨는 걸 확인했으니 (프로그램 로고 기능에서 이 문제를 겪음)
   피하세요 — 서버가 파일을 읽어 base64로 응답에 실어 돌려주는 방식을
   대신 씁니다.
3. **NewsItems(NEW 알림)와 ActivityLogs(활동 기록)이 무한 누적** — 삭제
   로직이 없어서 데이터가 계속 쌓입니다. 당장 문제는 아니지만(수년 단위),
   나중에 로그인/새로고침이 느려지면 이게 원인일 가능성이 높습니다.
4. **권한 필터링이 클라이언트에서만** — 서버(`Code.gs`)는 요청받은
   엔티티를 전부 돌려주고, "이 사용자가 볼 수 있는 업무만" 거르는 건
   프론트엔드입니다. 민감한 데이터를 다룰 계획이면 서버 쪽 필터링이
   필요합니다.
5. **비밀번호는 SHA-256 해시만, salt 없음** — 클라이언트 전용 프로토타입
   수준 보안입니다. 실제 인사/급여 데이터에는 부적합.
6. **App.html을 여러 파일로 쪼개지 말 것** — `<?!= include(...); ?>`
   스크립틀릿 방식은 실제 배포에서 파싱 에러가 반복 재현되어 포기했습니다
   (로컬 테스트로는 재현 안 됨). CHECKPOINT.md 참고.

## 알려진 미해결 항목 (2026-09-17 기준, 우선순위 순)

1. NewsItems/ActivityLogs 무한 누적 → 오래된 데이터 자동 정리 필요
2. 완료 업무 아카이브 없음 → 데이터 늘어나면 로딩 느려짐
3. 통계/현황 대시보드 없음 (담당자별 업무량, 지연 현황 등)
4. 서버 쪽 권한 필터링 없음 (보안 항목 4번)
5. 반복 업무, 업무 템플릿, 마감 임박 알림, 일괄 작업, 삭제 복구, 이메일
   알림 — 전부 미구현
6. 배포가 수동 복붙 (clasp 자동화 검토했으나 아직 미적용)
7. 자동 백업 없음 (수동 JSON 내보내기만 가능)

## 문서 최신성 안내

`README.md`(저장소 루트)는 초기 프로토타입 시절 내용 그대로라 **오래되고
부정확합니다**(로그인 방식, 기능 목록 등이 실제와 다름) — 참고하지 말고
이 문서와 `apps-script/README.md`, `apps-script/CHECKPOINT.md`를
기준으로 삼으세요.
