"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { BUILTIN_COLUMNS, CustomFieldType } from "@/lib/types";

export function BoardsSection() {
  const { teams, boards, customFields, addBoard, updateBoard, deleteBoard, addCustomField, deleteCustomField } =
    useStore();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const activeTeamId = teams.some((t) => t.id === teamId) ? teamId : teams[0]?.id ?? "";
  const teamBoards = boards.filter((b) => b.teamId === activeTeamId);

  const [newBoardName, setNewBoardName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const allColumns = [
    ...BUILTIN_COLUMNS,
    ...customFields.map((f) => ({ key: f.id, label: `${f.label} (커스텀)` })),
  ];

  function toggleColumn(boardId: string, key: string, currentCols: string[]) {
    const next = currentCols.includes(key)
      ? currentCols.filter((c) => c !== key)
      : [...currentCols, key];
    updateBoard(boardId, { visibleColumns: next });
  }

  function handleAddBoard() {
    if (!newBoardName.trim()) return;
    addBoard(activeTeamId, newBoardName.trim());
    setNewBoardName("");
  }

  function handleAddField() {
    if (!newFieldLabel.trim()) return;
    const options =
      newFieldType === "select"
        ? newFieldOptions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    addCustomField(newFieldLabel.trim(), newFieldType, options);
    setNewFieldLabel("");
    setNewFieldOptions("");
  }

  if (teams.length === 0) {
    return <div className="text-[11px] text-[var(--text-faint)]">먼저 팀을 추가해주세요.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-[11px] text-[var(--text-faint)]">
          팀별로 게시판(업무 목록 화면)을 추가하고, 게시판마다 표시할 열을 선택할 수 있습니다.
          새로 추가한 커스텀 필드도 동일하게 게시판별로 켜고 끌 수 있습니다.
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
      </div>

      <div className="flex flex-col gap-2.5">
        {teamBoards.map((board) => (
          <div key={board.id} className="border border-[var(--border)]">
            <div className="flex items-center gap-2 border-b border-[var(--divider)] bg-[var(--surface-alt)] px-2.5 py-1.5">
              <BoardNameEditor name={board.name} onRename={(name) => updateBoard(board.id, { name })} />
              <button
                onClick={() => {
                  if (confirm(`'${board.name}' 게시판을 삭제할까요?`)) deleteBoard(board.id);
                }}
                className="ml-auto h-6 rounded-[2px] border px-2 text-[10px]"
                style={{ borderColor: "var(--danger-soft-bg)", color: "var(--danger)" }}
              >
                게시판 삭제
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-2.5 py-2">
              {allColumns.map((col) => (
                <label key={col.key} className="flex items-center gap-1 text-[10.5px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={board.visibleColumns.includes(col.key)}
                    onChange={() => toggleColumn(board.id, col.key, board.visibleColumns)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-1.5">
          <input
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddBoard()}
            placeholder="새 게시판 이름 (예: 회의록)"
            className="h-7 flex-1 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleAddBoard}
            className="h-7 rounded-[2px] px-3 text-[11px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            게시판 추가
          </button>
        </div>
      </div>

      <div className="h-px bg-[var(--divider)]" />

      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-bold text-[var(--text)]">커스텀 필드</div>
        <div className="text-[10.5px] text-[var(--text-faintest)]">
          업무 등록/수정 화면과 게시판 열에 추가할 새 필드를 정의합니다.
        </div>
        <div className="flex flex-col border border-[var(--border)]">
          {customFields.length === 0 && (
            <div className="px-2.5 py-2 text-[10.5px] text-[var(--text-faintest)]">등록된 커스텀 필드가 없습니다.</div>
          )}
          {customFields.map((f) => (
            <div key={f.id} className="flex items-center gap-2 border-b border-[var(--divider)] px-2.5 py-1.5 last:border-0">
              <span className="text-[11px] font-semibold text-[var(--text)]">{f.label}</span>
              <span className="text-[9.5px] text-[var(--text-faintest)]">
                {f.type === "text" ? "텍스트" : f.type === "number" ? "숫자" : f.type === "date" ? "날짜" : "선택"}
                {f.options && f.options.length > 0 ? ` (${f.options.join(", ")})` : ""}
              </span>
              <button
                onClick={() => {
                  if (confirm(`'${f.label}' 필드를 삭제할까요?`)) deleteCustomField(f.id);
                }}
                className="ml-auto text-[10px]"
                style={{ color: "var(--danger-text)" }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            placeholder="필드 이름 (예: 계약번호)"
            className="h-7 w-[160px] rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
            className="h-7 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11px] text-[var(--text)]"
          >
            <option value="text">텍스트</option>
            <option value="number">숫자</option>
            <option value="date">날짜</option>
            <option value="select">선택형</option>
          </select>
          {newFieldType === "select" && (
            <input
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              placeholder="선택지 (쉼표로 구분)"
              className="h-7 w-[180px] rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          )}
          <button
            onClick={handleAddField}
            className="h-7 rounded-[2px] px-3 text-[11px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            필드 추가
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardNameEditor({ name, onRename }: { name: string; onRename: (name: string) => void }) {
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
        className="h-6 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-[11.5px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-[11.5px] font-bold text-[var(--text)]">
      {name}
    </button>
  );
}
