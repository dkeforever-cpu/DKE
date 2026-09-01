"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useConfirmDialog } from "@/lib/confirm-dialog";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { FileIcon } from "@/components/comment-thread";
import { downloadResourceFile } from "@/lib/download";
import { formatDateTime } from "@/lib/format";

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, currentUser } = useRequireAuth();
  const { resources, deleteResource, getUser } = useStore();
  const { confirm } = useConfirmDialog();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ file: string; message: string } | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{ file: string; message: string } | null>(null);

  if (!ready || !currentUser) return null;

  const resource = resources.find((r) => r.id === id);

  if (!resource) {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="text-[12px] text-[var(--text-faint)]">자료를 찾을 수 없습니다.</div>
          <button
            onClick={() => router.push("/resources")}
            className="rounded-[3px] px-3.5 py-1.5 text-[11.5px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            자료실로 돌아가기
          </button>
        </div>
      </AppShell>
    );
  }

  const uploader = getUser(resource.uploadedBy);
  const canDelete = currentUser.id === resource.uploadedBy || currentUser.isAdmin;

  async function handleDownload(fileName: string, base64: string, mimeType: string) {
    setDownloading(fileName);
    setDownloadError(null);
    setDownloadNotice(null);
    const result = await downloadResourceFile(fileName, base64, mimeType);
    setDownloading(null);
    if (!result.ok) {
      setDownloadError({ file: fileName, message: result.message });
    } else if (result.wrapped) {
      setDownloadNotice({
        file: fileName,
        message: `이 형식은 바로 저장할 수 없어 도우미 파일(${fileName}.html)로 받았습니다. 받은 파일을 열어 '지금 다운로드'를 누르면 실제 파일이 저장됩니다.`,
      });
    }
  }

  async function handleDelete() {
    if (!resource) return;
    if (await confirm("이 자료를 삭제할까요?")) {
      deleteResource(resource.id);
      router.push("/resources");
    }
  }

  return (
    <AppShell>
      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <button onClick={() => router.push("/resources")} className="text-[var(--text-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[10.5px] text-[var(--text-faint)]">자료실</span>
        <span className="text-[10.5px] text-[var(--text-disabled)]">/</span>
        <span className="text-[10.5px] font-semibold text-[var(--text)]">자료 상세</span>
      </div>

      <div className="flex flex-1 justify-center overflow-y-auto p-3">
        <div className="flex w-full max-w-[680px] flex-col gap-2">
          <div className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <span
                  className="w-fit rounded-[3px] px-1.5 py-0.5 text-[9.5px] font-bold"
                  style={{ background: "var(--neutral-soft-bg)", color: "var(--neutral-soft-fg)" }}
                >
                  {resource.category}
                </span>
                <div className="text-[16px] font-bold leading-snug text-[var(--text)]">{resource.title}</div>
                <div className="flex items-center gap-1.5">
                  <Avatar id={resource.uploadedBy} name={uploader?.name ?? "?"} size={18} />
                  <span className="text-[10.5px] text-[var(--text-faint)]">
                    {uploader?.name ?? "알 수 없음"} · {formatDateTime(resource.createdAt)}
                  </span>
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex h-6 flex-none items-center gap-1 rounded-[3px] border px-2.5 text-[10.5px]"
                  style={{ borderColor: "var(--danger-soft-bg)", background: "var(--danger-soft-bg)", color: "var(--danger)" }}
                >
                  삭제
                </button>
              )}
            </div>

            {resource.description && (
              <>
                <div className="h-px bg-[var(--divider)]" />
                <div className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
                  {resource.description}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5 border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-[11px] font-bold text-[var(--text)]">첨부 파일 ({resource.files.length})</div>
            {resource.files.length === 0 ? (
              <div className="text-[10.5px] text-[var(--text-faintest)]">첨부된 파일이 없습니다.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {resource.files.map((f, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 border border-[var(--divider)] px-2.5 py-1.5">
                      <FileIcon />
                      <span className="flex-1 truncate text-[11px] text-[var(--text)]">{f.name}</span>
                      <span className="flex-none text-[9.5px] text-[var(--text-faintest)]">
                        {(f.size / 1024).toFixed(0)}KB
                      </span>
                      <button
                        onClick={() => handleDownload(f.name, f.base64, f.mimeType)}
                        disabled={downloading === f.name}
                        className="flex-none rounded-[2px] px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50"
                        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                      >
                        {downloading === f.name ? "다운로드 중..." : "다운로드"}
                      </button>
                    </div>
                    {downloadError?.file === f.name && (
                      <div className="px-1 text-[9.5px]" style={{ color: "var(--danger)" }}>
                        {downloadError.message}
                      </div>
                    )}
                    {downloadNotice?.file === f.name && (
                      <div className="px-1 text-[9.5px]" style={{ color: "var(--accent)" }}>
                        {downloadNotice.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
