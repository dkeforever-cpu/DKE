/**
 * 웹 앱 진입점. 프론트엔드는 전부 doPost로만 통신한다 (doGet은 브라우저로
 * 배포 URL을 열어봤을 때 에러 대신 상태 메시지를 보여주는 용도).
 *
 * 중요 (프론트엔드 계약): 브라우저 fetch()는 이 URL에 반드시
 * Content-Type: text/plain;charset=utf-8 로 보내야 한다 (application/json
 * 아님). Apps Script 웹 앱은 CORS 프리플라이트(OPTIONS)에 응답하지 못하기
 * 때문에, "진짜" JSON Content-Type은 프리플라이트를 유발해서 실패한다.
 * text/plain으로 보내면 "simple request"로 취급돼 프리플라이트 없이
 * 바로 전송되고, 본문은 서버에서 수동으로 JSON.parse 한다.
 *
 * 요청 본문: { action, token, payload }
 * 응답 본문: { ok: true, data } 또는 { ok: false, error }
 */

function doGet(e) {
  return jsonResponse_({
    ok: true,
    data: { status: "물류센터 업무관리 시스템 백엔드 정상 동작 중" },
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = {};
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      throw new Error("요청 본문을 해석할 수 없습니다 (JSON 형식이어야 합니다)");
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
