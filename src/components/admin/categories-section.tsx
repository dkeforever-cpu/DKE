"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";

export function CategoriesSection() {
  const { teams, categoriesByTeam } = useStore();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const activeTeamId = teams.some((t) => t.id === teamId) ? teamId : teams[0]?.id ?? "";
  const tree = categoriesByTeam[activeTeamId] ?? [];

  // 대분류 행의 펼침 상태 — 키가 없으면 기본값(펼침)으로 취급하고, "전체
  // 펼치기"는 맵을 비워 전부 기본값(펼침)으로 되돌린다.
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const isExpanded = (id: string) => expandedMap[id] ?? true;
  const toggleExpanded = (id: string) =>
    setExpandedMap((prev) => ({ ...prev, [id]: !isExpanded(id) }));

  function expandAll() {
    setExpandedMap({});
  }
  function collapseAll() {
    const next: Record<string, boolean> = {};
    tree.forEach((l) => {
      next[l.id] = false;
    });
    setExpandedMap(next);
  }

  if (teams.length === 0) {
    return <div className="text-[11px] text-[var(--text-faint)]">먼저 팀을 추가해주세요.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        팀별로 대분류 · 중분류를 추가·수정·삭제할 수 있습니다. 업무 등록 화면의 분류 선택지에
        바로 반영되며, 대분류·중분류 옆의 코드는 업무번호(예: A_01_260906_01)를 만드는 데
        쓰입니다.
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold text-[var(--text-muted)]">팀</span>
          <select
            value={activeTeamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)]"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            전체 펼치기
          </button>
          <button
            onClick={collapseAll}
            className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            전체 접기
          </button>
        </div>
      </div>

      <div className="flex flex-col border border-[var(--border)]">
        {tree.length === 0 && (
          <div className="px-2.5 py-2 text-[10.5px] text-[var(--text-faintest)]">
            등록된 대분류가 없습니다.
          </div>
        )}
        {tree.map((large) => (
          <LargeRow
            key={large.id}
            teamId={activeTeamId}
            large={large}
            expanded={isExpanded(large.id)}
            onToggleExpanded={() => toggleExpanded(large.id)}
          />
        ))}
        <AddLargeRow teamId={activeTeamId} />
      </div>
    </div>
  );
}

function AddLargeRow({ teamId }: { teamId: string }) {
  const { addCategoryLarge } = useStore();
  const [value, setValue] = useState("");
  function confirm() {
    if (!value.trim()) return;
    addCategoryLarge(teamId, value.trim());
    setValue("");
  }
  return (
    <div className="flex items-center gap-1.5 border-b border-[var(--divider)] px-2.5 py-1.5 last:border-0">
      <span className="w-3 flex-none" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        placeholder="새 대분류"
        className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
      <button
        onClick={confirm}
        className="h-6 flex-none rounded-[2px] px-2 text-[10px] font-semibold"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        추가
      </button>
    </div>
  );
}

function LargeRow({
  teamId,
  large,
  expanded,
  onToggleExpanded,
}: {
  teamId: string;
  large: {
    id: string;
    name: string;
    code: string;
    children: { id: string; name: string; code: string }[];
  };
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { renameCategoryLarge, deleteCategoryLarge, addCategoryMedium } = useStore();
  const { confirm } = useConfirmDialog();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(large.name);
  const [addingMedium, setAddingMedium] = useState(false);
  const [newMedium, setNewMedium] = useState("");

  function addMedium() {
    if (!newMedium.trim()) return;
    addCategoryMedium(teamId, large.id, newMedium.trim());
    setNewMedium("");
    setAddingMedium(false);
  }

  return (
    <div className="border-b border-[var(--divider)] last:border-0">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <button onClick={onToggleExpanded} className="flex-none text-[var(--text-faint)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ transform: expanded ? "rotate(90deg)" : "none" }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <span className="flex-none rounded-[2px] border border-[var(--border)] bg-[var(--surface-alt)] px-1 py-0.5 font-mono text-[9px] font-bold text-[var(--text-muted)]">
          {large.code}
        </span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim()) renameCategoryLarge(teamId, large.id, draft.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="flex-1 text-left text-[11.5px] font-bold text-[var(--text)]">
            {large.name}
          </button>
        )}
        <span className="text-[9.5px] text-[var(--text-faintest)]">대분류</span>
        <button onClick={() => setAddingMedium((v) => !v)} className="text-[var(--text-faint)] hover:text-[var(--accent)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={async () => {
            if (await confirm(`'${large.name}' 대분류를 삭제할까요? 하위 항목도 함께 삭제됩니다.`))
              deleteCategoryLarge(teamId, large.id);
          }}
          style={{ color: "var(--danger-text)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="pl-5">
          {large.children.map((medium) => (
            <MediumRow key={medium.id} teamId={teamId} largeId={large.id} medium={medium} />
          ))}
          {addingMedium && (
            <div className="flex items-center gap-1.5 border-t border-[var(--divider)] px-2.5 py-1.5">
              <input
                autoFocus
                value={newMedium}
                onChange={(e) => setNewMedium(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMedium()}
                placeholder="새 중분류"
                className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <button onClick={addMedium} className="h-6 rounded-[2px] px-2 text-[10px] font-semibold" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                추가
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MediumRow({
  teamId,
  largeId,
  medium,
}: {
  teamId: string;
  largeId: string;
  medium: { id: string; name: string; code: string };
}) {
  const { renameCategoryMedium, deleteCategoryMedium } = useStore();
  const { confirm } = useConfirmDialog();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(medium.name);

  return (
    <div className="flex items-center gap-1.5 border-t border-[var(--divider)] px-2.5 py-1.5">
      <span className="w-2.5 flex-none" />
      <span className="flex-none rounded-[2px] border border-[var(--border)] bg-[var(--surface-alt)] px-1 py-0.5 font-mono text-[9px] font-bold text-[var(--text-muted)]">
        {medium.code}
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim()) renameCategoryMedium(teamId, largeId, medium.id, draft.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="flex-1 text-left text-[11px] font-semibold text-[var(--text-secondary)]">
          {medium.name}
        </button>
      )}
      <span className="text-[9px] text-[var(--text-faintest)]">중분류</span>
      <button
        onClick={async () => {
          if (await confirm(`'${medium.name}' 중분류를 삭제할까요?`))
            deleteCategoryMedium(teamId, largeId, medium.id);
        }}
        style={{ color: "var(--danger-text)" }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      </button>
    </div>
  );
}
