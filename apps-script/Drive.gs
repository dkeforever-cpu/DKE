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

/**
 * payload: { fileName, mimeType, base64Data }
 * base64Data는 "data:<mime>;base64," 접두사가 붙어있어도 되고 없어도 된다.
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
