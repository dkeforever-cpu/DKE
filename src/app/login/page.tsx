"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BackendSettingsModal } from "@/components/backend-settings-modal";

export default function LoginPage() {
  const { teams, login, ready, resetDemoData, backendConfigured, backendError, retryBackend } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    const ok = await login(username.trim(), password);
    setSubmitting(false);
    if (!ok) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push("/");
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-[360px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-6 flex flex-col items-center gap-1.5">
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

        {backendConfigured && backendError ? (
          <div className="flex flex-col gap-2.5">
            <div
              className="rounded-[3px] px-2.5 py-2 text-[11px] leading-relaxed"
              style={{ background: "var(--danger-soft-bg)", color: "var(--danger)" }}
            >
              구글 시트 서버에 연결하지 못했습니다: {backendError}
            </div>
            <button
              onClick={retryBackend}
              className="h-9 rounded-[3px] text-[12.5px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              다시 시도
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="h-9 rounded-[3px] border border-[var(--border-strong)] text-[12.5px] font-semibold text-[var(--text-muted)]"
            >
              데이터 연동 설정 열기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">아이디</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="아이디를 입력하세요"
                className="h-9 rounded-[3px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                className="h-9 rounded-[3px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {error && (
              <div className="text-[10.5px]" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1.5 h-9 rounded-[3px] text-[12.5px] font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-center gap-3">
          {!backendConfigured && (
            <button
              onClick={resetDemoData}
              className="text-center text-[10px] text-[var(--text-faintest)] hover:text-[var(--text-muted)]"
            >
              테스트 데이터 초기화
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-center text-[10px] text-[var(--text-faintest)] hover:text-[var(--text-muted)]"
          >
            {backendConfigured ? "데이터 연동 설정" : "데이터 연동 설정 (구글 시트)"}
          </button>
        </div>
      </div>

      {settingsOpen && <BackendSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
