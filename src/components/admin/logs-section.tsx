"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { gas } from "@/lib/gas-client";
import { ActivityLog } from "@/lib/types";
import { FloatingWindow } from "@/components/floating-window";

const ACTION_LABELS: Record<string, string> = {
  create: "등록",
  update: "수정",
  delete: "삭제",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LogsSection() {
  const { users, getUser, backendConfigured } = useStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [detail, setDetail] = useState<ActivityLog | null>(null);

  const load = useCallback(async () => {
    if (!backendConfigured) return;
    setLoading(true);
    setError("");
    try {
      const result = await gas.list<ActivityLog>("activityLogs", {
        userId: userFilter || undefined,
        limit: 300,
      });
      setLogs(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [backendConfigured, userFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!backendConfigured) {
    return (
      <div className="text-[11px] text-[var(--text-faint)]">
        구글 시트 연동이 필요한 기능입니다. &lsquo;백엔드 연동&rsquo; 탭에서 먼저 연동해주세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] text-[var(--text-faint)]">
        사용자별로 어떤 작업을 했는지 시간 순으로 보여줍니다. 행을 누르면 상세 내용을 볼 수 있습니다.
      </div>

      <div className="flex items-center gap-2">
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[10.5px] text-[var(--text)] outline-none"
        >
          <option value="">전체 사용자</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="h-7 flex-none rounded-[2px] border border-[var(--border-strong)] px-2.5 text-[10.5px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {error && (
        <div
          className="rounded-[2px] px-2.5 py-2 text-[10.5px]"
          style={{ background: "var(--danger-soft-bg)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col border border-[var(--border)]">
        {logs.length === 0 && !loading && (
          <div className="px-3 py-6 text-center text-[10.5px] text-[var(--text-faintest)]">기록이 없습니다.</div>
        )}
        {logs.map((log, i) => {
          const user = getUser(log.userId);
          return (
            <button
              key={log.id}
              onClick={() => setDetail(log)}
              className="flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[var(--surface-alt)]"
              style={{
                borderBottom: i === logs.length - 1 ? "none" : "1px solid var(--divider)",
              }}
            >
              <span
                className="flex-none rounded-[2px] px-1.5 py-[1px] text-[9.5px] font-semibold"
                style={{ background: "var(--accent-soft-bg)", color: "var(--accent-soft-fg)" }}
              >
                {ACTION_LABELS[log.action] ?? log.action}
              </span>
              <span
                className="flex-none truncate text-[10.5px] font-semibold text-[var(--text)]"
                style={{ width: 64 }}
              >
                {user?.name ?? log.userId}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10.5px] text-[var(--text-secondary)]">
                {log.summary}
              </span>
              <span className="flex-none whitespace-nowrap text-[9.5px] text-[var(--text-faintest)]">
                {formatDateTime(log.createdAt)}
              </span>
            </button>
          );
        })}
      </div>

      {detail && (
        <FloatingWindow title="기록 상세" onClose={() => setDetail(null)} defaultWidth={480} defaultHeight={420}>
          <div className="flex flex-col gap-2 text-[11px]">
            <DetailRow label="사용자" value={getUser(detail.userId)?.name ?? detail.userId} />
            <DetailRow label="작업" value={`${ACTION_LABELS[detail.action] ?? detail.action} · ${detail.entity}`} />
            <DetailRow label="대상 ID" value={detail.targetId} />
            <DetailRow label="시각" value={formatDateTime(detail.createdAt)} />
            <DetailRow label="요약" value={detail.summary} />
            {detail.detail !== undefined && (
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-semibold text-[var(--text-faint)]">상세 내용</div>
                <pre
                  className="overflow-auto rounded-[2px] border border-[var(--border)] bg-[var(--surface-alt)] p-2 text-[10px] leading-relaxed text-[var(--text-secondary)]"
                  style={{ maxHeight: 220 }}
                >
                  {JSON.stringify(detail.detail, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </FloatingWindow>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-none text-[10px] text-[var(--text-faint)]" style={{ width: 56 }}>
        {label}
      </div>
      <div className="min-w-0 flex-1 text-[var(--text)]" style={{ wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}
