export interface Team {
  id: string;
  name: string;
}

// 관리자가 로그인 화면·상단바에 표시할 프로그램 제목을 바꿀 수 있게 하는
// 앱 전역 설정. 항상 단일 행(id="app")만 존재한다.
export interface AppSettings {
  id: string;
  appTitle: string;
}

export interface User {
  id: string;
  name: string;
  username: string; // 로그인 아이디
  passwordHash: string; // SHA-256 hex digest (client-only 저장이라 진짜 보안은 아님, 평문 노출만 방지)
  teamId: string; // primary/home team, used when creating tasks
  viewTeamIds: string[]; // teams this user is permitted to view (defaults to [teamId])
  level: number; // minimum Task.level this user may view (1 = can view everything)
  isAdmin: boolean;
}

export type Priority = "높음" | "보통" | "낮음";
export type Status = "대기" | "진행중" | "검토중" | "완료";

export interface ChecklistItem {
  id: string;
  label: string;
  progress: number; // 0-100, set independently of the parent task's progress
  dueDate?: string; // YYYY-MM-DD, set independently of the parent task's due date
  createdAt: string; // ISO datetime, set once when the item is added
  updatedAt?: string; // ISO datetime, set whenever label/progress/dueDate changes
  children: ChecklistItem[];
}

export interface Task {
  id: string;
  taskNumber: string; // 업무번호: "대분류코드_중분류코드_등록일(YYMMDD)_일련번호", 생성 시 한 번 배정되며 이후 바뀌지 않음
  title: string;
  description: string;
  teamId: string;
  categoryLarge: string;
  categoryMedium: string;
  assigneeId: string;
  collaboratorIds: string[];
  center: string;
  priority: Priority;
  status: Status;
  progress: number;
  reported: boolean; // 보고완료 여부 — 업무 진행 상태(status)와는 별개로 관리
  level: number; // 업무레벨: only viewable by users whose User.level <= this value
  dueDate: string; // YYYY-MM-DD
  createdBy: string;
  createdAt: string; // YYYY-MM-DD
  completedAt?: string; // YYYY-MM-DD, 진행률이 처음 100%가 된 날짜 — 다시 100% 밑으로 떨어지면 지워짐
  checklist?: ChecklistItem[];
  customFields?: Record<string, string>;
  color?: string; // hex, used for the calendar bar; auto-assigned from a palette when unset
}

export interface LogEntry {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  attachments: ResourceFile[];
  createdAt: string; // ISO datetime
  editedAt?: string;
}

export type CommentTargetType = "log" | "checklist";

export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string; // LogEntry.id or ChecklistItem.id
  authorId: string;
  content: string;
  attachments: ResourceFile[];
  createdAt: string; // ISO datetime
  editedAt?: string;
}

// --- 알림: 내가 담당자·협업자인 업무에 누가 댓글을 남기면 생성됨 ---

export interface Notification {
  id: string;
  recipientId: string; // 이 알림을 봐야 하는 사람 (업무 담당자/협업자)
  actorId: string; // 댓글을 남긴 사람
  taskId: string; // 눌렀을 때 이동할 업무
  targetType: CommentTargetType; // 댓글이 달린 곳 — 진행 일지 or 체크리스트
  targetId: string; // LogEntry.id or ChecklistItem.id
  commentId: string;
  contentPreview: string; // 댓글 내용 일부(목록에 바로 보여주기 위함)
  read: boolean;
  createdAt: string; // ISO datetime
}

// --- 자료실: user-uploaded reference documents (e.g. self-authored work manuals) ---

export interface ResourceFile {
  name: string;
  base64: string; // raw base64 (no "data:...;base64," prefix); empty when stored on Drive instead
  mimeType: string;
  size: number; // bytes
  driveFileId?: string; // set when the backend is configured — file bytes live on Drive, not base64
  url?: string; // Drive "anyone with the link" view URL, set alongside driveFileId
}

export interface ResourceDoc {
  id: string;
  title: string;
  description: string;
  category: string;
  files: ResourceFile[];
  uploadedBy: string;
  createdAt: string; // ISO datetime
}

// --- Admin-editable category taxonomy (was a hardcoded const, now per-team data) ---
// 대분류 · 중분류 2단계만 사용 — 소분류는 실제 업무 데이터에 존재하지 않아 제외.

export interface CategoryMedium {
  id: string;
  name: string;
  code: string; // 업무번호에 쓰이는 중분류 코드 (2자리 숫자, 예: "01")
}

export interface CategoryLarge {
  id: string;
  name: string;
  code: string; // 업무번호에 쓰이는 대분류 코드 (알파벳 1자, 예: "A")
  children: CategoryMedium[];
}

// --- Admin-editable boards (named column-visibility presets per team) ---

export type CustomFieldType = "text" | "number" | "select" | "date";

export interface CustomFieldDef {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[]; // for type "select"
}

export interface BuiltinColumnDef {
  key: string;
  label: string;
}

export const BUILTIN_COLUMNS: BuiltinColumnDef[] = [
  { key: "taskNumber", label: "업무번호" },
  { key: "status", label: "상태" },
  { key: "title", label: "업무명" },
  { key: "category", label: "카테고리" },
  { key: "assignee", label: "담당자" },
  { key: "collaborators", label: "협업자" },
  { key: "center", label: "센터" },
  { key: "priority", label: "우선순위" },
  { key: "progress", label: "진행률" },
  { key: "level", label: "업무레벨" },
  { key: "createdAt", label: "등록일" },
  { key: "dueDate", label: "마감일" },
  { key: "attachments", label: "첨부" },
  { key: "comments", label: "첨언" },
  { key: "reported", label: "보고" },
];

export interface Board {
  id: string;
  teamId: string;
  name: string;
  visibleColumns: string[]; // BUILTIN_COLUMNS keys + CustomFieldDef ids
}

// --- 캘린더 전용 일정: 업무(Task)와 별개로, 팀·담당자 구분 없이 누구나
// 기간(시작일~종료일)만 정해서 등록하는 항목. 캘린더 화면에서만 쓰인다.

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdBy: string;
  createdAt: string; // YYYY-MM-DD
}

// --- 활동 기록: 관리자 설정의 "기록" 메뉴 — 누가 언제 무엇을 했는지.
// bootstrap에는 포함되지 않고 필요할 때만 gas.list()로 불러온다.

export interface ActivityLog {
  id: string;
  userId: string;
  action: string; // "create" | "update" | "delete"
  entity: string; // 예: "task", "checklistItem", "team" — 어떤 종류의 데이터인지
  targetId: string;
  summary: string; // 목록에 바로 보여줄 한 줄 요약
  detail?: Record<string, unknown>; // 눌렀을 때 팝업으로 보여줄 상세 내용
  createdAt: string; // ISO datetime
}
