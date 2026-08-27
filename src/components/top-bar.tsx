"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/avatar";

export function TopBar() {
  const { currentUser, logout } = useStore();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
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
    </div>
  );
}
