"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";

export function CentersSection() {
  const { centers, addCenter, renameCenter, deleteCenter } = useStore();
  const { confirm, alertUser } = useConfirmDialog();
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (centers.includes(name)) {
      setNewName("");
      return;
    }
    addCenter(name);
    setNewName("");
  }

  async function handleDelete(name: string) {
    if (!(await confirm(`'${name}' 센터를 삭제할까요?`))) return;
    const ok = deleteCenter(name);
    if (!ok) {
      await alertUser("이 센터를 사용 중인 업무가 있어 삭제할 수 없습니다. 먼저 다른 센터로 변경해주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        업무 등록 시 선택하는 센터 목록을 관리합니다. 이름을 바꾸면 이 센터로 등록된 업무에도
        새 이름이 함께 반영됩니다. 업무가 남아있는 센터는 삭제할 수 없습니다.
      </div>

      <div className="flex flex-col border border-[var(--border)]">
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--border-strong)] bg-[var(--surface-alt)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-faint)]">
          <div>센터 이름</div>
          <div className="w-[120px]">관리</div>
        </div>
        {centers.map((c) => (
          <div
            key={c}
            className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[var(--divider)] px-2.5 py-1.5 last:border-0"
          >
            {editingName === c ? (
              <input
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onBlur={() => {
                  const next = editDraft.trim();
                  if (next && next !== c) renameCenter(c, next);
                  setEditingName(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            ) : (
              <div className="text-[11.5px] font-semibold text-[var(--text)]">{c}</div>
            )}
            <div className="flex w-[120px] gap-1.5">
              <button
                onClick={() => {
                  setEditingName(c);
                  setEditDraft(c);
                }}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] px-2 text-[10px] text-[var(--text-muted)]"
              >
                수정
              </button>
              <button
                onClick={() => handleDelete(c)}
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
          placeholder="새 센터 이름 (예: 김포센터)"
          className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleAdd}
          className="h-7 rounded-[2px] px-3 text-[11px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          센터 추가
        </button>
      </div>
    </div>
  );
}
