export type Dept = "관리팀" | "재경팀";

export interface User {
  id: string;
  name: string;
  dept: Dept;
  isAdmin: boolean;
}

export type Priority = "높음" | "보통" | "낮음";
export type Status = "대기" | "진행중" | "검토중" | "완료";

export interface ChecklistItem {
  id: string;
  label: string;
  progress: number; // 0-100, set independently of the parent task's progress
  children: ChecklistItem[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dept: Dept;
  categoryLarge: string;
  categoryMedium: string;
  categorySmall: string;
  assigneeId: string;
  center: string;
  priority: Priority;
  status: Status;
  progress: number;
  dueDate: string; // YYYY-MM-DD
  createdBy: string;
  createdAt: string; // YYYY-MM-DD
  checklist?: ChecklistItem[];
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

export interface Comment {
  id: string;
  logEntryId: string;
  authorId: string;
  content: string;
  createdAt: string; // ISO datetime
  editedAt?: string;
}
