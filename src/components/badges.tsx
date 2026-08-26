import { Priority, Status } from "@/lib/types";

const STATUS_STYLE: Record<Status, string> = {
  대기: "bg-[#f1f2f4] text-[#5b6068]",
  진행중: "bg-[#e7edff] text-[#3355d6]",
  검토중: "bg-[#fff3e0] text-[#b06a00]",
  완료: "bg-[#e6f6ec] text-[#1f8a4c]",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-[3px] text-[10px] font-bold ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  높음: "text-[#d92d20]",
  보통: "text-[#c2570c]",
  낮음: "text-[#8a8f99]",
};

export function PriorityLabel({ priority }: { priority: Priority }) {
  return (
    <span className={`text-[11px] font-semibold ${PRIORITY_STYLE[priority]}`}>
      {priority}
    </span>
  );
}

export function ProgressBar({
  value,
  color = "#3355d6",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#eceef1]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: value === 0 ? "#c7cad0" : color }}
        />
      </div>
      <div className="text-[10px] text-[#8a8f99] w-8 text-right">{value}%</div>
    </div>
  );
}
