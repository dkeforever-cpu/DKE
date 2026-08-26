"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/avatar";

export default function LoginPage() {
  const { users, login, ready, resetDemoData } = useStore();
  const router = useRouter();

  function handleLogin(userId: string) {
    login(userId);
    router.push("/");
  }

  if (!ready) return null;

  const mgmt = users.filter((u) => u.dept === "관리팀");
  const fin = users.filter((u) => u.dept === "재경팀");

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#eef0f3] p-6">
      <div className="w-full max-w-[520px] rounded-[10px] border border-[#d7dbe0] bg-white p-9">
        <div className="mb-7 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-[9px] border-[1.5px] border-[#23262e]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#23262e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="12" rx="1" />
              <path d="M3 11.5h18" />
              <path d="M8 7V5.2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V7" />
            </svg>
          </div>
          <div className="text-center text-[17px] font-bold tracking-tight">
            물류센터 업무관리 시스템
          </div>
          <div className="text-[12px] text-[#8a8f99]">관리팀 · 재경팀 전용</div>
        </div>

        <div className="mb-2 text-[12px] font-semibold text-[#565b66]">
          테스트 계정을 선택하세요
        </div>
        <div className="mb-5 text-[11px] leading-relaxed text-[#a6abb5]">
          실제 서비스에서는 아이디/비밀번호로 로그인합니다. 지금은 프로토타입 테스트를 위해
          계정을 선택하면 바로 로그인됩니다.
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-[10.5px] font-bold tracking-wide text-[#a6abb5]">
              관리팀
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mgmt.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleLogin(u.id)}
                  className="flex items-center gap-2 rounded-md border border-[#d7dbe0] px-3 py-2 text-left text-[12.5px] font-medium text-[#1a1d24] hover:border-[#3355d6] hover:bg-[#f7f9ff]"
                >
                  <Avatar id={u.id} name={u.name} size={22} />
                  {u.name}
                  {u.isAdmin && (
                    <span className="ml-auto rounded bg-[#f1f2f4] px-1.5 py-0.5 text-[9px] font-bold text-[#5b6068]">
                      관리자
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10.5px] font-bold tracking-wide text-[#a6abb5]">
              재경팀
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fin.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleLogin(u.id)}
                  className="flex items-center gap-2 rounded-md border border-[#d7dbe0] px-3 py-2 text-left text-[12.5px] font-medium text-[#1a1d24] hover:border-[#3355d6] hover:bg-[#f7f9ff]"
                >
                  <Avatar id={u.id} name={u.name} size={22} />
                  {u.name}
                  {u.isAdmin && (
                    <span className="ml-auto rounded bg-[#f1f2f4] px-1.5 py-0.5 text-[9px] font-bold text-[#5b6068]">
                      관리자
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={resetDemoData}
          className="mt-6 w-full text-center text-[11px] text-[#a6abb5] hover:text-[#5b6068]"
        >
          테스트 데이터 초기화
        </button>
      </div>
    </div>
  );
}
