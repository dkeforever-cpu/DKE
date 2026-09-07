"use client";

// Google Apps Script 백엔드(../../apps-script)와 통신하는 얇은 클라이언트.
// 모든 요청은 GET이다 — POST를 쓰면 Apps Script 웹 앱의 /exec 주소가 302로
// 리다이렉트할 때 브라우저 fetch()가 표준(Fetch 스펙)에 따라 요청을
// 자동으로 GET으로 바꾸고 본문을 버려서, 실제로는 토큰도 action도 서버에
// 전달되지 않는다(Apps Script 실행 기록에 doPost가 안 찍히는 게 그 증거).
// GET은 리다이렉트를 거쳐도 메서드가 바뀌지 않으므로, action/token/payload를
// 전부 JSON으로 묶어 쿼리 파라미터 하나(data)에 실어 보낸다.

const URL_KEY = "dke-backend-url";
const TOKEN_KEY = "dke-backend-token";

export interface BackendConfig {
  url: string;
  token: string;
}

export function getBackendConfig(): BackendConfig | null {
  if (typeof window === "undefined") return null;
  const url = window.localStorage.getItem(URL_KEY);
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!url || !token) return null;
  return { url, token };
}

export function setBackendConfig(url: string, token: string) {
  window.localStorage.setItem(URL_KEY, url.trim());
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearBackendConfig() {
  window.localStorage.removeItem(URL_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}

export function hasBackendConfig(): boolean {
  return getBackendConfig() !== null;
}

/**
 * 이 페이지가 Apps Script 웹 앱 배포 자체에서 서빙되고 있다면(Code.gs의
 * serveApp_이 심어준 값), 그 배포의 안정적인 웹 앱 주소를 돌려준다. 로컬
 * 파일로 열었거나 아티팩트로 열었을 때는 null.
 */
export function getSelfHostedBackendUrl(): string | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __DKE_BACKEND_URL__?: string }).__DKE_BACKEND_URL__ || null;
}

export class GasApiError extends Error {}

async function call<T>(action: string, payload: unknown = {}, configOverride?: BackendConfig): Promise<T> {
  const cfg = configOverride ?? getBackendConfig();
  if (!cfg) {
    throw new GasApiError("연동된 구글 시트가 없습니다. 설정에서 Apps Script 웹앱 URL을 등록해주세요.");
  }

  const requestBody = JSON.stringify({ action, token: cfg.token, payload });
  const sep = cfg.url.includes("?") ? "&" : "?";
  const requestUrl = `${cfg.url}${sep}data=${encodeURIComponent(requestBody)}`;

  let res: Response;
  try {
    res = await fetch(requestUrl, { method: "GET" });
  } catch {
    throw new GasApiError("구글 시트 서버에 연결할 수 없습니다. 인터넷 연결과 웹앱 URL을 확인해주세요.");
  }

  if (!res.ok) {
    throw new GasApiError(`서버 오류 (${res.status}): 잠시 후 다시 시도해주세요.`);
  }

  let resBody: { ok: boolean; data?: T; error?: string };
  try {
    resBody = await res.json();
  } catch {
    throw new GasApiError("서버 응답을 해석할 수 없습니다. 웹앱 URL이 올바른지 확인해주세요.");
  }

  if (!resBody.ok) {
    throw new GasApiError(resBody.error || "알 수 없는 오류가 발생했습니다.");
  }
  return resBody.data as T;
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  url: string;
}

// 첨부파일은 google.script.run으로 앱스크립트에 "업로드 세션 URL"만 요청하고
// (관리자 권한으로 열림 — ScriptApp.getOAuthToken()), 실제 파일 바이너리는
// 앱스크립트를 거치지 않고 브라우저가 그 주소로 구글 드라이브에 직접
// PUT한다. 조각내서 여러 번의 GET 요청으로 보내던 이전 방식은 조각 하나당
// 앱스크립트 실행이 한 번씩 걸려 파일이 조금만 커도 느렸다(실측: 500KB
// 5개에 4분) — 이 방식은 요청이 한 번뿐이라 그 오버헤드가 없다.
//
// google.script.run은 이 배포가 직접 서빙하는 화면(자체 호스팅 모드)에서만
// 주입되므로, 그 화면이 아니면(로컬 파일로 열었을 때 등) 업로드를 쓸 수 없다.
interface GoogleScriptRun {
  withSuccessHandler: (cb: (result: unknown) => void) => GoogleScriptRun;
  withFailureHandler: (cb: (err: Error) => void) => GoogleScriptRun;
  getUploadUrl: (token: string, fileName: string, mimeType: string, folder: string) => void;
  finalizeUploadSharing: (token: string, driveFileId: string) => void;
}

function getScriptRun(): GoogleScriptRun | undefined {
  return (window as unknown as { google?: { script?: { run?: GoogleScriptRun } } }).google?.script?.run;
}

function scriptRun<T>(invoke: (run: GoogleScriptRun) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = getScriptRun();
    if (!run) {
      reject(new GasApiError("이 화면에서는 파일 업로드를 쓸 수 없습니다. 앱스크립트 배포 주소로 접속했는지 확인해주세요."));
      return;
    }
    invoke(
      run
        .withSuccessHandler((result) => resolve(result as T))
        .withFailureHandler((err) => reject(err instanceof Error ? err : new GasApiError(String(err))))
    );
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// folder를 넘기면(예: 업무번호) 드라이브의 공용 업로드 폴더 아래에 그
// 이름의 하위 폴더를 만들어 그 안에 저장한다 — 업무별로 첨부파일을
// 모아볼 수 있게 하기 위함. 안 넘기면(예: 자료실) 공용 폴더 바로 아래에 저장된다.
async function uploadFile(
  fileName: string,
  mimeType: string,
  base64Data: string,
  folder?: string
): Promise<UploadedFile> {
  const cfg = getBackendConfig();
  if (!cfg) {
    throw new GasApiError("연동된 구글 시트가 없습니다. 설정에서 Apps Script 웹앱 URL을 등록해주세요.");
  }

  const uploadUrl = await scriptRun<string>((run) =>
    run.getUploadUrl(cfg.token, fileName, mimeType, folder || "")
  );
  if (!uploadUrl) {
    throw new GasApiError("업로드 URL을 받지 못했습니다.");
  }

  const bytes = base64ToBytes(base64Data);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: bytes as unknown as BodyInit,
  });
  if (!res.ok) {
    throw new GasApiError(`드라이브 업로드 실패 (${res.status})`);
  }
  const data = (await res.json()) as { id: string; name?: string; mimeType?: string; size?: string };

  // 파일은 이미 올라갔으니, 공유 설정만 실패해도 다시 올리지 않는다 —
  // 그 경우 드라이브 링크 형식은 같지만 관리자 외에는 못 열 수 있다.
  let url = `https://drive.google.com/file/d/${data.id}/view`;
  try {
    const shared = await scriptRun<{ url: string }>((run) => run.finalizeUploadSharing(cfg.token, data.id));
    url = shared.url;
  } catch (err) {
    console.warn("업로드된 파일의 공유 설정에 실패했습니다:", err);
  }

  return {
    name: data.name || fileName,
    mimeType: data.mimeType || mimeType,
    size: data.size ? Number(data.size) : bytes.length,
    driveFileId: data.id,
    url,
  };
}

export const gas = {
  testConnection: (cfg: BackendConfig) => call<{ pong: boolean }>("ping", {}, cfg),
  bootstrap: <T>() => call<T>("bootstrap"),
  create: (entity: string, record: object) => call("create", { entity, record }),
  update: (entity: string, id: string, patch: object) => call("update", { entity, id, patch }),
  remove: (entity: string, id: string) => call("delete", { entity, id }),
  uploadFile,
  deleteFile: (driveFileId: string) => call<{ deleted: boolean }>("deleteFile", { driveFileId }),
};
