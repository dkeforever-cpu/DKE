"use client";

import { ReactNode, useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/lib/confirm-dialog";
import { CalendarEvent } from "@/lib/types";
import { FloatingWindow } from "@/components/floating-window";
import { todayStr } from "@/lib/format";

const inputCls =
  "h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-60";

export function CalendarEventFormModal({
  mode,
  event,
  onClose,
}: {
  mode: "create" | "edit";
  event?: CalendarEvent;
  onClose: () => void;
}) {
  const { addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, canEdit, currentUser, getUser } = useStore();
  const { confirm } = useConfirmDialog();

  const [title, setTitle] = useState(event?.title ?? "");
  const [startDate, setStartDate] = useState(event?.startDate ?? todayStr());
  const [endDate, setEndDate] = useState(event?.endDate ?? todayStr());
  const [description, setDescription] = useState(event?.description ?? "");
  const [error, setError] = useState("");

  // 새로 등록할 때는 당연히 본인이 만드는 거라 항상 수정 가능하고, 기존
  // 일정을 열었을 때만 작성자 본인/관리자가 아니면 읽기 전용으로 막는다 —
  // 업무의 canEdit(작성자 판단)과 동일한 규칙을 그대로 재사용한다.
  const editable = mode === "create" || (event ? canEdit(event.createdBy) : false);

  function handleSubmit() {
    if (!title.trim()) {
      setError("일정 제목을 입력해주세요.");
      return;
    }
    if (!startDate || !endDate) {
      setError("시작일과 종료일을 모두 입력해주세요.");
      return;
    }
    // 종료일이 시작일보다 빠르면 화면에서 기간이 거꾸로 표시되니, 저장 전에
    // 두 값을 바로잡는다(사용자가 날짜를 반대로 골랐을 뿐 오류로 취급하지 않음).
    const [normalizedStart, normalizedEnd] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

    if (mode === "create") {
      if (!currentUser) return;
      addCalendarEvent({
        title: title.trim(),
        description: description.trim(),
        startDate: normalizedStart,
        endDate: normalizedEnd,
        createdBy: currentUser.id,
      });
    } else if (event) {
      updateCalendarEvent(event.id, {
        title: title.trim(),
        description: description.trim(),
        startDate: normalizedStart,
        endDate: normalizedEnd,
      });
    }
    onClose();
  }

  async function handleDelete() {
    if (!event) return;
    if (await confirm("이 일정을 삭제할까요?")) {
      deleteCalendarEvent(event.id);
      onClose();
    }
  }

  return (
    <FloatingWindow
      title={mode === "create" ? "일정 등록" : editable ? "일정 수정" : "일정 상세"}
      onClose={onClose}
      defaultWidth={420}
      defaultHeight={420}
      footer={
        <>
          {mode === "edit" && editable && (
            <button
              onClick={handleDelete}
              className="h-7 rounded-[2px] border px-3 text-[11.5px] font-semibold"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="h-7 rounded-[2px] border border-[var(--border-strong)] px-3 text-[11.5px] text-[var(--text-muted)]"
          >
            {editable ? "취소" : "닫기"}
          </button>
          {editable && (
            <button
              onClick={handleSubmit}
              className="h-7 rounded-[2px] px-3.5 text-[11.5px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              저장
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="일정 제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!editable}
            placeholder="예: 여름 휴가"
            className={inputCls}
          />
          {event && (
            <div className="mt-1 text-[9.5px] text-[var(--text-faintest)]">
              작성자: {getUser(event.createdBy)?.name ?? event.createdBy}
            </div>
          )}
        </Field>

        <div className="flex gap-2">
          <Field label="시작일">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!editable}
              className={inputCls}
            />
          </Field>
          <Field label="종료일">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!editable}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="일정 상세내용">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!editable}
            rows={6}
            placeholder="일정에 대한 설명을 적어주세요 (선택)"
            className="resize-none rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] p-2 text-[11.5px] leading-relaxed text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </Field>

        {error && <div className="text-[10.5px]" style={{ color: "var(--danger)" }}>{error}</div>}
      </div>
    </FloatingWindow>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label className="text-[10.5px] font-semibold text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}
