/**
 * Generic helpers for treating a Google Sheet tab as a table of objects,
 * keyed by an "id" column (always column A / index 0).
 */

var HEADERS = {
  Users: ["id", "name", "dept", "isAdmin"],
  Tasks: [
    "id", "title", "description", "dept", "categoryLarge", "categoryMedium",
    "categorySmall", "assigneeId", "center", "priority", "status", "progress",
    "dueDate", "createdBy", "createdAt",
  ],
  ChecklistItems: ["id", "taskId", "parentId", "label", "progress", "dueDate", "createdAt"],
  LogEntries: ["id", "taskId", "authorId", "content", "attachments", "createdAt", "editedAt"],
  Comments: [
    "id", "targetType", "targetId", "authorId", "content", "attachments",
    "createdAt", "editedAt",
  ],
};

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error("시트를 찾을 수 없습니다: " + name + " (먼저 setup()을 실행하세요)");
  }
  return sheet;
}

/** Reads every data row (skipping the header) as an array of plain objects. */
function sheetToObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function (row) {
      return row[0] !== "" && row[0] !== null;
    })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        obj[h] = row[i];
      });
      return obj;
    });
}

function appendRow_(sheet, headers, obj) {
  var row = headers.map(function (h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : "";
  });
  sheet.appendRow(row);
}

/** Returns the 1-indexed sheet row number for a given id, or -1. */
function findRowIndexById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}

/** Merges `patch` onto the existing row for `id` and writes it back. Returns the merged object. */
function updateRowById_(sheet, headers, id, patch) {
  var rowIndex = findRowIndexById_(sheet, id);
  if (rowIndex === -1) throw new Error("항목을 찾을 수 없습니다: " + id);
  var currentValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var current = {};
  headers.forEach(function (h, i) {
    current[h] = currentValues[i];
  });
  var updated = {};
  headers.forEach(function (h) {
    updated[h] = patch && Object.prototype.hasOwnProperty.call(patch, h) ? patch[h] : current[h];
  });
  var newRow = headers.map(function (h) {
    return updated[h] !== undefined && updated[h] !== null ? updated[h] : "";
  });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
  return updated;
}

function deleteRowById_(sheet, id) {
  var rowIndex = findRowIndexById_(sheet, id);
  if (rowIndex !== -1) sheet.deleteRow(rowIndex);
}

function newId_(prefix) {
  return prefix + "_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
}

function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function nowIso_() {
  return new Date().toISOString();
}

function parseAttachments_(json) {
  if (!json) return [];
  try {
    var parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/** Returns a shallow copy of `row` with its `attachments` JSON string parsed into an array. */
function withParsedAttachments_(row) {
  var out = {};
  Object.keys(row).forEach(function (k) {
    out[k] = row[k];
  });
  out.attachments = parseAttachments_(row.attachments);
  return out;
}
