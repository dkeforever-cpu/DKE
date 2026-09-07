/**
 * 파일 업로드: base64로 인코딩해 보낸 파일을 디코딩해서, 공유 드라이브
 * 폴더 하나에 저장한다. 링크를 아는 사람은 누구나 볼 수 있도록 공유
 * 설정하므로, 팀원 각자에게 개별 공유할 필요가 없다.
 */

var UPLOAD_FOLDER_NAME = "물류센터 업무관리 - 첨부파일";
var PENDING_DELETE_FOLDER_NAME = "물류센터 업무관리 - 삭제예정";

function getOrCreateUploadFolder_() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName(UPLOAD_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return root.createFolder(UPLOAD_FOLDER_NAME);
}

function getOrCreatePendingDeleteFolder_() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName(PENDING_DELETE_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return root.createFolder(PENDING_DELETE_FOLDER_NAME);
}

/**
 * 댓글/진행 일지/자료실 등에서 첨부파일이 삭제될 때, 실제로 지우는 대신
 * "삭제예정" 폴더로 옮긴다 — 바로 지워버리면 실수로 지운 경우 복구할
 * 방법이 없어서, 검토 후 정말 필요 없을 때 그 폴더에서 수동으로 정리할
 * 수 있게 한다.
 */
function moveFileToPendingDelete_(driveFileId) {
  var file = DriveApp.getFileById(driveFileId);
  var dest = getOrCreatePendingDeleteFolder_();
  var parents = file.getParents();
  while (parents.hasNext()) {
    parents.next().removeFile(file);
  }
  dest.addFile(file);
}

/**
 * 댓글/진행 일지 같은 레코드 하나가 지워질 때(직접 삭제든, 상위 업무·
 * 체크리스트 삭제로 인한 연쇄 삭제든) 그 레코드의 attachments 목록에
 * 있는 파일들을 전부 삭제예정 폴더로 옮긴다. attachmentsRaw는 시트에
 * 저장된 그대로(JSON 문자열)이거나 이미 배열이어도 된다.
 */
function moveRowAttachmentsToPendingDelete_(attachmentsRaw) {
  var list = parseJsonField_(attachmentsRaw, []);
  (list || []).forEach(function (a) {
    if (a && a.driveFileId) {
      try {
        moveFileToPendingDelete_(a.driveFileId);
      } catch (e) {
        // 이미 옮겨졌거나 접근할 수 없는 파일은 조용히 넘어간다.
      }
    }
  });
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
 *
 * 브라우저 쪽 화면은 이제 이 함수를 직접 호출하지 않는다(직접 업로드
 * 방식 — getUploadUrl/finalizeDirectUpload — 로 전환됨). 그래도 지우면
 * 안 된다: Setup.gs의 importExportedJson이 예전에 내보낸 JSON 안의
 * base64 첨부파일을 드라이브에 올릴 때 그대로 쓴다.
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
 * google.script.run으로 호출된다. 브라우저가 getUploadUrl 주소로 파일
 * 바이너리를 PUT으로 직접 보내면 실제로는 정상적으로 업로드되지만,
 * 그 응답을 브라우저 자바스크립트가 읽는 것 자체는 CORS 정책에 막혀
 * "Failed to fetch"로 보인다(요청 자체는 구글 서버까지 전달되어 처리됨 —
 * CORS는 응답을 "읽는 것"만 막지 요청 자체를 막지는 않는다). 그래서
 * 브라우저가 업로드 세션 주소를 이걸로 다시 넘기면, 서버(관리자 권한,
 * UrlFetchApp — 여기는 CORS 제약이 없다)가 그 세션 상태를 대신 조회해서
 * ("Content-Range: bytes 별표 별표" 헤더는 "이미 다 됐으면 결과를 달라"는
 * 상태 확인 요청이다) 실제로 만들어진 파일을 찾아 공유 설정까지 끝내고
 * 정보를 돌려준다.
 */
function finalizeDirectUpload(token, uploadSessionUrl) {
  checkToken_(token);
  var response = UrlFetchApp.fetch(uploadSessionUrl, {
    method: "put",
    headers: { "Content-Range": "bytes */*" },
    muteHttpExceptions: true,
  });
  var code = response.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error("업로드 완료 확인 실패 (" + code + "): " + response.getContentText());
  }
  var data = JSON.parse(response.getContentText());
  var file = DriveApp.getFileById(data.id);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    name: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    driveFileId: data.id,
    url: "https://drive.google.com/file/d/" + data.id + "/view",
  };
}

/**
 * payload: { driveFileId } — 자료 삭제 시 드라이브의 실제 파일을 바로
 * 지우지 않고 "삭제예정" 폴더로 옮긴다(moveFileToPendingDelete_) — 실수로
 * 지운 걸 나중에 되찾을 수 있게 하기 위함. 정말 필요 없는 파일은 그
 * 폴더에서 나중에 수동으로 정리하면 된다.
 */
function handleDeleteFile_(payload) {
  var id = payload.driveFileId;
  if (!id) return { deleted: false };
  try {
    moveFileToPendingDelete_(id);
    return { deleted: true };
  } catch (e) {
    return { deleted: false, error: String(e) };
  }
}
