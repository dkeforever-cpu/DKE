"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/avatar";

export default function LoginPage() {
  const { users, teams, login, ready, resetDemoData } = useStore();
  const router = useRouter();

  function handleLogin(userId: string) {
    login(userId);
    router.push("/");
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-[440px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-5 flex flex-col items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[4px]" style={{ background: "var(--accent)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="12" rx="1" />
              <path d="M3 11.5h18" />
              <path d="M8 7V5.2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V7" />
            </svg>
          </div>
          <div className="text-center text-[14.5px] font-bold tracking-tight text-[var(--text)]">
            물류센터 업무관리 시스템
          </div>
          <div className="text-[10.5px] text-[var(--text-faint)]">
            {teams.map((t) => t.name).join(" · ")} 전용
          </div>
        </div>

        <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
          테스트 계정을 선택하세요
        </div>
        <div className="mb-4 text-[10px] leading-relaxed text-[var(--text-faintest)]">
          실제 서비스에서는 아이디/비밀번호로 로그인합니다. 지금은 프로토타입 테스트를 위해
          계정을 선택하면 바로 로그인됩니다.
        </div>

        <div className="flex flex-col gap-3">
          {teams.map((team) => {
            const members = users.filter((u) => u.teamId === team.id);
            if (members.length === 0) return null;
            return (
              <div key={team.id}>
                <div className="mb-1.5 text-[9.5px] font-bold tracking-wide text-[var(--text-faintest)]">
                  {team.name}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {members.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleLogin(u.id)}
                      className="flex items-center gap-1.5 border border-[var(--border-strong)] px-2.5 py-1.5 text-left text-[11px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
                      style={{ background: "var(--surface)" }}
                    >
                      <Avatar id={u.id} name={u.name} size={19} />
                      {u.name}
                      {u.isAdmin && (
                        <span
                          className="ml-auto rounded-[3px] px-1 py-[1px] text-[8.5px] font-bold"
                          style={{ background: "var(--neutral-soft-bg)", color: "var(--neutral-soft-fg)" }}
                        >
                          관리자
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={resetDemoData}
          className="mt-5 w-full text-center text-[10px] text-[var(--text-faintest)] hover:text-[var(--text-muted)]"
        >
          테스트 데이터 초기화
        </button>
      </div>
    </div>
  );
}
