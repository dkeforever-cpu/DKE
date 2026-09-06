"use client";

import { readFileAsBase64 } from "@/lib/download";
import { gas, hasBackendConfig } from "@/lib/gas-client";
import type { ResourceFile } from "@/lib/types";

/**
 * 파일 선택 즉시 호출한다 — 로컬에서 base64로 읽기만 하고, 아직 드라이브에
 * 올리지는 않는다 (업로드는 등록 버튼을 눌렀을 때 finalizeAttachment로).
 */
export async function readPickedFile(file: File): Promise<ResourceFile> {
  const read = await readFileAsBase64(file);
  return { name: read.name, mimeType: read.mimeType, base64: read.base64, size: read.size };
}

/**
 * 실제 등록 시점에 호출한다. 백엔드가 연동되어 있으면 base64를 구글
 * 드라이브에 업로드하고 driveFileId/url로 바꿔치기한다 (연동 안 돼 있으면
 * 로컬 저장 모드처럼 base64를 그대로 둔다). folder를 주면 그 이름의 하위
 * 폴더에 올라간다 — 업무 상세에서는 업무번호를 넘겨서 업무별로 모아둔다.
 */
export async function finalizeAttachment(picked: ResourceFile, folder?: string): Promise<ResourceFile> {
  if (!hasBackendConfig() || !picked.base64) return picked;
  const uploaded = await gas.uploadFile(picked.name, picked.mimeType, picked.base64, folder);
  return {
    name: uploaded.name,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
    driveFileId: uploaded.driveFileId,
    url: uploaded.url,
    base64: "",
  };
}
