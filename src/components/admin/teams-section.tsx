"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";

export function TeamsSection() {
  const { teams, addTeam, renameTeam, deleteTeam } = useStore();
  const { confirm, alertUser } = useConfirmDialog();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function handleAdd() {
    if (!newName.trim()) return;
    addTeam(newName.trim());
    setNewName("");
  }

  async function handleDelete(id: string, name: string) {
    if (!(await confirm(`'${name}' 팀을 삭제할까요?`))) return;
    const ok = deleteTeam(id);
    if (!ok) {
      await alertUser("이 팀에 속한 업무 또는 사용자가 있어 삭제할 수 없습니다. 먼저 재배정해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        팀을 추가하거나 이름을 바꿀 수 있습니다. 업무·사용자가 남아있는 팀은 삭제할 수 없습니다.
      </div>

      <div className="flex flex-col border border-[var(--border)]">
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border-strong)] bg-[var(--surface-alt)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-faint)]">
          <div>팀 이름</div>
          <div className="w-[120px]">관리</div>
        </div>
        {teams.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[var(--divider)] px-2.5 py-1.5 last:border-0"
          >
            {editingId === t.id ? (
              <input
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={() => {
                  if (editDraft.trim()) renameTeam(t.id, editDraft.trim());
                  setEditingId(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            ) : (
              <div className="text-[11.5px] font-semibold text-[var(--text)]">{t.name}</div>
            )}
            <div className="flex w-[120px] gap-1.5">
              <button
                onClick={() => {
                  setEditingId(t.id);
                  setEditDraft(t.name);
                }}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] px-2 text-[10px] text-[var(--text-muted)]"
              >
                수정
              </button>
              <button
                onClick={() => handleDelete(t.id, t.name)}
                className="h-6 rounded-[2px] border px-2 text-[10px]"
                style={{ borderColor: "var(--danger-soft-bg)", color: "var(--danger)" }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="새 팀 이름 (예: 물류팀)"
          className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleAdd}
          className="h-7 rounded-[2px] px-3 text-[11px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          팀 추가
        </button>
      </div>
    </div>
  );
}
