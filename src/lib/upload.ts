import { Attachment } from "./types";
import { gasClient, GasApiError } from "./gas-client";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Uploads a single file to Drive via the Apps Script backend and returns its link. */
export async function uploadAttachment(file: File): Promise<Attachment> {
  const base64Data = await fileToBase64(file);
  return gasClient.uploadFile(file.name, file.type || "application/octet-stream", base64Data);
}

/**
 * Uploads several files, resolving with the successful ones (in selection
 * order) and reporting any failures via onError so a bad file doesn't lose
 * the others.
 */
export async function uploadAttachments(
  files: File[],
  onError: (fileName: string, message: string) => void
): Promise<Attachment[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        return await uploadAttachment(file);
      } catch (err) {
        onError(file.name, err instanceof GasApiError ? err.message : "업로드에 실패했습니다.");
        return null;
      }
    })
  );
  return results.filter((r): r is Attachment => r !== null);
}
