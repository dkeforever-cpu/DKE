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
