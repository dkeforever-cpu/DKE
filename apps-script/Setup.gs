/**
 * Run setup() ONCE, manually, from the Apps Script editor after pasting
 * these files into a script bound to your Google Sheet (Extensions >
 * Apps Script). It creates every tab this backend needs (if missing)
 * with the correct header row, and seeds the Users tab with the 10
 * team members. Re-running it is safe: it never touches a tab that
 * already exists, and never re-adds a user id that's already present.
 */

function setup() {
  Object.keys(HEADERS).forEach(function (name) {
    ensureSheet_(name, HEADERS[name]);
  });
  seedUsers_();
  SpreadsheetApp.getActiveSpreadsheet().toast("설정 완료: 시트 구성 및 사용자 초기 데이터 준비됨", "DKE 업무관리", 10);
}

function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function seedUsers_() {
  var sheet = getSheet_("Users");
  var existing = sheetToObjects_(sheet);
  var existingIds = {};
  existing.forEach(function (u) {
    existingIds[u.id] = true;
  });

  var defaultUsers = [
    { id: "u1", name: "박관리", dept: "관리팀", isAdmin: true },
    { id: "u2", name: "이지원", dept: "관리팀", isAdmin: false },
    { id: "u3", name: "한서준", dept: "관리팀", isAdmin: false },
    { id: "u4", name: "오지훈", dept: "관리팀", isAdmin: false },
    { id: "u5", name: "서은채", dept: "관리팀", isAdmin: false },
    { id: "u6", name: "김재경", dept: "재경팀", isAdmin: true },
    { id: "u7", name: "정다은", dept: "재경팀", isAdmin: false },
    { id: "u8", name: "최수민", dept: "재경팀", isAdmin: false },
    { id: "u9", name: "노현우", dept: "재경팀", isAdmin: false },
    { id: "u10", name: "임소연", dept: "재경팀", isAdmin: false },
  ];

  defaultUsers.forEach(function (u) {
    if (!existingIds[u.id]) {
      appendRow_(sheet, HEADERS.Users, u);
    }
  });
}
