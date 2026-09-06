/**
 * 구글 시트의 탭 하나를 "id 컬럼으로 찾는 객체 테이블"처럼 다루기 위한
 * 범용 도우미. Schema.gs의 SCHEMA 정의와 함께 Code.gs의 제네릭
 * create/update/delete가 이 함수들만으로 모든 엔티티를 처리한다.
 */

/**
 * 시트 데이터 영역 전체를 일반 텍스트(@) 서식으로 고정한다. 이걸 안 하면
 * "2026-09-05" 같은 문자열을 셀에 쓸 때 구글 시트가 자동으로 날짜 타입
 * 셀로 재해석해버려서, 나중에 읽어올 때 원래 문자열이 아니라 시트 표시
 * 로캘 기준으로 다시 포맷된 값(딴 시간대 적용된 Date 객체)이 나온다.
 */
function forceTextFormat_(sheet) {
  var rows = Math.max(sheet.getMaxRows(), 2);
  var cols = Math.max(sheet.getMaxColumns(), 1);
  sheet.getRange(1, 1, rows, cols).setNumberFormat("@");
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error("시트를 찾을 수 없습니다: " + name + " (먼저 setup()을 실행하세요)");
  }
  return sheet;
}

/**
 * 혹시 텍스트 서식 고정보다 먼저 셀에 값이 들어가서 구글 시트가 날짜
 * 타입으로 재해석해버린 셀이 있어도, 읽을 때만큼은 원래 있어야 할 문자열
 * 형태(ISO 문자열)로 정규화해 돌려준다. forceTextFormat_로 애초에
 * 재해석을 막는 게 근본 대책이고, 이건 그래도 남을 수 있는 경우를 위한
 * 보험이다.
 */
function normalizeCellValue_(v) {
  if (v instanceof Date) return v.toISOString();
  return v;
}

/** 헤더 행을 제외한 모든 데이터 행을 평범한 객체 배열로 읽어온다. */
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
        obj[h] = normalizeCellValue_(row[i]);
      });
      return obj;
    });
}

/** 헤더 행(1행)만 남기고 그 아래 데이터 행을 전부 지운다. */
function clearSheetRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

function appendRow_(sheet, headers, obj) {
  var row = headers.map(function (h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : "";
  });
  sheet.appendRow(row);
}

/**
 * appendRow_의 여러 건짜리 버전 — 레코드마다 시트 API를 한 번씩 부르는
 * 대신, 전체를 2차원 배열로 만들어 범위 쓰기 한 번으로 끝낸다. 대량
 * 가져오기(importExportedJson)처럼 수백 건을 한 번에 넣을 때 훨씬 빠르다.
 */
function appendRows_(sheet, headers, objs) {
  if (!objs || objs.length === 0) return;
  var rows = objs.map(function (obj) {
    return headers.map(function (h) {
      return obj[h] !== undefined && obj[h] !== null ? obj[h] : "";
    });
  });
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
}

/** id/키 컬럼에서 값이 일치하는 첫 번째 행의 1-기반 행 번호. 없으면 -1. */
function findRowIndexByField_(sheet, fieldIndex, value) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, fieldIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === value) return i + 2;
  }
  return -1;
}

/** patch를 기존 행에 병합해서 다시 쓰고, 병합된 객체(디코딩 전)를 반환한다. */
function updateRowByField_(sheet, headers, idField, idValue, patch) {
  var fieldIndex = headers.indexOf(idField);
  var rowIndex = findRowIndexByField_(sheet, fieldIndex, idValue);
  if (rowIndex === -1) throw new Error("항목을 찾을 수 없습니다: " + idValue);
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

function deleteRowByField_(sheet, headers, idField, idValue) {
  var fieldIndex = headers.indexOf(idField);
  var rowIndex = findRowIndexByField_(sheet, fieldIndex, idValue);
  if (rowIndex !== -1) sheet.deleteRow(rowIndex);
}

function nowIso_() {
  return new Date().toISOString();
}

/** JSON 문자열이면 파싱하고, 아니면(빈 값 등) 안전한 기본값을 돌려준다. */
function parseJsonField_(raw, fallback) {
  if (raw === "" || raw === null || raw === undefined) return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/** schema.json에 나열된 필드를 파싱해 원래 형태(배열/객체)로 되돌린 행 사본. */
function decodeRow_(schema, row) {
  var out = {};
  schema.headers.forEach(function (h) {
    var v = row[h];
    if (schema.json.indexOf(h) !== -1) {
      out[h] = parseJsonField_(v, h === "attachments" || h === "collaboratorIds" || h === "viewTeamIds" ? [] : undefined);
    } else if (h === "isAdmin" || h === "reported") {
      out[h] = v === true || v === "TRUE" || v === "true";
    } else {
      out[h] = v === "" ? undefined : v;
    }
  });
  return out;
}

/** schema.json에 나열된 필드를 저장 전에 JSON 문자열로 인코딩한 행 사본. */
function encodeRecord_(schema, record) {
  var out = {};
  Object.keys(record).forEach(function (k) {
    var v = record[k];
    out[k] = schema.json.indexOf(k) !== -1 && v !== undefined ? JSON.stringify(v) : v;
  });
  return out;
}
