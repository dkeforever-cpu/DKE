/**
 * File uploads: attachments are stored as base64 in the request, decoded
 * here, and saved into a single shared Drive folder. The returned URL is
 * a "anyone with the link can view" link so every teammate can open it
 * without needing individual sharing.
 */

var UPLOAD_FOLDER_NAME = "DKE 업무관리 첨부파일";

function getOrCreateUploadFolder_() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName(UPLOAD_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return root.createFolder(UPLOAD_FOLDER_NAME);
}

/**
 * payload: { fileName: string, mimeType: string, base64Data: string }
 * base64Data may include a "data:<mime>;base64," prefix; it is stripped
 * if present.
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
    url: "https://drive.google.com/file/d/" + file.getId() + "/view",
  };
}
