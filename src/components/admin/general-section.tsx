"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { readFileAsBase64 } from "@/lib/download";

// 구글 시트 한 셀에 저장 가능한 글자 수(약 5만자) 안에 여유 있게 들어가도록
// 아이콘 원본 파일 크기를 제한한다(base64로 바꾸면 원본의 약 1.37배로
// 커진다) — 로고/아이콘 용도라 이 정도면 충분히 넉넉하다. (드라이브에
// 업로드해 링크만 저장하는 방식도 시도해봤으나, 구글 드라이브의 공개
// 이미지 링크가 <img> 태그로 안정적으로 뜨지 않아 도로 이 방식으로
// 되돌렸다 — apps-script/CHECKPOINT.md 참고.)
const MAX_ICON_BYTES = 30 * 1024;

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

  function handleSaveIcon() {
    if (!iconPreview) return;
    updateAppIcon(iconPreview);
    setIconPreview(null);
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
              className="h-7 flex-none rounded-[2px] px-3 text-[11px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              저장
            </button>
          )}

          {(appIconUrl || iconPreview) && (
            <button
              onClick={handleResetIcon}
              className="h-7 flex-none rounded-[2px] border px-2.5 text-[10.5px]"
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
