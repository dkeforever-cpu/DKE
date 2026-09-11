"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { readFileAsBase64 } from "@/lib/download";
import { gas, hasBackendConfig } from "@/lib/gas-client";

// 300KB까지 허용한다. 백엔드 연동 모드에서는 드라이브에 파일로 올리고
// "drive:<id>"만 시트에 저장하므로 시트 셀 글자 수 제한과 무관하다.
// 로컬 저장 모드(백엔드 미연동)에서는 드라이브가 없어 data URI를 그대로
// 저장하는데, 이건 브라우저 localStorage라 마찬가지로 문제없다.
const MAX_ICON_BYTES = 300 * 1024;

export function GeneralSection() {
  const { appTitle, updateAppTitle, appIconUrl, updateAppIcon } = useStore();
  const [draft, setDraft] = useState(appTitle);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconError, setIconError] = useState("");
  const [iconBusy, setIconBusy] = useState(false);

  function handleSaveTitle() {
    if (!draft.trim() || draft.trim() === appTitle) return;
    updateAppTitle(draft.trim());
  }

  async function handleIconPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIconError("");
    if (!file.type.startsWith("image/")) {
      setIconError("이미지 파일만 등록할 수 있습니다.");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      setIconError(`아이콘 파일이 너무 큽니다 (최대 ${Math.round(MAX_ICON_BYTES / 1024)}KB). 더 작은 이미지로 시도해주세요.`);
      return;
    }
    setIconBusy(true);
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      setIconPreview(`data:${mimeType};base64,${base64}`);
    } catch (err) {
      setIconError(err instanceof Error ? err.message : "파일을 읽지 못했습니다.");
    } finally {
      setIconBusy(false);
    }
  }

  async function handleSaveIcon() {
    if (!iconPreview) return;
    const match = iconPreview.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return;
    const [, mimeType, base64] = match;
    setIconBusy(true);
    setIconError("");
    try {
      if (hasBackendConfig()) {
        const uploaded = await gas.uploadFile("app-icon", mimeType, base64, "app-icon");
        updateAppIcon(`drive:${uploaded.driveFileId}`);
      } else {
        updateAppIcon(iconPreview);
      }
      setIconPreview(null);
    } catch (err) {
      setIconError(err instanceof Error ? err.message : "아이콘 업로드에 실패했습니다.");
    } finally {
      setIconBusy(false);
    }
  }

  function handleResetIcon() {
    setIconPreview(null);
    setIconError("");
    updateAppIcon("");
  }

  const displayedIcon = iconPreview ?? appIconUrl;

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div className="flex flex-col gap-3">
        <div className="text-[11px] text-[var(--text-faint)]">
          로그인 화면과 상단바에 표시되는 프로그램 이름을 바꿀 수 있습니다.
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">프로그램 제목</label>
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              placeholder="예: 물류센터 업무관리 시스템"
              className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleSaveTitle}
              disabled={!draft.trim() || draft.trim() === appTitle}
              className="h-7 flex-none rounded-[2px] px-3 text-[11px] font-semibold disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              저장
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--divider)]" />

      <div className="flex flex-col gap-3">
        <div className="text-[11px] text-[var(--text-faint)]">
          로그인 화면과 상단바 좌측에 표시되는 아이콘(로고)을 이미지 파일로 바꿀 수 있습니다. 등록하지
          않으면 기본 아이콘이 표시됩니다.
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex flex-none items-center justify-center overflow-hidden rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface-alt)]"
            style={{ width: 40, height: 40 }}
          >
            {displayedIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayedIcon}
                alt="프로그램 아이콘"
                className="h-full w-full"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="12" rx="1" />
                <path d="M3 11.5h18" />
                <path d="M8 7V5.2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V7" />
              </svg>
            )}
          </div>

          <label className="flex h-7 cursor-pointer items-center rounded-[2px] border border-[var(--border-strong)] px-2.5 text-[10.5px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
            {iconBusy ? "읽는 중..." : "파일 선택"}
            <input type="file" accept="image/*" className="hidden" onChange={handleIconPick} disabled={iconBusy} />
          </label>

          {iconPreview && (
            <button
              onClick={handleSaveIcon}
              disabled={iconBusy}
              className="h-7 flex-none rounded-[2px] px-3 text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {iconBusy ? "저장 중..." : "저장"}
            </button>
          )}

          {(appIconUrl || iconPreview) && (
            <button
              onClick={handleResetIcon}
              disabled={iconBusy}
              className="h-7 flex-none rounded-[2px] border px-2.5 text-[10.5px] disabled:opacity-50"
              style={{ borderColor: "var(--danger-soft-bg)", color: "var(--danger)" }}
            >
              기본 아이콘으로 되돌리기
            </button>
          )}
        </div>

        {iconError && (
          <div className="text-[10.5px]" style={{ color: "var(--danger)" }}>
            {iconError}
          </div>
        )}
      </div>
    </div>
  );
}
