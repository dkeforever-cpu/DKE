"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Avatar } from "@/components/avatar";
import { ThemeSettingsModal } from "@/components/theme-settings-modal";

export function TopBar() {
  const { currentUser, teams, logout } = useStore();
  const { mode, toggleMode } = useTheme();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const teamName = teams.find((t) => t.id === currentUser?.teamId)?.name ?? "-";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex h-9 flex-none items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3">
      <button onClick={() => router.push("/")} className="flex items-center gap-[7px]">
        <div className="flex h-[19px] w-[19px] items-center justify-center rounded-[4px] bg-[var(--accent)]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="12" rx="1" />
            <path d="M3 11.5h18" />
            <path d="M8 7V5.2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V7" />
          </svg>
        </div>
        <div className="text-[12.5px] font-bold text-[var(--text)]">물류센터 업무관리</div>
      </button>

      {currentUser && (
        <div className="flex items-center gap-3">
          {currentUser.isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              title="관리자 설정"
              className="text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10M18 20V4M6 20v-4" />
              </svg>
            </button>
          )}
          <button
            onClick={toggleMode}
            title={mode === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
            className="text-[var(--text-faint)] hover:text-[var(--text)]"
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
            className="text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <div className="h-[14px] w-px bg-[var(--border)]" />
          <div className="flex items-center gap-[6px]">
            <Avatar id={currentUser.id} name={currentUser.name} size={19} />
            <div className="text-[11px] font-semibold text-[var(--text)]">
              {currentUser.name}{" "}
              <span className="font-normal text-[var(--text-faint)]">
                · {teamName}
                {currentUser.isAdmin ? " · 관리자" : ""}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[10.5px] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            로그아웃
          </button>
        </div>
      )}
      {settingsOpen && <ThemeSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
