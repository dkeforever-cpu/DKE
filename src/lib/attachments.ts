"use client";

import { readFileAsBase64 } from "@/lib/download";
import { gas, hasBackendConfig } from "@/lib/gas-client";
import type { ResourceFile } from "@/lib/types";

/**
 * 파일 하나를 읽어서(base64), 백엔드가 연동되어 있으면 구글 드라이브에
 * 실제로 업로드까지 한다 (안 되어 있으면 로컬 저장 모드처럼 base64를
 * 그대로 들고 있는다). folder를 주면 그 이름의 하위 폴더에 올라간다 —
 * 업무 상세에서 올릴 때는 업무번호를 넘겨서 업무별로 모아둔다.
 */
export async function uploadPickedFile(file: File, folder?: string): Promise<ResourceFile> {
  const read = await readFileAsBase64(file);
  if (hasBackendConfig()) {
    const uploaded = await gas.uploadFile(read.name, read.mimeType, read.base64, folder);
    return {
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      driveFileId: uploaded.driveFileId,
      url: uploaded.url,
      base64: "",
    };
  }
  return { name: read.name, mimeType: read.mimeType, base64: read.base64, size: read.size };
}
