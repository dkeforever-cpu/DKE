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

// 첨부파일은 쿼리 파라미터 하나에 다 실으면 URL이 너무 길어질 수 있어서,
// base64 문자열을 작은 조각으로 나눠 순서대로 여러 번 보낸다. 서버(Drive.gs)가
// 마지막 조각을 받으면 전체를 이어붙여 실제 드라이브 업로드를 수행하고,
// 그 결과(driveFileId/url 등)를 마지막 호출의 응답으로 돌려준다.
//
// 일반 base64는 +, /, = 문자가 섞여 있어서 URL에 실을 때 encodeURIComponent가
// 그 문자들을 퍼센트 인코딩(%2B 등)해 최대 3배까지 길어진다 — 그만큼 한
// 조각에 실을 수 있는 실제 데이터가 줄어들어 조각 수(=왕복 횟수)가 늘고
// 업로드가 느려진다. URL에 그대로 써도 되는 base64url(A-Z a-z 0-9 - _)로
// 바꿔 보내면 인코딩으로 인한 길이 증가가 거의 없어, 조각 하나에 더 많은
// 데이터를 실을 수 있다.
const UPLOAD_CHUNK_SIZE = 8000;

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  const data = toBase64Url(base64Data);
  const uploadId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const total = Math.max(1, Math.ceil(data.length / UPLOAD_CHUNK_SIZE));
  let result: UploadedFile | { received: true } | undefined;
  for (let i = 0; i < total; i++) {
    const chunk = data.slice(i * UPLOAD_CHUNK_SIZE, (i + 1) * UPLOAD_CHUNK_SIZE);
    result = await call<UploadedFile | { received: true }>("uploadFileChunk", {
      uploadId,
      index: i,
      total,
      chunk,
      fileName,
      mimeType,
      folder: folder || "",
    });
  }
  return result as UploadedFile;
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
