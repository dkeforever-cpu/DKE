/**
 * 이 백엔드가 아는 전체 데이터 구조 — 구글 시트 탭 이름, 각 탭의 열(컬럼)
 * 순서, 그리고 값을 JSON 문자열로 저장해야 하는 열(배열/객체 필드) 목록을
 * 한 곳에 정의한다. 프론트엔드 src/lib/types.ts의 타입과 1:1로 대응된다.
 *
 * 새 필드를 추가하려면: 여기 헤더 배열에 이름만 추가하면 된다. 기존 행은
 * 해당 열이 비어있는 채로 유지되고, sheetToObjects_()가 빈 문자열/undefined로
 * 채워서 돌려준다.
 */

var SCHEMA = {
  teams: { sheet: "Teams", headers: ["id", "name"], json: [] },

  // centers는 이름 자체가 고유 키 — 별도 id 컬럼이 없다.
  centers: { sheet: "Centers", headers: ["name"], json: [], idField: "name" },

  categoryLarge: {
    sheet: "CategoryLarge",
    headers: ["id", "teamId", "name", "code"],
    json: [],
  },
  categoryMedium: {
    sheet: "CategoryMedium",
    headers: ["id", "largeId", "name", "code"],
    json: [],
  },

  boards: {
    sheet: "Boards",
    headers: ["id", "teamId", "name", "visibleColumns"],
    json: ["visibleColumns"],
  },
  customFields: {
    sheet: "CustomFields",
    headers: ["id", "label", "type", "options"],
    json: ["options"],
  },

  users: {
    sheet: "Users",
    headers: [
      "id", "name", "username", "passwordHash", "teamId", "viewTeamIds",
      "level", "isAdmin",
    ],
    json: ["viewTeamIds"],
  },

  tasks: {
    sheet: "Tasks",
    headers: [
      "id", "taskNumber", "title", "description", "teamId", "categoryLarge",
      "categoryMedium", "assigneeId", "collaboratorIds", "center", "priority",
      "status", "progress", "reported", "level", "dueDate", "createdBy",
      "createdAt", "completedAt", "color", "customFields",
    ],
    json: ["collaboratorIds", "customFields"],
  },

  checklistItems: {
    sheet: "ChecklistItems",
    headers: ["id", "taskId", "parentId", "label", "progress", "dueDate", "createdAt", "updatedAt"],
    json: [],
  },

  logEntries: {
    sheet: "LogEntries",
    headers: ["id", "taskId", "authorId", "content", "attachments", "createdAt", "editedAt"],
    json: ["attachments"],
  },

  comments: {
    sheet: "Comments",
    headers: [
      "id", "targetType", "targetId", "authorId", "content", "attachments",
      "createdAt", "editedAt",
    ],
    json: ["attachments"],
  },

  resources: {
    sheet: "Resources",
    headers: ["id", "title", "description", "category", "files", "uploadedBy", "createdAt"],
    json: ["files"],
  },

  // 내 업무(담당자·협업자)에 누가 댓글을 남기면 생기는 알림.
  notifications: {
    sheet: "Notifications",
    headers: [
      "id", "recipientId", "actorId", "taskId", "targetType", "targetId",
      "commentId", "contentPreview", "read", "createdAt",
    ],
    json: [],
  },

  // 앱 전역 설정. 단일 행(id="app")만 사용 — 관리자가 로그인 화면·상단바에
  // 표시할 프로그램 제목을 바꿀 수 있게 하기 위함.
  settings: {
    sheet: "Settings",
    headers: ["id", "appTitle"],
    json: [],
  },

  // 관리자 설정의 "기록" 메뉴용 — 누가 언제 무엇을 했는지. bootstrap에는
  // 포함하지 않고 "list" action으로 필요할 때만 불러온다(계속 쌓이는
  // 데이터라 매 로그인마다 전부 받으면 갈수록 느려지기 때문).
  activityLogs: {
    sheet: "ActivityLogs",
    headers: ["id", "userId", "action", "entity", "targetId", "summary", "detail", "createdAt"],
    json: ["detail"],
  },
};

function schemaFor_(entity) {
  var schema = SCHEMA[entity];
  if (!schema) throw new Error("알 수 없는 entity: " + entity);
  return schema;
}
