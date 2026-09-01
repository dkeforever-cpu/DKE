"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";

export function CategoriesSection() {
  const { teams, categoriesByTeam } = useStore();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const activeTeamId = teams.some((t) => t.id === teamId) ? teamId : teams[0]?.id ?? "";
  const tree = categoriesByTeam[activeTeamId] ?? [];

  if (teams.length === 0) {
    return <div className="text-[11px] text-[var(--text-faint)]">먼저 팀을 추가해주세요.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        팀별로 대분류 · 중분류 · 소분류를 추가·수정·삭제할 수 있습니다. 업무 등록 화면의 분류
        선택지에 바로 반영됩니다.
      </div>

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

      <div className="flex flex-col border border-[var(--border)]">
        {tree.length === 0 && (
          <div className="px-2.5 py-2 text-[10.5px] text-[var(--text-faintest)]">
            등록된 대분류가 없습니다.
          </div>
        )}
        {tree.map((large) => (
          <LargeRow key={large.id} teamId={activeTeamId} large={large} />
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

function LargeRow({ teamId, large }: { teamId: string; large: { id: string; name: string; children: { id: string; name: string; children: { id: string; name: string }[] }[] } }) {
  const { renameCategoryLarge, deleteCategoryLarge, addCategoryMedium } = useStore();
  const { confirm } = useConfirmDialog();
  const [expanded, setExpanded] = useState(true);
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
        <button onClick={() => setExpanded((v) => !v)} className="flex-none text-[var(--text-faint)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ transform: expanded ? "rotate(90deg)" : "none" }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
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
  medium: { id: string; name: string; children: { id: string; name: string }[] };
}) {
  const { renameCategoryMedium, deleteCategoryMedium, addCategorySmall, renameCategorySmall, deleteCategorySmall } =
    useStore();
  const { confirm } = useConfirmDialog();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(medium.name);
  const [addingSmall, setAddingSmall] = useState(false);
  const [newSmall, setNewSmall] = useState("");

  function addSmall() {
    if (!newSmall.trim()) return;
    addCategorySmall(teamId, largeId, medium.id, newSmall.trim());
    setNewSmall("");
    setAddingSmall(false);
  }

  return (
    <div className="border-t border-[var(--divider)]">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <button onClick={() => setExpanded((v) => !v)} className="flex-none text-[var(--text-faint)]">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ transform: expanded ? "rotate(90deg)" : "none" }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
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
        <button onClick={() => setAddingSmall((v) => !v)} className="text-[var(--text-faint)] hover:text-[var(--accent)]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={async () => {
            if (await confirm(`'${medium.name}' 중분류를 삭제할까요? 하위 항목도 함께 삭제됩니다.`))
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

      {expanded && (
        <div className="pl-5">
          {medium.children.map((small) => (
            <div key={small.id} className="flex items-center gap-1.5 border-t border-[var(--divider)] px-2.5 py-1.5">
              <span className="w-2.5 flex-none" />
              <SmallLabel
                name={small.name}
                onRename={(name) => renameCategorySmall(teamId, largeId, medium.id, small.id, name)}
              />
              <span className="text-[9px] text-[var(--text-faintest)]">소분류</span>
              <button
                onClick={async () => {
                  if (await confirm(`'${small.name}' 소분류를 삭제할까요?`))
                    deleteCategorySmall(teamId, largeId, medium.id, small.id);
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
          ))}
          {addingSmall && (
            <div className="flex items-center gap-1.5 border-t border-[var(--divider)] px-2.5 py-1.5">
              <input
                autoFocus
                value={newSmall}
                onChange={(e) => setNewSmall(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSmall()}
                placeholder="새 소분류"
                className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <button onClick={addSmall} className="h-6 rounded-[2px] px-2 text-[10px] font-semibold" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                추가
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SmallLabel({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) onRename(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-6 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[10.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="flex-1 text-left text-[10.5px] text-[var(--text-muted)]">
      {name}
    </button>
  );
}
