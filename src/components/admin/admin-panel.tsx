"use client";

import { ADMIN_TABS, AdminTabKey } from "@/components/sidebar";
import { GeneralSection } from "@/components/admin/general-section";
import { TeamsSection } from "@/components/admin/teams-section";
import { CentersSection } from "@/components/admin/centers-section";
import { CategoriesSection } from "@/components/admin/categories-section";
import { BoardsSection } from "@/components/admin/boards-section";
import { UsersSection } from "@/components/admin/users-section";
import { DatabaseSection } from "@/components/admin/database-section";
import { BackendSection } from "@/components/admin/backend-section";
import { ExcelSection } from "@/components/admin/excel-section";
import { LogsSection } from "@/components/admin/logs-section";

// 사이드바 하단 "관리자설정" 아코디언에서 탭을 고르면 대시보드 화면(그
// 안의 상단바·사이드바는 그대로 유지) 안에서 이 패널만 바뀐다 — 예전처럼
// 별도의 /admin 페이지로 이동해서 기존 메뉴가 사라지는 일이 없다.
export function AdminPanel({ tab }: { tab: AdminTabKey }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-[760px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-[13px] font-bold text-[var(--text)]">
          {ADMIN_TABS.find((t) => t.key === tab)?.label}
        </div>
        {tab === "general" && <GeneralSection />}
        {tab === "teams" && <TeamsSection />}
        {tab === "centers" && <CentersSection />}
        {tab === "categories" && <CategoriesSection />}
        {tab === "boards" && <BoardsSection />}
        {tab === "users" && <UsersSection />}
        {tab === "database" && <DatabaseSection />}
        {tab === "backend" && <BackendSection />}
        {tab === "excel" && <ExcelSection />}
        {tab === "logs" && <LogsSection />}
      </div>
    </div>
  );
}
