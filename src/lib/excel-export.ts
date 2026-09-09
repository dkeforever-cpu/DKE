import { loadExcelJS } from "@/lib/exceljs-loader";
import { CalendarEvent, ChecklistItem, Comment, LogEntry, Task, Team, User } from "@/lib/types";
import { taskColor, buildMonthGrid, parseDateStr, toDateStr } from "@/lib/calendar";
import { formatDateFull, formatDateTime } from "@/lib/format";

export interface ExcelExportData {
  teams: Team[];
  users: User[];
  tasks: Task[]; // 필터 없이 전체 (allTasks)
  calendarEvents: CalendarEvent[];
  logEntries: LogEntry[];
  comments: Comment[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HEADER_FILL = "FF3355D6";
const HEADER_FONT = "FFFFFFFF";
const THIN_BORDER = { style: "thin" as const, color: { argb: "FFC7CAD1" } };
const ALL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

function argb(hex: string): string {
  const h = hex.replace("#", "");
  return "FF" + (h.length === 6 ? h : "3355D6").toUpperCase();
}

function userName(users: User[], id: string | undefined): string {
  if (!id) return "-";
  return users.find((u) => u.id === id)?.name ?? "-";
}

function teamName(teams: Team[], id: string): string {
  return teams.find((t) => t.id === id)?.name ?? id;
}

function flattenChecklist(items: ChecklistItem[] | undefined, depth = 0): { item: ChecklistItem; depth: number }[] {
  if (!items) return [];
  return items.flatMap((item) => [{ item, depth }, ...flattenChecklist(item.children, depth + 1)]);
}

/**
 * 1번 시트 "캘린더" — 앱 화면의 캘린더 화면(calendar-view.tsx)과 같은 규칙으로
 * (완료 업무 제외, 등록일에 칩·마감일에 ■마감, 일정은 기간 내 매일 표시)
 * 실제 달력 격자 모양으로 그린다.
 */
function buildCalendarSheet(ws: import("exceljs").Worksheet, data: ExcelExportData) {
  ws.views = [{ showGridLines: false }];
  ws.columns = WEEKDAYS.map(() => ({ width: 22 }));

  const activeTasks = data.tasks.filter((t) => t.status !== "완료");
  const taskRanges = activeTasks.map((t) => {
    const start = parseDateStr(t.createdAt);
    let end = parseDateStr(t.dueDate);
    if (end < start) end = start;
    return { task: t, start, end };
  });
  const eventRanges = data.calendarEvents.map((ev) => {
    const start = parseDateStr(ev.startDate);
    let end = parseDateStr(ev.endDate);
    if (end < start) end = start;
    return { event: ev, start, end };
  });

  const allDates = [
    ...taskRanges.flatMap((r) => [r.start, r.end]),
    ...eventRanges.flatMap((r) => [r.start, r.end]),
  ];
  const today = new Date();
  let minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let maxMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  for (const d of allDates) {
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    if (monthStart < minMonth) minMonth = monthStart;
    if (monthStart > maxMonth) maxMonth = monthStart;
  }

  let row = 1;
  let cursor = new Date(minMonth);
  while (cursor <= maxMonth) {
    row = writeMonthGrid(ws, cursor, row, taskRanges, eventRanges);
    row += 1; // 달 사이 여백 한 줄
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
}

function writeMonthGrid(
  ws: import("exceljs").Worksheet,
  monthCursor: Date,
  startRow: number,
  taskRanges: { task: Task; start: Date; end: Date }[],
  eventRanges: { event: CalendarEvent; start: Date; end: Date }[]
): number {
  const titleRow = ws.getRow(startRow);
  ws.mergeCells(startRow, 1, startRow, 7);
  titleRow.getCell(1).value = `${monthCursor.getFullYear()}년 ${monthCursor.getMonth() + 1}월`;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: HEADER_FONT } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 22;

  const weekdayRow = ws.getRow(startRow + 1);
  WEEKDAYS.forEach((label, i) => {
    const cell = weekdayRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: i === 0 ? "FFD92D20" : i === 6 ? "FF3355D6" : "FF383C44" } };
    cell.alignment = { horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F8FA" } };
    cell.border = ALL_BORDERS;
  });
  weekdayRow.height = 16;

  const weeks = buildMonthGrid(monthCursor);
  const inMonth = (d: Date) => d.getMonth() === monthCursor.getMonth();

  weeks.forEach((week, wi) => {
    const r = ws.getRow(startRow + 2 + wi);
    r.height = 70;
    week.forEach((day, di) => {
      const cell = r.getCell(di + 1);
      cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      cell.border = ALL_BORDERS;
      if (!inMonth(day)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F8FA" } };
        cell.value = String(day.getDate());
        cell.font = { color: { argb: "FFC4C8D0" }, size: 9 };
        return;
      }
      const t = day.getTime();
      const lines: { text: string; color: string }[] = [{ text: String(day.getDate()), color: "FF191B1F" }];
      for (const r2 of eventRanges) {
        if (t >= r2.start.getTime() && t <= r2.end.getTime()) {
          lines.push({ text: `· ${r2.event.title}`, color: "FF5A5F68" });
        }
      }
      for (const r2 of taskRanges) {
        if (t === r2.start.getTime()) {
          lines.push({ text: r2.task.title, color: argb(taskColor(r2.task)) });
        } else if (t === r2.end.getTime()) {
          lines.push({ text: `■마감 ${r2.task.title}`, color: argb(taskColor(r2.task)) });
        }
      }
      cell.value = {
        richText: lines.map((l, i) => ({
          font: i === 0 ? { bold: true, size: 10, color: { argb: l.color } } : { size: 9, color: { argb: l.color } },
          text: (i === 0 ? "" : "\n") + l.text,
        })),
      };
    });
  });

  return startRow + 2 + weeks.length;
}

/**
 * 3번 시트 "업무 세부내용"을 먼저 채우면서, 업무별 시작 행 번호를
 * 기록해둔다 — 2번 시트 "전체업무"의 업무명 칸이 여길 가리키는
 * 내부 하이퍼링크를 만들 때 이 번호가 필요하다.
 */
function buildDetailSheet(
  ws: import("exceljs").Worksheet,
  data: ExcelExportData,
  orderedTasks: Task[]
): Map<string, number> {
  ws.columns = [
    { header: "구분", width: 12 },
    { header: "내용", width: 70 },
    { header: "작성자", width: 12 },
    { header: "일시", width: 14 },
  ];
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = ALL_BORDERS;
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const anchors = new Map<string, number>();
  let row = 2;

  for (const task of orderedTasks) {
    anchors.set(task.id, row);

    ws.mergeCells(row, 1, row, 4);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = `◆ [${task.taskNumber}] ${task.title}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF0F3" } };
    titleCell.border = ALL_BORDERS;
    row++;

    const summaryCell = ws.getCell(row, 1);
    ws.mergeCells(row, 1, row, 4);
    summaryCell.value =
      `담당: ${userName(data.users, task.assigneeId)} · 상태: ${task.status} · 진행률: ${task.progress}% · ` +
      `마감: ${formatDateFull(task.dueDate)}`;
    summaryCell.font = { italic: true, size: 10, color: { argb: "FF5A5F68" } };
    row++;

    const checklistRows = flattenChecklist(task.checklist);
    if (checklistRows.length === 0) {
      writeDetailRow(ws, row++, "필요 업무", "등록된 필요 업무가 없습니다.", "", "");
    } else {
      for (const { item, depth } of checklistRows) {
        writeDetailRow(
          ws,
          row++,
          "필요 업무",
          `${"  ".repeat(depth)}${item.label} (${item.progress}%)`,
          "",
          item.dueDate ? formatDateFull(item.dueDate) : ""
        );
        const itemComments = data.comments.filter((c) => c.targetType === "checklist" && c.targetId === item.id);
        for (const c of itemComments) {
          writeDetailRow(ws, row++, "└ 댓글", c.content, userName(data.users, c.authorId), formatDateTime(c.createdAt));
        }
      }
    }

    const logs = data.logEntries.filter((l) => l.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const log of logs) {
      writeDetailRow(ws, row++, "업무 메모", log.content, userName(data.users, log.authorId), formatDateTime(log.createdAt));
      const logComments = data.comments.filter((c) => c.targetType === "log" && c.targetId === log.id);
      for (const c of logComments) {
        writeDetailRow(ws, row++, "└ 댓글", c.content, userName(data.users, c.authorId), formatDateTime(c.createdAt));
      }
    }

    row++; // 업무 사이 여백
  }

  return anchors;
}

function writeDetailRow(
  ws: import("exceljs").Worksheet,
  row: number,
  kind: string,
  content: string,
  author: string,
  date: string
) {
  ws.getCell(row, 1).value = kind;
  ws.getCell(row, 2).value = content;
  ws.getCell(row, 2).alignment = { wrapText: true, vertical: "top" };
  ws.getCell(row, 3).value = author;
  ws.getCell(row, 4).value = date;
  for (let c = 1; c <= 4; c++) ws.getCell(row, c).border = ALL_BORDERS;
}

/** 2번 시트 "전체업무" — 업무명 칸을 누르면 3번 시트의 해당 업무 행으로 이동한다. */
function buildTaskListSheet(
  ws: import("exceljs").Worksheet,
  data: ExcelExportData,
  orderedTasks: Task[],
  anchors: Map<string, number>
) {
  ws.columns = [
    { header: "#", width: 5 },
    { header: "업무번호", width: 20 },
    { header: "상태", width: 8 },
    { header: "업무명", width: 32 },
    { header: "팀", width: 10 },
    { header: "카테고리", width: 20 },
    { header: "담당자", width: 10 },
    { header: "협업자", width: 16 },
    { header: "센터", width: 12 },
    { header: "우선순위", width: 9 },
    { header: "진행률", width: 8 },
    { header: "보고", width: 8 },
    { header: "등록일", width: 11 },
    { header: "마감일", width: 11 },
  ];
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = ALL_BORDERS;
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];

  orderedTasks.forEach((task, i) => {
    const row = i + 2;
    const cells = [
      i + 1,
      task.taskNumber,
      task.status,
      task.title,
      teamName(data.teams, task.teamId),
      `${task.categoryLarge} · ${task.categoryMedium}`,
      userName(data.users, task.assigneeId),
      task.collaboratorIds.map((id) => userName(data.users, id)).join(", ") || "-",
      task.center,
      task.priority,
      `${task.progress}%`,
      task.reported ? "완료" : "미보고",
      formatDateFull(task.createdAt),
      formatDateFull(task.dueDate),
    ];
    cells.forEach((v, ci) => {
      const cell = ws.getCell(row, ci + 1);
      cell.value = v;
      cell.border = ALL_BORDERS;
    });

    const titleCell = ws.getCell(row, 4);
    const anchorRow = anchors.get(task.id);
    if (anchorRow) {
      // 일반 하이퍼링크 객체({hyperlink: ...})로 이동하면, 상세 시트에 틀고정이
      // 걸려 있을 때 선택 셀은 바뀌는데 화면(스크롤)이 안 따라가는 엑셀
      // 자체의 오래된 버그가 있다 — HYPERLINK() 함수로 참조하면 같은
      // 틀고정 상태에서도 화면이 정상적으로 따라간다(직접 테스트로 확인됨).
      // 시트 이름을 작은따옴표로 감싸야(#'상세'!A5) 실제로 클릭 이동이
      // 된다 — 안 감싸면(#상세!A5) 표시는 멀쩡해도 클릭해도 이동이 안 된다.
      const safeTitle = task.title.replace(/"/g, '""');
      titleCell.value = {
        formula: `HYPERLINK("#'상세'!A${anchorRow}","${safeTitle}")`,
        result: task.title,
      };
      titleCell.font = { color: { argb: "FF3355D6" }, underline: true };
    }
  });
}

export async function buildAndDownloadExcel(data: ExcelExportData, filename?: string): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "물류센터 업무관리 시스템";
  wb.created = new Date();

  const orderedTasks = [...data.tasks].sort((a, b) => a.taskNumber.localeCompare(b.taskNumber));

  // 탭 순서(1.캘린더 2.전체업무 3.상세)대로 시트를 먼저 만들어두고, 내용을
  // 채우는 건 순서와 무관하게 한다 — "전체업무"가 "상세"의 어느 행을
  // 가리켜야 하는지(anchors)는 상세 내용을 실제로 채워봐야 알 수 있어서,
  // 상세 시트를 먼저 채운다.
  const calendarWs = wb.addWorksheet("캘린더");
  const taskListWs = wb.addWorksheet("전체업무");
  const detailWs = wb.addWorksheet("상세");

  const anchors = buildDetailSheet(detailWs, data, orderedTasks);
  buildTaskListSheet(taskListWs, data, orderedTasks, anchors);
  buildCalendarSheet(calendarWs, data);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const name = filename ?? `dke-업무현황-${toDateStr(new Date())}.xlsx`;
  if (window.saveAs) {
    window.saveAs(blob, name);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
