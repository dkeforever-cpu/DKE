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
  seedSettingsRow_();

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
  // 날짜처럼 생긴 문자열(created At 등)을 구글 시트가 멋대로 "날짜" 타입
  // 셀로 재해석하지 못하도록, 데이터 영역 전체를 일반 텍스트 서식으로
  // 고정한다. 이미 만들어진 시트에 "1. 초기 설정"을 다시 실행해도 적용되게
  // 매번 호출한다 (신규 생성 여부와 무관하게).
  forceTextFormat_(sheet);
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

/** 설정 시트가 비어있으면(최초 설치, 또는 이 기능 이전에 이미 설치된 경우) 기본 제목으로 한 행을 만들어준다. */
function seedSettingsRow_() {
  var schema = schemaFor_("settings");
  var sheet = getSheet_(schema.sheet);
  if (sheetToObjects_(sheet).length > 0) return;
  appendRow_(sheet, schema.headers, { id: "app", appTitle: "물류센터 업무관리 시스템" });
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
 * 가져오기 전에 SCHEMA에 등록된 모든 시트를 비우고 새로 채운다 — 즉 "추가"가 아니라
 * "이 JSON으로 교체"다. 백업에서 복원하거나, 한 번 통째로 옮기는 용도에
 * 맞춘 것이다 (추가 방식이면 admin 계정 등이 중복 생기기 쉽다).
 */
function importExportedJson(jsonText) {
  var data = JSON.parse(jsonText);
  var counts = {};

  Object.keys(SCHEMA).forEach(function (entity) {
    var sheet = getSheet_(SCHEMA[entity].sheet);
    clearSheetRows_(sheet);
    forceTextFormat_(sheet);
  });

  batchCreate_("teams", data.teams || []);
  counts.teams = (data.teams || []).length;

  batchCreate_(
    "centers",
    (data.centers || []).map(function (name) {
      return { name: name };
    })
  );
  counts.centers = (data.centers || []).length;

  var largeRecords = [];
  var mediumRecords = [];
  Object.keys(data.categoriesByTeam || {}).forEach(function (teamId) {
    (data.categoriesByTeam[teamId] || []).forEach(function (large) {
      largeRecords.push({ id: large.id, teamId: teamId, name: large.name, code: large.code });
      (large.children || []).forEach(function (medium) {
        mediumRecords.push({ id: medium.id, largeId: large.id, name: medium.name, code: medium.code });
      });
    });
  });
  batchCreate_("categoryLarge", largeRecords);
  batchCreate_("categoryMedium", mediumRecords);
  counts.categoryMedium = mediumRecords.length;

  batchCreate_("boards", data.boards || []);
  counts.boards = (data.boards || []).length;

  batchCreate_("customFields", data.customFields || []);
  counts.customFields = (data.customFields || []).length;

  batchCreate_("users", data.users || []);
  counts.users = (data.users || []).length;

  var taskRecords = [];
  var checklistRecords = [];
  (data.tasks || []).forEach(function (t) {
    var rest = {};
    Object.keys(t).forEach(function (k) {
      if (k !== "checklist") rest[k] = t[k];
    });
    taskRecords.push(rest);
    collectChecklist_(t.id, null, t.checklist || [], checklistRecords);
  });
  batchCreate_("tasks", taskRecords);
  batchCreate_("checklistItems", checklistRecords);
  counts.tasks = taskRecords.length;
  counts.checklistItems = checklistRecords.length;

  batchCreate_("logEntries", data.logEntries || []);
  counts.logEntries = (data.logEntries || []).length;

  batchCreate_("comments", data.comments || []);
  counts.comments = (data.comments || []).length;

  // 자료실 파일은 base64가 그대로 들어있으면 시트 셀 용량(약 5만자)을 금방
  // 넘기므로, 가져오는 김에 드라이브에 올리고 링크만 저장한다. 드라이브
  // 업로드 자체는 파일마다 별도 API 호출이라 이 부분만은 배치로 줄일 수
  // 없다 — 그래도 시트에 쓰는 부분은 한 번에 처리한다.
  var resourceRecords = (data.resources || []).map(function (r) {
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
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      files: files,
      uploadedBy: r.uploadedBy,
      createdAt: r.createdAt,
    };
  });
  batchCreate_("resources", resourceRecords);
  counts.resources = resourceRecords.length;

  // settings는 위 루프에서 시트가 비워졌으므로, 내보낸 값이 있으면 그대로
  // 되돌리고 없으면(예전 내보내기 파일) 기본 제목으로 다시 만들어준다 —
  // 안 그러면 가져오기 한 번으로 관리자가 설정한 프로그램 제목이 사라진다.
  batchCreate_("settings", [data.settings || { id: "app", appTitle: "물류센터 업무관리 시스템" }]);

  return counts;
}

function collectChecklist_(taskId, parentId, items, out) {
  (items || []).forEach(function (item) {
    out.push({
      id: item.id,
      taskId: taskId,
      parentId: parentId || "",
      label: item.label,
      progress: item.progress,
      dueDate: item.dueDate || "",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || "",
    });
    collectChecklist_(taskId, item.id, item.children, out);
  });
}

/**
 * handleCreate_를 레코드마다 반복 호출(=시트 쓰기 API도 레코드마다 반복)
 * 하는 대신, 한 시트에 들어갈 레코드를 전부 모아 단 한 번의 범위 쓰기로
 * 처리한다. 가져오기 대상이 수백 건이면 이 차이가 몇 분과 몇 초의 차이를
 * 만든다 (Apps Script 실행 제한 시간이 계정 유형에 따라 6분 정도로 짧다).
 */
function batchCreate_(entity, records) {
  if (!records || records.length === 0) return;
  var schema = schemaFor_(entity);
  var sheet = getSheet_(schema.sheet);
  var encoded = records.map(function (r) {
    return encodeRecord_(schema, r);
  });
  appendRows_(sheet, schema.headers, encoded);
}
