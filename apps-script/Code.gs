/**
 * 웹 앱 진입점. 프론트엔드는 전부 doGet의 쿼리 파라미터로 통신한다.
 *
 * 왜 POST가 아니라 GET인가: Apps Script 웹 앱의 /exec 주소는 실제 실행
 * 서버(script.googleusercontent.com)로 302 리다이렉트된다. 그런데 브라우저
 * fetch() 표준(Fetch 스펙)은 POST 요청이 301/302 리다이렉트를 만나면
 * 요청을 자동으로 GET으로 바꾸고 본문(body)을 버린다 — 그 결과 실제로는
 * 토큰도 action도 서버에 전혀 전달되지 않고, doGet만 계속 호출된다(실행
 * 기록에 doPost가 한 번도 안 찍히는 게 그 증거). GET은 리다이렉트를 거쳐도
 * 메서드가 바뀌지 않으므로, 전체 API를 GET 쿼리 파라미터 기반으로 통일한다.
 * (POST 핸들러도 남겨두지만 — 서버 대 서버 호출 등 리다이렉트를 타지 않는
 * 환경을 위한 것으로, 브라우저 프론트엔드는 쓰지 않는다.)
 *
 * 요청: GET ?data=<JSON.stringify({action, token, payload}) 를 encodeURIComponent>
 * 응답 본문: { ok: true, data } 또는 { ok: false, error }
 * data 파라미터가 없는 순수 GET(주소창에 직접 열었을 때)은 업무관리 시스템
 * 앱 화면 자체를 돌려준다 — 이 배포 URL 하나가 화면과 API를 동시에 서빙
 * 한다. 팀원들에게 파일을 따로 나눠줄 필요 없이 이 주소만 공유하면 된다.
 */

function doGet(e) {
  var raw = e && e.parameter && e.parameter.data;
  if (raw) {
    return handleApiRequest_(raw);
  }
  return serveApp_(e);
}

// Excel 다운로드 기능이 쓰는 서식 라이브러리(ExcelJS)는 앱스크립트
// 프로젝트에 파일로 담지 않는다 — 최소화해도 800KB 이상이라 프로젝트에
// 직접 저장하려 했더니, 어떤 방식으로 나누거나 감싸도 실제 배포에서
// 매번 일정량(전체의 약 1% 정도)이 손실된 채로 저장돼 원인을 특정하지
// 못했다(구글 앱스스크립트 저장소 자체의 용량/처리 한계로 추정). 그래서
// App.html의 <head>에 있는 <script src="https://cdnjs...">로 직접
// 불러오도록 바꿨다 — 이 파일(Code.gs)에는 관련 코드가 없다.

/**
 * 화면(App.html)은 파일 하나로 유지한다 — <?!= include(...); ?>로 조각
 * 파일을 합치는 방식을 시도했었으나, 실제 배포에서 크기와 무관하게 파싱
 * 에러가 반복 발생해 포기했다(로컬 테스트로는 재현되지 않는 문제였다).
 */
/**
 * 이 배포의 안정적인 웹 앱 주소(재배포해도 바뀌지 않음)를 앱 화면에 심어준다.
 * 주소에 ?t=<API_TOKEN>이 붙어 있으면("초대 링크") 그 토큰도 함께 심어서,
 * 프론트엔드가 별도 입력 없이 자동으로 연동을 마칠 수 있게 한다 — 관리자가
 * 매번 팀원에게 토큰을 따로 알려줄 필요가 없다.
 */
function serveApp_(e) {
  var appHtml = HtmlService.createHtmlOutputFromFile("App").getContent();
  var backendUrl = ScriptApp.getService().getUrl();
  // e.parameter.t는 URL 쿼리 파라미터라 누구나 원하는 값을 넣어 요청할 수
  // 있다 — 실제 발급된 토큰(32자리 16진수, Utilities.getUuid() 기반)
  // 형태가 아니면 무시하고, 그래도 아래에서 한 번 더 이스케이프해 이
  // 값이 인라인 <script> 태그를 조기 종료시키는 데(예: "</script><script>...")
  // 쓰이지 못하게 막는다.
  var inviteTokenRaw = (e && e.parameter && e.parameter.t) || "";
  var inviteToken = /^[a-f0-9]{16,64}$/i.test(inviteTokenRaw) ? inviteTokenRaw : "";
  var bootstrap =
    "<script>window.__DKE_BACKEND_URL__=" + escapeForInlineScript_(JSON.stringify(backendUrl)) +
    ";window.__DKE_INVITE_TOKEN__=" + escapeForInlineScript_(JSON.stringify(inviteToken)) + ";</script>";
  var withBootstrap = appHtml.replace("<head>", "<head>" + bootstrap);
  return HtmlService.createHtmlOutput(withBootstrap)
    .setTitle(getAppTitle_())
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** JSON 문자열 안에 "</script"가 있어도 인라인 <script> 태그를 조기 종료시키지 못하게 막는다. */
function escapeForInlineScript_(json) {
  return json.replace(/<\/script/gi, "<\\/script");
}

/**
 * 관리자가 "일반 설정"에서 바꾼 프로그램 제목. 아직 setup()을 실행하지
 * 않았거나(시트 없음) settings 행이 비어있으면 기본값으로 대체한다 —
 * 브라우저 탭 제목(serveApp_)과 bootstrap 응답(화면 상단바·로그인 화면)
 * 양쪽에서 공용으로 쓴다.
 *
 * serveApp_이 화면을 돌려주기 전에 매번 이 함수를 불러 스프레드시트를
 * 여는데, 시트 열기 자체가 앱스크립트에서 결코 가볍지 않아(수 초씩 걸릴
 * 수 있음) 접속할 때마다 이 왕복이 그대로 "페이지가 안 뜬다"는 체감
 * 지연으로 이어진다. 값 자체는 자주 바뀌지 않으므로 캐시해서, 관리자가
 * 제목을 바꾼 직후를 빼면 대부분의 접속은 시트를 아예 열지 않고 끝난다.
 */
function getAppTitle_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("app_title");
  if (cached !== null) return cached;

  var title = "물류센터 업무관리 시스템";
  try {
    var rows = sheetToObjects_(getSheet_(schemaFor_("settings").sheet));
    var row = rows[0];
    title = (row && row.appTitle) || title;
  } catch (e) {
    // 시트가 아직 없는 등 — 기본값을 그대로 쓴다.
  }
  try {
    cache.put("app_title", title, 300); // 5분
  } catch (e) {
    // 캐시 저장에 실패해도 기능에는 지장 없다 — 다음 요청이 다시 시트를 읽을 뿐이다.
  }
  return title;
}

function doPost(e) {
  var raw = e && e.postData && e.postData.contents;
  return handleApiRequest_(raw);
}

// 시트에 실제로 쓰는(create/update/delete) 요청끼리만 서로 겹치지 않게
// 막으면 된다 — bootstrap/list/ping 같은 읽기 전용 요청은 동시에 여러 개가
// 들어와도 서로 부딪힐 게 없다. 예전에는 모든 요청이 이 락 하나를 함께
// 기다렸는데, 사용자가 여러 명 접속해 있으면(특히 30초마다 자동으로
// bootstrap을 다시 부르는 새로고침 기능 때문에) 다들 순서대로 줄을 서서
// 기다리게 되어 화면 표시 자체가 눈에 띄게 느려지는 원인이 됐다.
var WRITE_ACTIONS_ = { create: true, update: true, delete: true, deleteFile: true };

function handleApiRequest_(raw) {
  var body = {};
  try {
    body = JSON.parse(raw);
  } catch (parseErr) {
    return jsonResponse_({ ok: false, error: "요청을 해석할 수 없습니다 (JSON 형식이어야 합니다)" });
  }

  var lock = WRITE_ACTIONS_[body.action] ? LockService.getScriptLock() : null;
  if (lock) lock.waitLock(30000);
  try {
    checkToken_(body.token);
    var data = route_(body.action, body.payload || {});
    // 쓰기 작업(SpreadsheetApp.setValues 등)은 스크립트 실행이 끝날 때
    // 자동으로 반영되지만, 그 시점까지는 같은 시트를 다른 실행(다른
    // 사용자의 동시 요청, 또는 batchGet 기반 bootstrap)이 고급 Sheets
    // API로 읽을 때 아직 반영 전 값을 볼 수 있다 — 락을 놓기 전에 명시적
    // 으로 flush해서, 이 요청이 끝난 뒤 시작되는 다른 요청은 항상 방금
    // 쓴 값을 보게 만든다.
    if (lock) SpreadsheetApp.flush();
    return jsonResponse_({ ok: true, data: data });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    if (lock) lock.releaseLock();
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** 설치 시 setup()이 생성한 토큰과 요청의 토큰이 일치하는지 확인한다. */
function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  if (!expected) {
    throw new Error("서버에 API 토큰이 설정되어 있지 않습니다. 먼저 setup()을 실행하세요.");
  }
  if (!token || token !== expected) {
    throw new Error("인증 토큰이 올바르지 않습니다.");
  }
}

function route_(action, payload) {
  switch (action) {
    case "ping":
      return { pong: true };
    case "bootstrap":
      return handleBootstrap_();
    case "create":
      return handleCreate_(payload.entity, payload.record);
    case "update":
      return handleUpdate_(payload.entity, payload.id, payload.patch);
    case "delete":
      return handleDelete_(payload.entity, payload.id);
    case "list":
      return handleList_(payload.entity, payload.options || {});
    case "deleteFile":
      return handleDeleteFile_(payload);
    default:
      throw new Error("알 수 없는 action: " + action);
  }
}

// ---------------------------------------------------------------------
// 제네릭 CRUD — Schema.gs의 SCHEMA에 등록된 모든 엔티티에 공통 적용
// ---------------------------------------------------------------------

function handleCreate_(entity, record) {
  var schema = schemaFor_(entity);
  var sheet = getSheet_(schema.sheet);
  var row = encodeRecord_(schema, record || {});
  appendRow_(sheet, schema.headers, row);
  return record;
}

function handleUpdate_(entity, id, patch) {
  var schema = schemaFor_(entity);
  var sheet = getSheet_(schema.sheet);
  var idField = schema.idField || "id";
  var encodedPatch = encodeRecord_(schema, patch || {});
  var updated = updateRowByField_(sheet, schema.headers, idField, id, encodedPatch);
  if (entity === "settings") {
    // 프로그램 제목을 바꾼 직후에는 getAppTitle_의 5분 캐시가 옛 값을
    // 계속 돌려주지 않도록 바로 비운다.
    try {
      CacheService.getScriptCache().remove("app_title");
    } catch (e) {
      // 무시 — 최악의 경우 최대 5분간 이전 제목이 보일 뿐이다.
    }
  }
  return decodeRow_(schema, updated);
}

function handleDelete_(entity, id) {
  var schema = schemaFor_(entity);
  var sheet = getSheet_(schema.sheet);
  var idField = schema.idField || "id";

  // 댓글/진행 일지 자체가 지워질 때 그 첨부파일도 삭제예정 폴더로 옮긴다
  // (업무·체크리스트 삭제로 인한 연쇄 삭제는 각 cascadeDelete*_ 함수가
  // 처리한다).
  if (entity === "comments" || entity === "logEntries") {
    var target = sheetToObjects_(sheet).find(function (r) {
      return r[idField] === id;
    });
    if (target) moveRowAttachmentsToPendingDelete_(target.attachments);
  }
  // 댓글이 지워지면 그 댓글 때문에 생긴 알림도 함께 지운다.
  if (entity === "comments") {
    deleteNotificationsForComment_(id);
  }

  deleteRowByField_(sheet, schema.headers, idField, id);

  // 하위 데이터도 함께 정리한다 (프론트엔드 store.tsx의 로컬 삭제 로직과
  // 동일한 규칙 — 업무 삭제 시 체크리스트/진행 일지/관련 댓글도 제거).
  if (entity === "tasks") {
    cascadeDeleteTask_(id);
  } else if (entity === "checklistItems") {
    cascadeDeleteChecklistItem_(id);
  } else if (entity === "logEntries") {
    cascadeDeleteCommentsFor_("log", id);
  } else if (entity === "categoryLarge") {
    cascadeDeleteCategoryLarge_(id);
  }

  return { id: id };
}

/**
 * bootstrap에 포함되지 않는 엔티티(현재는 activityLogs)를 필요할 때만
 * 조회한다. userId를 주면 그 사용자 것만, limit을 주면 최신순으로 그
 * 개수만큼만 돌려준다.
 */
function handleList_(entity, options) {
  var schema = schemaFor_(entity);
  var sheet = getSheet_(schema.sheet);
  var rows = sheetToObjects_(sheet).map(function (r) {
    return decodeRow_(schema, r);
  });
  if (options && options.userId) {
    rows = rows.filter(function (r) {
      return r.userId === options.userId;
    });
  }
  rows.sort(function (a, b) {
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  if (options && options.limit) {
    rows = rows.slice(0, options.limit);
  }
  return rows;
}

function cascadeDeleteTask_(taskId) {
  var checklistSchema = schemaFor_("checklistItems");
  var checklistSheet = getSheet_(checklistSchema.sheet);
  var checklistRows = sheetToObjects_(checklistSheet).filter(function (r) {
    return r.taskId === taskId;
  });
  checklistRows.forEach(function (r) {
    deleteRowByField_(checklistSheet, checklistSchema.headers, "id", r.id);
    cascadeDeleteCommentsFor_("checklist", r.id);
  });

  var logSchema = schemaFor_("logEntries");
  var logSheet = getSheet_(logSchema.sheet);
  var logRows = sheetToObjects_(logSheet).filter(function (r) {
    return r.taskId === taskId;
  });
  logRows.forEach(function (r) {
    moveRowAttachmentsToPendingDelete_(r.attachments);
    deleteRowByField_(logSheet, logSchema.headers, "id", r.id);
    cascadeDeleteCommentsFor_("log", r.id);
  });
}

function cascadeDeleteChecklistItem_(itemId) {
  var schema = schemaFor_("checklistItems");
  var sheet = getSheet_(schema.sheet);
  var rows = sheetToObjects_(sheet);
  var removedIds = collectSubtreeIds_(rows, itemId);
  removedIds.forEach(function (id) {
    deleteRowByField_(sheet, schema.headers, "id", id);
    cascadeDeleteCommentsFor_("checklist", id);
  });
}

function collectSubtreeIds_(rows, rootId) {
  var ids = [rootId];
  rows
    .filter(function (r) {
      return r.parentId === rootId;
    })
    .forEach(function (child) {
      ids = ids.concat(collectSubtreeIds_(rows, child.id));
    });
  return ids;
}

function cascadeDeleteCommentsFor_(targetType, targetId) {
  var schema = schemaFor_("comments");
  var sheet = getSheet_(schema.sheet);
  sheetToObjects_(sheet).forEach(function (c) {
    if (c.targetType === targetType && c.targetId === targetId) {
      moveRowAttachmentsToPendingDelete_(c.attachments);
      deleteNotificationsForComment_(c.id);
      deleteRowByField_(sheet, schema.headers, "id", c.id);
    }
  });
}

/** 댓글 하나가 지워질 때, 그 댓글 때문에 만들어진 알림들을 함께 지운다. */
function deleteNotificationsForComment_(commentId) {
  var schema = schemaFor_("notifications");
  var sheet = getSheet_(schema.sheet);
  sheetToObjects_(sheet)
    .filter(function (n) {
      return n.commentId === commentId;
    })
    .forEach(function (n) {
      deleteRowByField_(sheet, schema.headers, "id", n.id);
    });
}

function cascadeDeleteCategoryLarge_(largeId) {
  var schema = schemaFor_("categoryMedium");
  var sheet = getSheet_(schema.sheet);
  sheetToObjects_(sheet)
    .filter(function (r) {
      return r.largeId === largeId;
    })
    .forEach(function (r) {
      deleteRowByField_(sheet, schema.headers, "id", r.id);
    });
}

// ---------------------------------------------------------------------
// bootstrap — 프론트엔드가 처음 로드할 때 한 번에 받아가는 전체 데이터
// ---------------------------------------------------------------------

// bootstrap이 쓰는 엔티티만(activityLogs 제외 — 그건 "기록" 탭에서만
// 따로 조회한다) 나열해서, 시트 이름 하나로 batchGet 결과 맵과
// schemaFor_ 양쪽을 다 찾을 수 있게 한다.
var BOOTSTRAP_ENTITIES_ = [
  "teams", "centers", "categoryLarge", "categoryMedium", "boards",
  "customFields", "users", "tasks", "checklistItems", "logEntries",
  "comments", "resources", "notifications", "settings", "calendarEvents",
  "newsItems",
];

/**
 * 시트를 하나씩(엔티티 개수만큼) 여는 대신 구글 "고급 Sheets API"의
 * batchGet으로 전부 한 번의 호출에 묶어서 읽는다 — 시트를 열 때마다
 * 생기는 왕복 오버헤드가 데이터가 많아질수록 그대로 지연으로 쌓이는데,
 * 이 방식은 몇 개를 읽든 왕복이 한 번이라 그 오버헤드가 늘어나지 않는다.
 *
 * 이 서비스는 Apps Script 편집기에서 따로 켜야 한다(왼쪽 "서비스" 옆 +
 * → Google Sheets API 추가). 켜져 있지 않거나 이 호출이 어떤 이유로든
 * 실패하면 여기서 예외가 나고, 호출부(handleBootstrap_)가 그 사실을
 * 감지해서 시트를 하나씩 읽는 예전 방식으로 그대로 되돌아간다 — 즉
 * 이 최적화가 실패해도 bootstrap 자체가 죽지는 않고, 다만 느려질 뿐이다.
 * 실패 사유는 Apps Script 실행 기록(Executions)의 로그에 남는다.
 */
function batchReadAllSheets_(sheetNames) {
  var ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
  var response = Sheets.Spreadsheets.Values.batchGet(ssId, {
    ranges: sheetNames,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  var byName = {};
  (response.valueRanges || []).forEach(function (vr, i) {
    byName[sheetNames[i]] = valuesToObjects_(sheetNames[i], vr.values || []);
  });
  return byName;
}

// "@"(일반 텍스트) 서식을 걸어놔도(forceTextFormat_) 구글 시트가 날짜처럼
// 생긴 문자열을 API로 쓸 때 내부적으로 "날짜 타입" 셀로 재해석해버리는
// 경우가 있다 — SpreadsheetApp.getValues() 경로였다면 이런 셀이 Date
// 객체로 돌아와서 normalizeCellValue_가 ISO 문자열로 되돌려주는데, batchGet
// 경로는 같은 셀을 Date 객체가 아니라 시트 내부 날짜 일련번호(숫자)로
// 돌려줘서 그 안전장치를 그냥 통과해버린다.
//
// 필드마다 원래 문자열 형태가 다르다 — dueDate/completedAt/startDate/
// endDate는 항상 "YYYY-MM-DD"만, updatedAt/editedAt은 항상 전체 ISO
// 일시만 쓴다. createdAt만 예외적으로 시트마다 다르다(Tasks·
// CalendarEvents는 "YYYY-MM-DD", 나머지는 전체 ISO 일시) — 그래서 어떤
// 시트에서 온 값인지도 함께 봐야 한다.
var DATE_ONLY_HEADERS_ = { dueDate: true, completedAt: true, startDate: true, endDate: true };
var DATETIME_HEADERS_ = { updatedAt: true, editedAt: true };
var DATE_ONLY_CREATEDAT_SHEETS_ = { Tasks: true, CalendarEvents: true };

// 구글 시트(엑셀과 동일)의 날짜 일련번호 기준일(1899-12-30)과 유닉스
// 기준일(1970-01-01) 사이의 일수 — 이 값을 빼고 하루(ms)를 곱하면 유닉스
// 시각이 나온다.
var SHEETS_EPOCH_OFFSET_DAYS_ = 25569;

function coerceBatchGetValue_(sheetName, header, v) {
  if (typeof v !== "number") return v;
  var dateOnly = DATE_ONLY_HEADERS_[header] || (header === "createdAt" && DATE_ONLY_CREATEDAT_SHEETS_[sheetName]);
  var datetime = DATETIME_HEADERS_[header] || (header === "createdAt" && !DATE_ONLY_CREATEDAT_SHEETS_[sheetName]);
  if (!dateOnly && !datetime) return v; // progress/level 등 실제 숫자 필드는 그대로 둔다
  var ms = Math.round((v - SHEETS_EPOCH_OFFSET_DAYS_) * 86400 * 1000);
  var iso = new Date(ms).toISOString();
  return dateOnly ? iso.slice(0, 10) : iso;
}

/** batchGet이 돌려준 2차원 배열을, sheetToObjects_와 같은 모양(헤더 기준 객체 배열)으로 바꾼다. */
function valuesToObjects_(sheetName, values) {
  if (values.length < 2) return [];
  var headers = values[0];
  return values
    .slice(1)
    .filter(function (row) {
      return row[0] !== "" && row[0] !== undefined && row[0] !== null;
    })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        var v = row[i] === undefined ? "" : row[i];
        obj[h] = normalizeCellValue_(coerceBatchGetValue_(sheetName, h, v));
      });
      return obj;
    });
}

function handleBootstrap_() {
  var sheetNames = BOOTSTRAP_ENTITIES_.map(function (entity) {
    return schemaFor_(entity).sheet;
  });
  var byName = null;
  try {
    byName = batchReadAllSheets_(sheetNames);
    Logger.log("bootstrap: batchGet 성공 (" + sheetNames.length + "개 시트를 한 번에 읽음)");
  } catch (e) {
    Logger.log("bootstrap: batchGet 실패, 시트별 개별 조회로 대체 — 사유: " + e);
    byName = null;
  }

  /** entity에 해당하는 원본 행(디코딩 전)을, batchGet 결과가 있으면 그걸, 없으면 예전 방식으로 읽어 돌려준다. */
  function rowsFor(entity) {
    var sheet = schemaFor_(entity).sheet;
    if (byName && byName[sheet]) return byName[sheet];
    return sheetToObjects_(getSheet_(sheet));
  }

  var teams = rowsFor("teams");
  var centers = rowsFor("centers").map(function (r) {
    return r.name;
  });

  var largeRows = rowsFor("categoryLarge");
  var mediumRows = rowsFor("categoryMedium");
  var mediumsByLarge = {};
  mediumRows.forEach(function (m) {
    if (!mediumsByLarge[m.largeId]) mediumsByLarge[m.largeId] = [];
    mediumsByLarge[m.largeId].push({ id: m.id, name: m.name, code: m.code });
  });
  var categoriesByTeam = {};
  largeRows.forEach(function (l) {
    if (!categoriesByTeam[l.teamId]) categoriesByTeam[l.teamId] = [];
    categoriesByTeam[l.teamId].push({
      id: l.id,
      name: l.name,
      code: l.code,
      children: mediumsByLarge[l.id] || [],
    });
  });

  var boards = rowsFor("boards").map(function (r) {
    return decodeRow_(schemaFor_("boards"), r);
  });
  var customFields = rowsFor("customFields").map(function (r) {
    return decodeRow_(schemaFor_("customFields"), r);
  });
  var users = rowsFor("users").map(function (r) {
    return decodeRow_(schemaFor_("users"), r);
  });

  var taskRows = rowsFor("tasks");
  var checklistRows = rowsFor("checklistItems");
  var checklistByTask = {};
  checklistRows.forEach(function (row) {
    if (!checklistByTask[row.taskId]) checklistByTask[row.taskId] = [];
    checklistByTask[row.taskId].push(row);
  });
  var tasks = taskRows.map(function (row) {
    var task = decodeRow_(schemaFor_("tasks"), row);
    task.checklist = buildChecklistTree_(checklistByTask[row.id] || [], "");
    return task;
  });

  var logEntries = rowsFor("logEntries").map(function (r) {
    return decodeRow_(schemaFor_("logEntries"), r);
  });
  var comments = rowsFor("comments").map(function (r) {
    return decodeRow_(schemaFor_("comments"), r);
  });
  var resources = rowsFor("resources").map(function (r) {
    return decodeRow_(schemaFor_("resources"), r);
  });
  var notifications = rowsFor("notifications").map(function (r) {
    return decodeRow_(schemaFor_("notifications"), r);
  });

  var settingsRows = rowsFor("settings");
  var settings = settingsRows[0]
    ? decodeRow_(schemaFor_("settings"), settingsRows[0])
    : { id: "app", appTitle: "물류센터 업무관리 시스템" };

  var calendarEvents = rowsFor("calendarEvents").map(function (r) {
    return decodeRow_(schemaFor_("calendarEvents"), r);
  });

  var newsItems = rowsFor("newsItems").map(function (r) {
    return decodeRow_(schemaFor_("newsItems"), r);
  });

  return {
    teams: teams,
    centers: centers,
    categoriesByTeam: categoriesByTeam,
    boards: boards,
    customFields: customFields,
    users: users,
    tasks: tasks,
    logEntries: logEntries,
    comments: comments,
    resources: resources,
    notifications: notifications,
    settings: settings,
    calendarEvents: calendarEvents,
    newsItems: newsItems,
  };
}

/** 평평한 행 배열에서 parentId로 연결된 ChecklistItem[] 트리를 만든다. */
function buildChecklistTree_(rows, parentId) {
  return rows
    .filter(function (r) {
      return (r.parentId || "") === parentId;
    })
    .map(function (r) {
      return {
        id: r.id,
        label: r.label,
        progress: r.progress,
        dueDate: r.dueDate || undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt || undefined,
        children: buildChecklistTree_(rows, r.id),
      };
    });
}
