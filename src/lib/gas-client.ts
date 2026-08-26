"use client";

// Thin client for the Google Apps Script backend (see /apps-script). Every
// call is a POST to the deployed Web App URL, sent as text/plain so the
// browser treats it as a "simple request" and skips the CORS preflight
// (OPTIONS) that Apps Script can't answer. The body is still `{action,
// payload}` JSON; Code.gs parses it manually on the server side.

const URL_STORAGE_KEY = "dke-gas-url";

export function getApiUrl(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(URL_STORAGE_KEY) ?? "";
}

export function setApiUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(URL_STORAGE_KEY, url.trim());
}

export function hasApiUrl(): boolean {
  return getApiUrl().length > 0;
}

export class GasApiError extends Error {}

async function call<T>(action: string, payload: unknown = {}): Promise<T> {
  const url = getApiUrl();
  if (!url) {
    throw new GasApiError(
      "연동된 구글 시트가 없습니다. 설정에서 Apps Script 웹앱 URL을 등록해주세요."
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    throw new GasApiError(
      "구글 시트 서버에 연결할 수 없습니다. 인터넷 연결과 웹앱 URL을 확인해주세요."
    );
  }

  if (!res.ok) {
    throw new GasApiError(`서버 오류 (${res.status}): 잠시 후 다시 시도해주세요.`);
  }

  let body: { ok: boolean; data?: T; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new GasApiError("서버 응답을 해석할 수 없습니다.");
  }

  if (!body.ok) {
    throw new GasApiError(body.error || "알 수 없는 오류가 발생했습니다.");
  }
  return body.data as T;
}

export const gasClient = {
  call,

  uploadFile(fileName: string, mimeType: string, base64Data: string) {
    return call<{ name: string; url: string }>("uploadFile", {
      fileName,
      mimeType,
      base64Data,
    });
  },
};
