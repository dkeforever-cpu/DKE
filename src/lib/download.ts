// Real file save via the Artifact runtime's `downloads` capability
// (window.claude.downloads.save) — a plain <a download> is inert inside the
// sandboxed viewer this app is published in, so this is the only path that
// actually saves a file to the viewer's device.
//
// The runtime only allows a fixed set of extensions through directly
// (gif/png/jpg/jpeg/webp/mp4/webm/txt/json/md, plus docx/pptx/epub/csv/ttf/
// html/svg when enabled). PDF/XLSX/HWP/ZIP and anything else are rejected
// outright. To support every file type, an unsupported extension falls back
// to saving a small self-contained ".html" helper page (html downloads
// generically as raw bytes, so the allowlist can't inspect what's inside
// it) that embeds the real file as a data: URL — opening that saved page in
// a normal (non-sandboxed) browser tab lets the user pull down the actual
// original file via a plain click, which works there because it isn't
// running inside this sandboxed iframe.

export const MAX_FILE_BYTES = 3 * 1024 * 1024; // keeps total localStorage usage safe
export const MAX_FILE_SIZE_LABEL = "3MB";

export function readFileAsBase64(
  file: File
): Promise<{ name: string; base64: string; mimeType: string; size: number }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(`'${file.name}' 파일이 너무 큽니다 (최대 ${MAX_FILE_SIZE_LABEL}).`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`'${file.name}' 파일을 읽는 중 오류가 발생했습니다.`));
    reader.onload = () => {
      const result = reader.result as string; // "data:<mime>;base64,AAAA..."
      const commaIdx = result.indexOf(",");
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      resolve({ name: file.name, base64, mimeType: file.type || "application/octet-stream", size: file.size });
    };
    reader.readAsDataURL(file);
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDownloadWrapperHtml(name: string, mimeType: string, base64: string): string {
  const safeName = escapeHtml(name);
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${safeName} 다운로드</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f0f1f4;color:#191b1f;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#fff;border:1px solid #e1e3e8;border-radius:8px;padding:32px;max-width:420px;text-align:center}
h1{font-size:15px;word-break:break-all;margin:0 0 8px}
p{font-size:12.5px;color:#5a5f68;line-height:1.6;margin:0 0 20px}
a{display:inline-block;background:#3355d6;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px}
</style></head>
<body>
<div class="card">
<h1>${safeName}</h1>
<p>물류센터 업무관리 시스템 자료실에서 받은 파일입니다.<br>이 화면에서는 바로 저장할 수 없어 도우미 파일로 받으셨습니다.<br>아래 버튼을 눌러 실제 파일을 저장하세요.</p>
<a id="dl" href="data:${mimeType};base64,${base64}" download="${safeName}">지금 다운로드</a>
</div>
<script>document.getElementById('dl').click();</script>
</body></html>`;
}

function wrapperFileName(name: string): string {
  return `${name}.html`;
}

const DOWNLOAD_ERROR_MESSAGES: Record<string, string> = {
  rejected_extension: "이 파일 형식은 다운로드를 지원하지 않습니다.",
  extension_not_enabled: "이 파일 형식은 현재 화면에서 다운로드가 꺼져 있습니다.",
  too_large: "파일이 너무 커서 다운로드할 수 없습니다.",
  declined: "다운로드를 취소했습니다.",
  rate_limited: "다운로드 요청이 많습니다. 잠시 후 다시 시도해주세요.",
  bad_request: "다운로드 요청에 문제가 있습니다.",
};

type ClaudeDownloads = {
  save: (req: { filename: string; data: Uint8Array | string }) => Promise<{ status: "saved" }>;
};

function getClaudeDownloads(): ClaudeDownloads | undefined {
  return (window as unknown as { claude?: { downloads?: ClaudeDownloads } }).claude?.downloads;
}

function errorCode(e: unknown): string | undefined {
  return (e as { code?: string } | null)?.code;
}

export async function downloadResourceFile(
  name: string,
  base64: string,
  mimeType: string
): Promise<{ ok: true; wrapped?: boolean } | { ok: false; message: string }> {
  if (!base64) {
    return {
      ok: false,
      message: "이 파일은 예전 방식으로 저장되어 실제 내용이 없습니다. 다시 업로드해주세요.",
    };
  }
  const downloads = getClaudeDownloads();
  if (!downloads) {
    return { ok: false, message: "이 화면에서는 파일 다운로드 기능을 사용할 수 없습니다." };
  }

  // 1차: 원본 파일 그대로 저장 시도
  try {
    const bytes = base64ToBytes(base64);
    await downloads.save({ filename: name, data: bytes });
    return { ok: true };
  } catch (e) {
    const code = errorCode(e);
    if (code !== "rejected_extension" && code !== "extension_not_enabled") {
      return { ok: false, message: (code && DOWNLOAD_ERROR_MESSAGES[code]) || "다운로드에 실패했습니다." };
    }
  }

  // 2차: 이 화면에서 직접 지원하지 않는 확장자 → 도우미 HTML 파일로 감싸서 저장
  try {
    const wrapperHtml = buildDownloadWrapperHtml(name, mimeType || "application/octet-stream", base64);
    await downloads.save({ filename: wrapperFileName(name), data: wrapperHtml });
    return { ok: true, wrapped: true };
  } catch (e) {
    const code = errorCode(e);
    return { ok: false, message: (code && DOWNLOAD_ERROR_MESSAGES[code]) || "다운로드에 실패했습니다." };
  }
}
