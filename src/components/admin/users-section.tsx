"use client";

import { useStore } from "@/lib/store";

export function UsersSection() {
  const { users, teams, updateUser } = useStore();

  function toggleViewTeam(userId: string, currentIds: string[], teamId: string) {
    const next = currentIds.includes(teamId)
      ? currentIds.filter((id) => id !== teamId)
      : [...currentIds, teamId];
    if (next.length === 0) return; // must always be able to view at least one team
    updateUser(userId, { viewTeamIds: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        각 사용자의 소속팀, 조회 가능한 팀, 업무레벨(해당 값보다 낮은 레벨의 업무는 조회 불가),
        관리자 권한을 설정합니다.
      </div>

      <div className="overflow-x-auto border border-[var(--border)]">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[100px_100px_1fr_80px_70px] gap-2 border-b border-[var(--border-strong)] bg-[var(--surface-alt)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-faint)]">
            <div>이름</div>
            <div>소속팀</div>
            <div>조회 가능 팀</div>
            <div>업무레벨</div>
            <div>관리자</div>
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[100px_100px_1fr_80px_70px] items-center gap-2 border-b border-[var(--divider)] px-2.5 py-1.5 last:border-0"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
