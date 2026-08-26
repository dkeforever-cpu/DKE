/**
 * Web App entry points. All reads/writes go through doPost with an
 * `action` field in the JSON body; doGet only serves a health check
 * so opening the deployment URL in a browser doesn't error.
 *
 * IMPORTANT (frontend contract): browser fetch() calls to this Web App
 * must send Content-Type: text/plain;charset=utf-8, NOT application/json.
 * Apps Script Web Apps don't answer CORS preflight (OPTIONS) requests,
 * so a "real" JSON content type triggers a preflight that fails. Sending
 * text/plain keeps the request "simple" (no preflight), and the body is
 * still parsed as JSON server-side below.
 */

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action) {
    try {
      var data = route_(action, e.parameter);
      return jsonResponse_({ ok: true, data: data });
    } catch (err) {
      return jsonResponse_({ ok: false, error: String((err && err.message) || err) });
    }
  }
  return jsonResponse_({ ok: true, data: { status: "DKE 업무관리 시스템 API 정상 동작 중" } });
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
    var action = body.action;
    var payload = body.payload || {};
    var data = route_(action, payload);
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

/** Dispatches an action name to its handler. Keep in sync with Handlers.gs / Drive.gs. */
function route_(action, payload) {
  switch (action) {
    case "bootstrap":
      return handleBootstrap_();

    case "createTask":
      return handleCreateTask_(payload);
    case "updateTask":
      return handleUpdateTask_(payload);
    case "deleteTask":
      return handleDeleteTask_(payload);

    case "createChecklistItem":
      return handleCreateChecklistItem_(payload);
    case "updateChecklistItem":
      return handleUpdateChecklistItem_(payload);
    case "deleteChecklistItem":
      return handleDeleteChecklistItem_(payload);

    case "createLogEntry":
      return handleCreateLogEntry_(payload);
    case "updateLogEntry":
      return handleUpdateLogEntry_(payload);
    case "deleteLogEntry":
      return handleDeleteLogEntry_(payload);

    case "createComment":
      return handleCreateComment_(payload);
    case "updateComment":
      return handleUpdateComment_(payload);
    case "deleteComment":
      return handleDeleteComment_(payload);

    case "uploadFile":
      return handleUploadFile_(payload);

    default:
      throw new Error("알 수 없는 action: " + action);
  }
}
