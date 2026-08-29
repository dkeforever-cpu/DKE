"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { Selection } from "@/components/sidebar";

// Shared across the dashboard and task-detail pages so the left sidebar's
// filters/selection and its collapsed state survive navigating between
// them, instead of resetting on every page.
interface DashboardStateValue {
  teamTab: string;
  setTeamTab: (v: string) => void;
  boardId: string | null;
  setBoardId: (v: string | null) => void;
  selection: Selection;
  setSelection: (v: Selection) => void;
  view: "list" | "calendar";
  setView: (v: "list" | "calendar") => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

const DashboardStateContext = createContext<DashboardStateValue | null>(null);

export function DashboardStateProvider({ children }: { children: ReactNode }) {
  const [teamTab, setTeamTab] = useState("전체");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ type: "all" });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <DashboardStateContext.Provider
      value={{
        teamTab,
        setTeamTab,
        boardId,
        setBoardId,
        selection,
        setSelection,
        view,
        setView,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </DashboardStateContext.Provider>
  );
}

export function useDashboardState() {
  const ctx = useContext(DashboardStateContext);
  if (!ctx) throw new Error("useDashboardState must be used within DashboardStateProvider");
  return ctx;
}
