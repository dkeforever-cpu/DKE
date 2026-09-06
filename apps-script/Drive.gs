/**
 * 파일 업로드: base64로 인코딩해 보낸 파일을 디코딩해서, 공유 드라이브
 * 폴더 하나에 저장한다. 링크를 아는 사람은 누구나 볼 수 있도록 공유
 * 설정하므로, 팀원 각자에게 개별 공유할 필요가 없다.
 */

var UPLOAD_FOLDER_NAME = "물류센터 업무관리 - 첨부파일";

function getOrCreateUploadFolder_() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName(UPLOAD_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return root.createFolder(UPLOAD_FOLDER_NAME);
}

/** 공용 업로드 폴더 아래에 주어진 이름의 하위 폴더를 찾거나 만든다. */
function getOrCreateSubfolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/**
 * payload: { fileName, mimeType, base64Data, folder }
 * base64Data는 "data:<mime>;base64," 접두사가 붙어있어도 되고 없어도 된다.
 * folder를 주면(업무 상세에서 올릴 때는 업무번호) 공용 폴더 아래 그 이름의
 * 하위 폴더에 저장한다 — 업무별로 첨부파일을 모아볼 수 있게 하기 위함.
 */
function handleUploadFile_(payload) {
  var fileName = payload.fileName || "첨부파일";
  var mimeType = payload.mimeType || "application/octet-stream";
  var raw = payload.base64Data || "";
  var commaIdx = raw.indexOf(",");
  if (raw.substring(0, 5) === "data:" && commaIdx !== -1) {
    raw = raw.substring(commaIdx + 1);
  }

  var bytes = Utilities.base64Decode(raw);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);

  var folder = getOrCreateUploadFolder_();
  if (payload.folder) {
    folder = getOrCreateSubfolder_(folder, String(payload.folder));
  }
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    name: fileName,
    mimeType: mimeType,
    size: bytes.length,
    driveFileId: file.getId(),
    url: "https://drive.google.com/file/d/" + file.getId() + "/view",
  };
}

/**
 * 첨부파일은 GET 쿼리 파라미터 하나로 보내기엔 너무 클 수 있어서(URL 길이
 * 제한), 클라이언트가 base64 문자열을 작은 조각으로 나눠 여러 번의 GET
 * 요청으로 보낸다. 조각들은 스크립트 캐시(최대 6시간)에 임시 보관하다가
 * 마지막 조각이 도착하면 이어붙여서 실제 드라이브 업로드를 수행한다.
 *
 * payload: { uploadId, index, total, chunk, fileName, mimeType, folder }
 *
 * chunk는 클라이언트가 base64url(A-Z a-z 0-9 - _)로 보낸다 — 일반 base64의
 * +, /, = 문자는 URL에 실을 때 퍼센트 인코딩되어 최대 3배까지 길어지므로,
 * URL에 그대로 써도 되는 base64url로 보내면 한 조각에 더 많은 데이터를
 * 실을 수 있어(=조각 수가 줄어) 업로드가 더 빠르다. 다 모으고 나서
 * 표준 base64로 되돌려 디코딩한다.
 */
function handleUploadFileChunk_(payload) {
  var cache = CacheService.getScriptCache();
  var key = "upload_" + payload.uploadId + "_" + payload.index;
  cache.put(key, payload.chunk || "", 21600);

  var isLast = payload.index === payload.total - 1;
  if (!isLast) {
    return { received: true };
  }

  var parts = [];
  for (var i = 0; i < payload.total; i++) {
    var partKey = "upload_" + payload.uploadId + "_" + i;
    var part = cache.get(partKey);
    if (part === null) {
      throw new Error("업로드 조각이 유실되었습니다. 다시 시도해주세요.");
    }
    parts.push(part);
  }
  for (var j = 0; j < payload.total; j++) {
    cache.remove("upload_" + payload.uploadId + "_" + j);
  }

  return handleUploadFile_({
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    base64Data: base64UrlToBase64_(parts.join("")),
    folder: payload.folder,
  });
}

function base64UrlToBase64_(s) {
  var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  return b64;
}

/**
 * google.script.run으로 호출된다 (일반 doGet/doPost 경로가 아니다 — 이
 * 화면이 이 Apps Script 배포 자체에서 서빙되고 있을 때만 쓸 수 있는
 * 구글 고유의 통신 방식). 조각내서 여러 번 보내는 대신, 관리자 계정
 * 권한(ScriptApp.getOAuthToken())으로 구글 드라이브에 "업로드 세션"을
 * 열어서 그 주소만 돌려준다 — 실제 파일 바이너리는 브라우저가 앱스크립트를
 * 거치지 않고 이 주소로 구글 드라이브에 직접 보낸다. google.script.run은
 * 누구나 호출할 수 있으므로(공개 배포 기준) 토큰 검사를 직접 한다.
 */
function getUploadUrl(token, fileName, mimeType, folder) {
  checkToken_(token);

  var driveFolder = getOrCreateUploadFolder_();
  if (folder) {
    driveFolder = getOrCreateSubfolder_(driveFolder, String(folder));
  }

  var metadata = {
    name: fileName || "첨부파일",
    mimeType: mimeType || "application/octet-stream",
    parents: [driveFolder.getId()],
  };
  var url =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(metadata),
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("업로드 세션 생성 실패 (" + code + "): " + response.getContentText());
  }
  var headers = response.getHeaders();
  var location = headers["Location"] || headers["location"];
  if (!location) {
    throw new Error("업로드 세션 주소를 받지 못했습니다.");
  }
  return location;
}

/**
 * google.script.run으로 호출된다. getUploadUrl로 받은 주소에 브라우저가
 * 직접 업로드를 끝낸 뒤, 그 파일을 "링크가 있는 사람은 볼 수 있음"으로
 * 공유 설정하고 뷰 링크를 돌려준다 (드라이브 API의 직접 업로드 자체는
 * 공유 설정을 하지 않으므로 이 단계가 별도로 필요하다).
 */
function finalizeUploadSharing(token, driveFileId) {
  checkToken_(token);
  var file = DriveApp.getFileById(driveFileId);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: "https://drive.google.com/file/d/" + driveFileId + "/view" };
}

/** payload: { driveFileId } — 자료 삭제 시 드라이브의 실제 파일도 함께 정리한다. */
function handleDeleteFile_(payload) {
  var id = payload.driveFileId;
  if (!id) return { deleted: false };
  try {
    DriveApp.getFileById(id).setTrashed(true);
    return { deleted: true };
  } catch (e) {
    return { deleted: false, error: String(e) };
  }
}
