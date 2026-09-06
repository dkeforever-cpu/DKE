/**
 * 설치 관련 함수들. 스프레드시트를 열면 상단에 "물류센터 업무관리 설치"
 * 메뉴가 자동으로 생기고(onOpen_), 그 메뉴에서 아래 함수들을 순서대로
 * 실행하면 된다. 자세한 절차는 설치 매뉴얼을 참고할 것.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("물류센터 업무관리 설치")
    .addItem("1. 초기 설정 (시트 생성 + API 토큰 발급)", "setup")
    .addItem("2. 기존 데이터 가져오기 (앱에서 내보낸 JSON)", "openImportDialog")
    .addItem("3. API 토큰 다시 보기", "showApiToken")
    .addToUi();
}

function setup() {
  Object.keys(SCHEMA).forEach(function (entity) {
    var schema = SCHEMA[entity];
    ensureSheet_(schema.sheet, schema.headers);
  });

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("API_TOKEN")) {
    props.setProperty("API_TOKEN", Utilities.getUuid().replace(/-/g, ""));
  }
  seedAdminUser_();

  SpreadsheetApp.getUi().alert(
    "설정 완료",
    "시트 구성이 끝났습니다. 메뉴의 '3. API 토큰 다시 보기'에서 토큰을 확인해 " +
      "업무관리 시스템 설정 화면에 입력하세요.\n\n" +
      "그 다음 배포 → 새 배포 로 웹 앱을 배포하고, 웹 앱 URL도 함께 입력하면 연동이 끝납니다.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** 관리자 계정이 하나도 없으면 admin/blp00487 계정을 만들어준다. */
function seedAdminUser_() {
  var schema = schemaFor_("users");
  var sheet = getSheet_(schema.sheet);
  var existing = sheetToObjects_(sheet);
  var hasAdmin = existing.some(function (u) {
    return u.isAdmin === true || u.isAdmin === "TRUE" || u.isAdmin === "true";
  });
  if (hasAdmin) return;

  var teamsSheet = getSheet_(schemaFor_("teams").sheet);
  var teams = sheetToObjects_(teamsSheet);
  if (teams.length === 0) {
    appendRow_(teamsSheet, schemaFor_("teams").headers, { id: "관리팀", name: "관리팀" });
    teams = [{ id: "관리팀", name: "관리팀" }];
  }
  var firstTeamId = teams[0].id;

  appendRow_(sheet, schema.headers, {
    id: "admin",
    name: "관리자",
    username: "admin",
    // "blp00487"의 SHA-256 해시 — src/lib/auth.ts의 DEFAULT_PASSWORD_HASH와 동일.
    passwordHash: "64509e10f96da60ea4d78388184d66f155a7ca5edd223644fb8796b2c60d3eff",
    teamId: firstTeamId,
    viewTeamIds: JSON.stringify(teams.map(function (t) { return t.id; })),
    level: 1,
    isAdmin: true,
  });
}

function showApiToken() {
  var token = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  if (!token) {
    SpreadsheetApp.getUi().alert("먼저 메뉴의 '1. 초기 설정'을 실행해주세요.");
    return;
  }
  SpreadsheetApp.getUi().alert("API 토큰", token, SpreadsheetApp.getUi().ButtonSet.OK);
}

function openImportDialog() {
  var html = HtmlService.createHtmlOutputFromFile("Import").setWidth(520).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, "기존 데이터 가져오기");
}

/**
 * Import.html에서 호출한다. 업무관리 시스템의 관리자 설정 → 데이터(DB)
 * 구조 → "전체 JSON 내보내기"로 받은 파일의 내용을 그대로 받는다.
 * 이미 시트에 있는 데이터는 지우지 않고 그 뒤에 추가한다 — 완전히 새로
 * 시작하려면 가져오기 전에 각 시트의 기존 데이터 행을 직접 지워라.
 */
function importExportedJson(jsonText) {
  var data = JSON.parse(jsonText);
  var counts = {};

  (data.teams || []).forEach(function (t) {
    handleCreate_("teams", t);
  });
  counts.teams = (data.teams || []).length;

  (data.centers || []).forEach(function (name) {
    handleCreate_("centers", { name: name });
  });
  counts.centers = (data.centers || []).length;

  var mediumCount = 0;
  Object.keys(data.categoriesByTeam || {}).forEach(function (teamId) {
    (data.categoriesByTeam[teamId] || []).forEach(function (large) {
      handleCreate_("categoryLarge", { id: large.id, teamId: teamId, name: large.name, code: large.code });
      (large.children || []).forEach(function (medium) {
        handleCreate_("categoryMedium", { id: medium.id, largeId: large.id, name: medium.name, code: medium.code });
        mediumCount++;
      });
    });
  });
  counts.categoryMedium = mediumCount;

  (data.boards || []).forEach(function (b) {
    handleCreate_("boards", b);
  });
  counts.boards = (data.boards || []).length;

  (data.customFields || []).forEach(function (f) {
    handleCreate_("customFields", f);
  });
  counts.customFields = (data.customFields || []).length;

  (data.users || []).forEach(function (u) {
    handleCreate_("users", u);
  });
  counts.users = (data.users || []).length;

  var checklistCount = 0;
  (data.tasks || []).forEach(function (t) {
    var checklist = t.checklist || [];
    var rest = {};
    Object.keys(t).forEach(function (k) {
      if (k !== "checklist") rest[k] = t[k];
    });
    handleCreate_("tasks", rest);
    checklistCount += flattenAndCreateChecklist_(t.id, null, checklist);
  });
  counts.tasks = (data.tasks || []).length;
  counts.checklistItems = checklistCount;

  (data.logEntries || []).forEach(function (l) {
    handleCreate_("logEntries", l);
  });
  counts.logEntries = (data.logEntries || []).length;

  (data.comments || []).forEach(function (c) {
    handleCreate_("comments", c);
  });
  counts.comments = (data.comments || []).length;

  // 자료실 파일은 base64가 그대로 들어있으면 시트 셀 용량(약 5만자)을 금방
  // 넘기므로, 가져오는 김에 드라이브에 올리고 링크만 저장한다.
  (data.resources || []).forEach(function (r) {
    var files = (r.files || []).map(function (f) {
      if (!f.base64) return f;
      var uploaded = handleUploadFile_({
        fileName: f.name,
        mimeType: f.mimeType,
        base64Data: f.base64,
      });
      return {
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        driveFileId: uploaded.driveFileId,
        url: uploaded.url,
        base64: "",
      };
    });
    handleCreate_("resources", {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      files: files,
      uploadedBy: r.uploadedBy,
      createdAt: r.createdAt,
    });
  });
  counts.resources = (data.resources || []).length;

  return counts;
}

function flattenAndCreateChecklist_(taskId, parentId, items) {
  var count = 0;
  (items || []).forEach(function (item) {
    handleCreate_("checklistItems", {
      id: item.id,
      taskId: taskId,
      parentId: parentId || "",
      label: item.label,
      progress: item.progress,
      dueDate: item.dueDate || "",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || "",
    });
    count++;
    count += flattenAndCreateChecklist_(taskId, item.id, item.children);
  });
  return count;
}
