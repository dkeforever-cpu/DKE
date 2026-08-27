"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAdmin } from "@/lib/use-require-auth";
import { TopBar } from "@/components/top-bar";
import { TeamsSection } from "@/components/admin/teams-section";
import { CategoriesSection } from "@/components/admin/categories-section";
import { BoardsSection } from "@/components/admin/boards-section";
import { UsersSection } from "@/components/admin/users-section";

const TABS = [
  { key: "teams", label: "팀 관리" },
  { key: "categories", label: "카테고리 관리" },
  { key: "boards", label: "게시판/열 관리" },
  { key: "users", label: "사용자 권한 관리" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const { ready, currentUser } = useRequireAdmin();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("teams");

  if (!ready || !currentUser) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <div className="flex h-8 flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <button onClick={() => router.push("/")} className="text-[var(--text-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[10.5px] font-semibold text-[var(--text)]">관리자 설정</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[168px] flex-none flex-col border-r border-[var(--border)] bg-[var(--surface)] py-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex h-[30px] items-center px-3 text-left text-[11.5px] font-medium"
              style={{
                background: tab === t.key ? "var(--accent-soft-bg)" : "transparent",
                color: tab === t.key ? "var(--accent-soft-fg)" : "var(--text-secondary)",
                borderLeft: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-[760px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 text-[13px] font-bold text-[var(--text)]">
              {TABS.find((t) => t.key === tab)?.label}
            </div>
            {tab === "teams" && <TeamsSection />}
            {tab === "categories" && <CategoriesSection />}
            {tab === "boards" && <BoardsSection />}
            {tab === "users" && <UsersSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
