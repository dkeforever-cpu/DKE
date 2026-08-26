"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/avatar";
import { SettingsModal } from "@/components/settings-modal";

export function TopBar() {
  const { currentUser, logout, syncError, dismissSyncError } = useStore();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex flex-none flex-col">
    <div className="flex h-[52px] flex-none items-center justify-between border-b border-[#e3e5e9] bg-white px-5">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-[9px]"
      >
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border-[1.5px] border-[#23262e]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#23262e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="12" rx="1" />
            <path d="M3 11.5h18" />
            <path d="M8 7V5.2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V7" />
          </svg>
        </div>
        <div className="text-[14px] font-bold text-[#1a1d24]">물류센터 업무관리</div>
      </button>

      {currentUser && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSettingsOpen(true)}
            title="데이터 연동 설정"
            className="text-[#5b6068] hover:text-[#1a1d24]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5b6068" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <div className="h-[18px] w-px bg-[#e3e5e9]" />
          <div className="flex items-center gap-[7px]">
            <Avatar id={currentUser.id} name={currentUser.name} size={24} />
            <div className="text-[12.5px] font-semibold text-[#1a1d24]">
              {currentUser.name}{" "}
              <span className="font-normal text-[#8a8f99]">
                · {currentUser.dept}
                {currentUser.isAdmin ? " · 관리자" : ""}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11.5px] text-[#8a8f99] hover:text-[#1a1d24]"
          >
            로그아웃
          </button>
        </div>
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
    {syncError && (
      <div className="flex items-center justify-between gap-3 border-b border-[#f3c9c7] bg-[#fff5f5] px-5 py-1.5 text-[11.5px] text-[#c23636]">
        <span>{syncError}</span>
        <button onClick={dismissSyncError} className="font-semibold hover:underline">
          닫기
        </button>
      </div>
    )}
    </div>
  );
}
