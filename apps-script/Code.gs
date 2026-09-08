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
 */
function getAppTitle_() {
  try {
    var rows = sheetToObjects_(getSheet_(schemaFor_("settings").sheet));
    var row = rows[0];
    return (row && row.appTitle) || "물류센터 업무관리 시스템";
  } catch (e) {
    return "물류센터 업무관리 시스템";
  }
}

function doPost(e) {
  var raw = e && e.postData && e.postData.contents;
  return handleApiRequest_(raw);
}

function handleApiRequest_(raw) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = {};
    try {
      body = JSON.parse(raw);
    } catch (parseErr) {
      throw new Error("요청을 해석할 수 없습니다 (JSON 형식이어야 합니다)");
    }
    checkToken_(body.token);
    var data = route_(body.action, body.payload || {});
    return jsonResponse_({ ok: true, data: data });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
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

function handleBootstrap_() {
  var teams = sheetToObjects_(getSheet_(schemaFor_("teams").sheet));
  var centers = sheetToObjects_(getSheet_(schemaFor_("centers").sheet)).map(function (r) {
    return r.name;
  });

  var largeRows = sheetToObjects_(getSheet_(schemaFor_("categoryLarge").sheet));
  var mediumRows = sheetToObjects_(getSheet_(schemaFor_("categoryMedium").sheet));
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

  var boards = sheetToObjects_(getSheet_(schemaFor_("boards").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("boards"), r);
  });
  var customFields = sheetToObjects_(getSheet_(schemaFor_("customFields").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("customFields"), r);
  });
  var users = sheetToObjects_(getSheet_(schemaFor_("users").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("users"), r);
  });

  var taskRows = sheetToObjects_(getSheet_(schemaFor_("tasks").sheet));
  var checklistRows = sheetToObjects_(getSheet_(schemaFor_("checklistItems").sheet));
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

  var logEntries = sheetToObjects_(getSheet_(schemaFor_("logEntries").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("logEntries"), r);
  });
  var comments = sheetToObjects_(getSheet_(schemaFor_("comments").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("comments"), r);
  });
  var resources = sheetToObjects_(getSheet_(schemaFor_("resources").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("resources"), r);
  });
  var notifications = sheetToObjects_(getSheet_(schemaFor_("notifications").sheet)).map(function (r) {
    return decodeRow_(schemaFor_("notifications"), r);
  });

  var settingsRows = sheetToObjects_(getSheet_(schemaFor_("settings").sheet));
  var settings = settingsRows[0]
    ? decodeRow_(schemaFor_("settings"), settingsRows[0])
    : { id: "app", appTitle: "물류센터 업무관리 시스템" };

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
