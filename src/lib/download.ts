// Real file save via the Artifact runtime's `downloads` capability
// (window.claude.downloads.save) — a plain <a download> is inert inside the
// sandboxed viewer this app is published in, so this is the only path that
// actually saves a file to the viewer's device.

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

const DOWNLOAD_ERROR_MESSAGES: Record<string, string> = {
  rejected_extension: "이 파일 형식은 이 화면에서 다운로드를 지원하지 않습니다.",
  extension_not_enabled: "이 파일 형식은 현재 화면에서 다운로드가 꺼져 있습니다.",
  too_large: "파일이 너무 커서 다운로드할 수 없습니다.",
  declined: "다운로드를 취소했습니다.",
  rate_limited: "다운로드 요청이 많습니다. 잠시 후 다시 시도해주세요.",
  bad_request: "다운로드 요청에 문제가 있습니다.",
};

export async function downloadResourceFile(
  name: string,
  base64: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!base64) {
    return {
      ok: false,
      message: "이 파일은 예전 방식으로 저장되어 실제 내용이 없습니다. 다시 업로드해주세요.",
    };
  }
  const claude = (window as unknown as { claude?: { downloads?: { save: (req: { filename: string; data: Uint8Array }) => Promise<{ status: "saved" }> } } }).claude;
  if (!claude?.downloads) {
    return { ok: false, message: "이 화면에서는 파일 다운로드 기능을 사용할 수 없습니다." };
  }
  try {
    const bytes = base64ToBytes(base64);
    await claude.downloads.save({ filename: name, data: bytes });
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    return { ok: false, message: (code && DOWNLOAD_ERROR_MESSAGES[code]) || "다운로드에 실패했습니다." };
  }
}
