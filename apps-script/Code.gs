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
  return serveApp_();
}

/**
 * App.html/Style.html/Function.html을 <?!= include(...); ?> 스크립틀릿으로
 * 합치는 방식을 시도했었으나, 실제 배포에서 "Unexpected identifier '$'"
 * 파싱 에러가 파일 크기와 무관하게 반복 발생했다(360KB짜리도 실패) —
 * 반면 예전에 실제로 성공했던 체크포인트는 644KB나 됐지만 스크립틀릿 없이
 * 파일 하나였다. 즉 크기가 아니라 그 템플릿 방식 자체가 실제 앱스크립트
 * 환경에서 문제였던 것으로 보고(로컬 시뮬레이션으로는 재현 불가), 그
 * 방식을 버리고 예전에 확실히 동작했던 단순한 방식(파일 하나,
 * createHtmlOutputFromFile만 사용)으로 되돌린다.
 */

/** 이 배포의 안정적인 웹 앱 주소(재배포해도 바뀌지 않음)를 앱 화면에 심어준다. */
function serveApp_() {
  var appHtml = HtmlService.createHtmlOutputFromFile("App").getContent();
  var backendUrl = ScriptApp.getService().getUrl();
  var bootstrap = "<script>window.__DKE_BACKEND_URL__=" + JSON.stringify(backendUrl) + ";</script>";
  var withBootstrap = appHtml.replace("<head>", "<head>" + bootstrap);
  return HtmlService.createHtmlOutput(withBootstrap)
    .setTitle("물류센터 업무관리 시스템")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
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
    case "uploadFile":
      return handleUploadFile_(payload);
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
      deleteRowByField_(sheet, schema.headers, "id", c.id);
    }
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
