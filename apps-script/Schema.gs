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
};

function schemaFor_(entity) {
  var schema = SCHEMA[entity];
  if (!schema) throw new Error("알 수 없는 entity: " + entity);
  return schema;
}
