"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";

export function UsersSection() {
  const { users, teams, addUser, updateUser, deleteUser } = useStore();
  const { confirm, alertUser } = useConfirmDialog();
  const [newName, setNewName] = useState("");
  const [newTeamId, setNewTeamId] = useState(teams[0]?.id ?? "");

  function toggleViewTeam(userId: string, currentIds: string[], teamId: string) {
    const next = currentIds.includes(teamId)
      ? currentIds.filter((id) => id !== teamId)
      : [...currentIds, teamId];
    if (next.length === 0) return; // must always be able to view at least one team
    updateUser(userId, { viewTeamIds: next });
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name || !newTeamId) return;
    addUser(name, newTeamId);
    setNewName("");
  }

  async function handleDelete(u: (typeof users)[number]) {
    if (!(await confirm(`'${u.name}' 사용자를 삭제할까요?`))) return;
    const ok = deleteUser(u.id);
    if (!ok) {
      await alertUser(
        "이 사용자를 삭제할 수 없습니다. 현재 로그인한 계정이거나, 담당·협업 중인 업무 또는 작성한 기록이 남아있거나, 마지막 남은 관리자일 수 있습니다."
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        각 사용자의 소속팀, 조회 가능한 팀, 업무레벨(해당 값보다 낮은 레벨의 업무는 조회 불가),
        관리자 권한을 설정합니다. 업무·기록이 남아있는 사용자, 로그인 중인 계정, 마지막 관리자는
        삭제할 수 없습니다.
      </div>

      <div className="overflow-x-auto border border-[var(--border)]">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[100px_100px_1fr_80px_70px_56px] gap-2 border-b border-[var(--border-strong)] bg-[var(--surface-alt)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-faint)]">
            <div>이름</div>
            <div>소속팀</div>
            <div>조회 가능 팀</div>
            <div>업무레벨</div>
            <div>관리자</div>
            <div>관리</div>
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[100px_100px_1fr_80px_70px_56px] items-center gap-2 border-b border-[var(--divider)] px-2.5 py-1.5 last:border-0"
            >
              <div className="truncate text-[11px] font-semibold text-[var(--text)]">{u.name}</div>
              <select
                value={u.teamId}
                onChange={(e) => updateUser(u.id, { teamId: e.target.value })}
                className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-[10.5px] text-[var(--text)]"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={u.viewTeamIds.includes(t.id)}
                      onChange={() => toggleViewTeam(u.id, u.viewTeamIds, t.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={u.level}
                onChange={(e) => updateUser(u.id, { level: Math.max(1, Number(e.target.value) || 1) })}
                className="h-6 w-14 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1 text-right text-[10.5px] text-[var(--text)]"
              />
              <label className="flex items-center gap-1 text-[10.5px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={u.isAdmin}
                  onChange={(e) => updateUser(u.id, { isAdmin: e.target.checked })}
                  style={{ accentColor: "var(--accent)" }}
                />
                관리자
              </label>
              <button
                onClick={() => handleDelete(u)}
                className="h-6 flex-none rounded-[2px] border px-2 text-[10px]"
                style={{ borderColor: "var(--danger-soft-bg)", color: "var(--danger)" }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="새 사용자 이름 (예: 김민수)"
          className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <select
          value={newTeamId}
          onChange={(e) => setNewTeamId(e.target.value)}
          className="h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)]"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="h-7 flex-none rounded-[2px] px-3 text-[11px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          사용자 추가
        </button>
      </div>
    </div>
  );
}
