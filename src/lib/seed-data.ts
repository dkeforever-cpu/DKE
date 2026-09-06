import {
  Board,
  CategoryLarge,
  Comment,
  CustomFieldDef,
  LogEntry,
  Task,
  Team,
  User,
  BUILTIN_COLUMNS,
} from "./types";
import { seedCategoriesByTeam } from "./categories";
import { DEFAULT_PASSWORD_HASH } from "./auth";
import {
  MGMT_SUPPORT_CATEGORIES,
  MGMT_SUPPORT_COMMENTS,
  MGMT_SUPPORT_TASKS,
  MGMT_SUPPORT_USERS,
} from "./seed-data-mgmt-support";

export const SEED_TEAMS: Team[] = [
  { id: "관리팀", name: "관리팀" },
  { id: "재경팀", name: "재경팀" },
];

export const SEED_CATEGORIES_BY_TEAM: Record<string, CategoryLarge[]> = (() => {
  const base = seedCategoriesByTeam();
  base.관리팀 = [...base.관리팀, ...MGMT_SUPPORT_CATEGORIES];
  return base;
})();

export const SEED_CUSTOM_FIELDS: CustomFieldDef[] = [];

export const SEED_BOARDS: Board[] = SEED_TEAMS.map((t) => ({
  id: `board_${t.id}_default`,
  teamId: t.id,
  name: "전체",
  visibleColumns: BUILTIN_COLUMNS.map((c) => c.key),
}));

// 실제 사용자: admin 관리자 계정 + 경영지원실 업무 이관 대상 4명. 예전
// 데모용 재경팀 인원(김재경/정다은/최수민/노현우/임소연)과 그 데모 업무는
// 실 데이터로 교체되며 모두 삭제됨.
export const USERS: User[] = [
  {
    id: "admin",
    name: "관리자",
    username: "admin",
    passwordHash: DEFAULT_PASSWORD_HASH,
    teamId: "관리팀",
    viewTeamIds: ["관리팀", "재경팀"],
    level: 1,
    isAdmin: true,
  },
  ...MGMT_SUPPORT_USERS,
];

export const SEED_TASKS: Task[] = [...MGMT_SUPPORT_TASKS];

export const SEED_LOG_ENTRIES: LogEntry[] = [];

export const SEED_COMMENTS: Comment[] = [...MGMT_SUPPORT_COMMENTS];
