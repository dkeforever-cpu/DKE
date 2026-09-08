"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme, ViewMode } from "@/lib/theme";
import { Avatar } from "@/components/avatar";
import { ThemeSettingsModal } from "@/components/theme-settings-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";

export function TopBar() {
  const { currentUser, teams, logout, appTitle, backendConfigured, refreshing, refreshFromBackend } = useStore();
  const { mode, toggleMode, viewMode, setViewMode } = useTheme();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const teamName = teams.find((t) => t.id === currentUser?.teamId)?.name ?? "-";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  async function handleRefresh() {
    const ok = await refreshFromBackend();
    setRefreshMsg(ok ? "새로고침 완료" : "새로고침 실패");
    window.setTimeout(() => setRefreshMsg(""), 2000);
  }

  return (
    <div className="flex h-9 flex-none items-center justify-between gap-2 overflow-hidden border-b border-[var(--border)] bg-[var(--surface)] px-3">
      <div className="flex min-w-0 flex-none items-center gap-2">
        <button onClick={() => router.push("/")} className="flex flex-none items-center gap-[7px]">
          <div className="flex h-[19px] w-[19px] flex-none items-center justify-center rounded-[4px] bg-[var(--accent)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="12" rx="1" />
              <path d="M3 11.5h18" />
              <path d="M8 7V5.2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V7" />
            </svg>
          </div>
          <div className="hidden whitespace-nowrap text-[12.5px] font-bold text-[var(--text)] sm:block">
            {appTitle}
          </div>
        </button>

        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {currentUser && (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {backendConfigured && (
            <div className="flex flex-none items-center gap-1.5">
              {refreshMsg && (
                <span className="hidden whitespace-nowrap text-[9.5px] text-[var(--text-faintest)] sm:inline">
                  {refreshMsg}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="최신 데이터로 새로고침 (연동 중에는 30초마다 자동으로도 갱신됩니다)"
                className="flex-none text-[var(--text-faint)] hover:text-[var(--text)] disabled:opacity-50"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={refreshing ? { animation: "dke-spin 0.8s linear infinite" } : undefined}
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
            </div>
          )}
          <button
            onClick={toggleMode}
            title={mode === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
            className="flex-none text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            {mode === "light" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="화면 설정 (강조색·다크모드·배율)"
            className="flex-none text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <div className="hidden h-[14px] w-px flex-none bg-[var(--border)] sm:block" />
          <div className="flex min-w-0 items-center gap-[6px]">
            <Avatar id={currentUser.id} name={currentUser.name} size={19} />
            <div className="truncate whitespace-nowrap text-[11px] font-semibold text-[var(--text)]">
              {currentUser.name}{" "}
              <span className="hidden font-normal text-[var(--text-faint)] sm:inline">
                · {teamName}
                {currentUser.isAdmin ? " · 관리자" : ""}
              </span>
            </div>
          </div>
          <button
            onClick={() => setPasswordOpen(true)}
            className="flex-none whitespace-nowrap text-[10.5px] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="flex-none whitespace-nowrap text-[10.5px] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            로그아웃
          </button>
        </div>
      )}
      {settingsOpen && <ThemeSettingsModal onClose={() => setSettingsOpen(false)} />}
      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string; title: string; icon: React.ReactNode }[] = [
  {
    value: "auto",
    label: "자동",
    title: "자동 (화면 너비에 따라 전환)",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      </svg>
    ),
  },
  {
    value: "mobile",
    label: "모바일",
    title: "모바일 화면으로 고정",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  {
    value: "desktop",
    label: "데스크탑",
    title: "데스크탑 화면으로 고정",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="13" rx="1.5" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex flex-none items-center gap-[1px] rounded-[5px] border border-[var(--border-strong)] bg-[var(--surface-alt)] p-[1px]">
      {VIEW_MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          className="flex h-[17px] items-center gap-[3px] rounded-[3px] px-1.5 text-[9.5px] font-semibold transition-colors"
          style={
            viewMode === opt.value
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { color: "var(--text-faint)" }
          }
        >
          {opt.icon}
          <span className="hidden md:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
