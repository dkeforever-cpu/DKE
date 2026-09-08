"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { getBackendConfig } from "@/lib/gas-client";
import { BackendSettingsModal } from "@/components/backend-settings-modal";

export function BackendSection() {
  const { backendConfigured, syncError, dismissSyncError } = useStore();
  const [open, setOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const config = getBackendConfig();
  const inviteLink = config ? `${config.url}?t=${config.token}` : "";

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyMsg("복사되었습니다.");
    } catch {
      setCopyMsg("자동 복사가 막혀 있어요 — 아래 링크를 직접 선택해 복사해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        구글 시트를 데이터베이스로, 구글 드라이브를 파일 저장소로 쓰도록 연동합니다. 연동하면
        팀 전체가 같은 데이터를 실시간으로 공유하고, 이 브라우저의 localStorage에만 있던
        데이터는 더 이상 쓰이지 않습니다. 설치 방법은 별도 설치 매뉴얼을 참고하세요.
      </div>

      <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2.5">
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: backendConfigured ? "var(--success)" : "var(--text-disabled)" }}
        />
        <div className="flex-1">
          <div className="text-[11.5px] font-semibold text-[var(--text)]">
            {backendConfigured ? "연동됨" : "연동 안 됨 (로컬 저장 모드)"}
          </div>
          {backendConfigured && config && (
            <div className="truncate text-[10px] text-[var(--text-faintest)]" title={config.url}>
              {config.url}
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-7 flex-none rounded-[2px] border border-[var(--border-strong)] px-2.5 text-[10.5px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {backendConfigured ? "설정 다시 열기" : "지금 연동하기"}
        </button>
      </div>

      {backendConfigured && config && (
        <div className="flex flex-col gap-1.5 border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2.5">
          <div className="text-[11.5px] font-semibold text-[var(--text)]">초대 링크</div>
          <div className="text-[10px] leading-relaxed text-[var(--text-faintest)]">
            이 링크로 접속하면 API 토큰을 직접 입력하지 않아도 자동으로 연동됩니다. 팀원에게 이
            링크를 보내주세요. 토큰이 그대로 담겨있는 링크라, 아무나 접근할 수 없는 곳(사내
            메신저 등)으로만 전달해주세요.
          </div>
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--text)] outline-none"
            />
            <button
              onClick={copyInviteLink}
              className="h-7 flex-none rounded-[2px] px-2.5 text-[10.5px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              링크 복사
            </button>
          </div>
          {copyMsg && (
            <div className="text-[10px]" style={{ color: "var(--success)" }}>
              {copyMsg}
            </div>
          )}
        </div>
      )}

      {syncError && (
        <div
          className="flex items-start justify-between gap-2 rounded-[2px] px-2.5 py-2 text-[10.5px]"
          style={{ background: "var(--danger-soft-bg)", color: "var(--danger)" }}
        >
          <span>동기화 실패: {syncError} (화면에는 반영되었지만 구글 시트에는 저장되지 않았을 수 있습니다)</span>
          <button onClick={dismissSyncError} className="flex-none font-semibold">
            닫기
          </button>
        </div>
      )}

      {open && <BackendSettingsModal onClose={() => setOpen(false)} />}
    </div>
  );
}
