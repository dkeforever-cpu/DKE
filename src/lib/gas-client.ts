"use client";

// Google Apps Script 백엔드(../../apps-script)와 통신하는 얇은 클라이언트.
// 모든 요청은 배포된 웹 앱 URL로 보내는 POST이며, 브라우저가 CORS
// 프리플라이트(OPTIONS)를 만들지 않도록 Content-Type: text/plain으로
// 보낸다 (Apps Script 웹 앱은 프리플라이트에 응답하지 못한다). 본문은
// 그래도 JSON 문자열이고, 서버(Code.gs)가 수동으로 파싱한다.

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

export class GasApiError extends Error {}

async function call<T>(action: string, payload: unknown = {}, configOverride?: BackendConfig): Promise<T> {
  const cfg = configOverride ?? getBackendConfig();
  if (!cfg) {
    throw new GasApiError("연동된 구글 시트가 없습니다. 설정에서 Apps Script 웹앱 URL을 등록해주세요.");
  }

  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: cfg.token, payload }),
    });
  } catch {
    throw new GasApiError("구글 시트 서버에 연결할 수 없습니다. 인터넷 연결과 웹앱 URL을 확인해주세요.");
  }

  if (!res.ok) {
    throw new GasApiError(`서버 오류 (${res.status}): 잠시 후 다시 시도해주세요.`);
  }

  let body: { ok: boolean; data?: T; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new GasApiError("서버 응답을 해석할 수 없습니다. 웹앱 URL이 올바른지 확인해주세요.");
  }

  if (!body.ok) {
    throw new GasApiError(body.error || "알 수 없는 오류가 발생했습니다.");
  }
  return body.data as T;
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  url: string;
}

export const gas = {
  testConnection: (cfg: BackendConfig) => call<{ pong: boolean }>("ping", {}, cfg),
  bootstrap: <T>() => call<T>("bootstrap"),
  create: (entity: string, record: object) => call("create", { entity, record }),
  update: (entity: string, id: string, patch: object) => call("update", { entity, id, patch }),
  remove: (entity: string, id: string) => call("delete", { entity, id }),
  uploadFile: (fileName: string, mimeType: string, base64Data: string) =>
    call<UploadedFile>("uploadFile", { fileName, mimeType, base64Data }),
  deleteFile: (driveFileId: string) => call<{ deleted: boolean }>("deleteFile", { driveFileId }),
};
