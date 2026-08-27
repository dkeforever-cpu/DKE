import { Priority, Status } from "@/lib/types";

const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  대기: { bg: "var(--neutral-soft-bg)", fg: "var(--neutral-soft-fg)" },
  진행중: { bg: "var(--accent-soft-bg)", fg: "var(--accent-soft-fg)" },
  검토중: { bg: "var(--warning-soft-bg)", fg: "var(--warning-text)" },
  완료: { bg: "var(--success-soft-bg)", fg: "var(--success)" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-block rounded-[3px] px-[6px] py-[1px] text-[10px] font-bold"
      style={{ background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  높음: "var(--danger)",
  보통: "var(--warning-text)",
  낮음: "var(--text-faint)",
};

export function PriorityLabel({ priority }: { priority: Priority }) {
  return (
    <span
      className="text-[10.5px] font-semibold"
      style={{ color: PRIORITY_STYLE[priority] }}
    >
      {priority}
    </span>
  );
}

export function ProgressBar({
  value,
  color = "var(--accent)",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: value === 0 ? "var(--text-disabled)" : color }}
        />
      </div>
      <div className="w-7 text-right text-[9.5px] text-[var(--text-faint)]">{value}%</div>
    </div>
  );
}
