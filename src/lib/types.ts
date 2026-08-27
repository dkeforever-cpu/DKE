export interface Team {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
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
  createdAt: string; // YYYY-MM-DD, set once when the item is added
  children: ChecklistItem[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  teamId: string;
  categoryLarge: string;
  categoryMedium: string;
  categorySmall: string;
  assigneeId: string;
  collaboratorIds: string[];
  center: string;
  priority: Priority;
  status: Status;
  progress: number;
  level: number; // 업무레벨: only viewable by users whose User.level <= this value
  dueDate: string; // YYYY-MM-DD
  createdBy: string;
  createdAt: string; // YYYY-MM-DD
  checklist?: ChecklistItem[];
  customFields?: Record<string, string>;
}

export interface LogEntry {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  attachments: string[];
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
  attachments: string[];
  createdAt: string; // ISO datetime
  editedAt?: string;
}

// --- Admin-editable category taxonomy (was a hardcoded const, now per-team data) ---

export interface CategorySmall {
  id: string;
  name: string;
}

export interface CategoryMedium {
  id: string;
  name: string;
  children: CategorySmall[];
}

export interface CategoryLarge {
  id: string;
  name: string;
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
];

export interface Board {
  id: string;
  teamId: string;
  name: string;
  visibleColumns: string[]; // BUILTIN_COLUMNS keys + CustomFieldDef ids
}
