/**
 * Business logic for every action routed from Code.gs. Mirrors the
 * frontend's src/lib/types.ts shapes and src/lib/store.tsx behavior
 * (e.g. creating a task also writes an initial log entry).
 */

// ---------------------------------------------------------------------
// bootstrap
// ---------------------------------------------------------------------

function handleBootstrap_() {
  var users = sheetToObjects_(getSheet_("Users")).map(function (u) {
    return { id: u.id, name: u.name, dept: u.dept, isAdmin: u.isAdmin === true || u.isAdmin === "TRUE" || u.isAdmin === "true" };
  });

  var taskRows = sheetToObjects_(getSheet_("Tasks"));
  var checklistRows = sheetToObjects_(getSheet_("ChecklistItems"));
  var logEntries = sheetToObjects_(getSheet_("LogEntries")).map(withParsedAttachments_);
  var comments = sheetToObjects_(getSheet_("Comments")).map(withParsedAttachments_);

  var checklistByTask = {};
  checklistRows.forEach(function (row) {
    if (!checklistByTask[row.taskId]) checklistByTask[row.taskId] = [];
    checklistByTask[row.taskId].push(row);
  });

  var tasks = taskRows.map(function (t) {
    return taskFromRow_(t, checklistByTask[t.id] || []);
  });

  return { users: users, tasks: tasks, logEntries: logEntries, comments: comments };
}

function taskFromRow_(row, checklistRowsForTask) {
  var task = {};
  HEADERS.Tasks.forEach(function (h) {
    task[h] = row[h];
  });
  task.checklist = buildChecklistTree_(checklistRowsForTask, "");
  return task;
}

/** Builds a nested ChecklistItem[] tree from flat sheet rows for a single task. */
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
        children: buildChecklistTree_(rows, r.id),
      };
    });
}

// ---------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------

function handleCreateTask_(payload) {
  var sheet = getSheet_("Tasks");
  var id = newId_("t");
  var row = {
    id: id,
    title: payload.title || "",
    description: payload.description || "",
    dept: payload.dept || "",
    categoryLarge: payload.categoryLarge || "",
    categoryMedium: payload.categoryMedium || "",
    categorySmall: payload.categorySmall || "",
    assigneeId: payload.assigneeId || "",
    center: payload.center || "",
    priority: payload.priority || "",
    status: payload.status || "",
    progress: payload.progress || 0,
    dueDate: payload.dueDate || "",
    createdBy: payload.createdBy || "",
    createdAt: todayStr_(),
  };
  appendRow_(sheet, HEADERS.Tasks, row);

  var checklistLabels = payload.checklistLabels || [];
  var checklistSheet = getSheet_("ChecklistItems");
  var checklistRows = checklistLabels.map(function (label) {
    var itemRow = {
      id: newId_("ci"),
      taskId: id,
      parentId: "",
      label: label,
      progress: 0,
      dueDate: "",
      createdAt: nowIso_(),
    };
    appendRow_(checklistSheet, HEADERS.ChecklistItems, itemRow);
    return itemRow;
  });

  var logEntry = createLogEntryRow_({
    taskId: id,
    authorId: row.createdBy,
    content: ("업무 등록. " + (row.description || "")).trim(),
    attachments: [],
  });

  var task = taskFromRow_(row, checklistRows);
  return { task: task, logEntry: logEntry };
}

function handleUpdateTask_(payload) {
  var sheet = getSheet_("Tasks");
  var updated = updateRowById_(sheet, HEADERS.Tasks, payload.id, payload.patch || {});
  var checklistRows = sheetToObjects_(getSheet_("ChecklistItems")).filter(function (r) {
    return r.taskId === payload.id;
  });
  return taskFromRow_(updated, checklistRows);
}

function handleDeleteTask_(payload) {
  var id = payload.id;
  deleteRowById_(getSheet_("Tasks"), id);

  var checklistSheet = getSheet_("ChecklistItems");
  var checklistRows = sheetToObjects_(checklistSheet).filter(function (r) {
    return r.taskId === id;
  });
  var checklistIds = {};
  checklistRows.forEach(function (r) {
    checklistIds[r.id] = true;
    deleteRowById_(checklistSheet, r.id);
  });

  var logSheet = getSheet_("LogEntries");
  var logRows = sheetToObjects_(logSheet).filter(function (r) {
    return r.taskId === id;
  });
  var logIds = {};
  logRows.forEach(function (r) {
    logIds[r.id] = true;
    deleteRowById_(logSheet, r.id);
  });

  var commentSheet = getSheet_("Comments");
  sheetToObjects_(commentSheet).forEach(function (c) {
    var orphan =
      (c.targetType === "log" && logIds[c.targetId]) ||
      (c.targetType === "checklist" && checklistIds[c.targetId]);
    if (orphan) deleteRowById_(commentSheet, c.id);
  });

  return { id: id };
}

// ---------------------------------------------------------------------
// Checklist items
// ---------------------------------------------------------------------

function handleCreateChecklistItem_(payload) {
  var sheet = getSheet_("ChecklistItems");
  var id = newId_("ci");
  var row = {
    id: id,
    taskId: payload.taskId,
    parentId: payload.parentId || "",
    label: payload.label || "",
    progress: 0,
    dueDate: "",
    createdAt: nowIso_(),
  };
  appendRow_(sheet, HEADERS.ChecklistItems, row);
  return {
    id: row.id,
    label: row.label,
    progress: row.progress,
    dueDate: undefined,
    createdAt: row.createdAt,
    children: [],
  };
}

function handleUpdateChecklistItem_(payload) {
  var sheet = getSheet_("ChecklistItems");
  var patch = {};
  var allowed = ["label", "progress", "dueDate"];
  allowed.forEach(function (k) {
    if (payload.patch && Object.prototype.hasOwnProperty.call(payload.patch, k)) {
      patch[k] = payload.patch[k];
    }
  });
  var updated = updateRowById_(sheet, HEADERS.ChecklistItems, payload.itemId, patch);
  return updated;
}

function handleDeleteChecklistItem_(payload) {
  var sheet = getSheet_("ChecklistItems");
  var rows = sheetToObjects_(sheet).filter(function (r) {
    return r.taskId === payload.taskId;
  });
  var removedIds = collectSubtreeIds_(rows, payload.itemId);
  removedIds.forEach(function (id) {
    deleteRowById_(sheet, id);
  });

  var commentSheet = getSheet_("Comments");
  sheetToObjects_(commentSheet).forEach(function (c) {
    if (c.targetType === "checklist" && removedIds.indexOf(c.targetId) !== -1) {
      deleteRowById_(commentSheet, c.id);
    }
  });

  return { removedIds: removedIds };
}

function collectSubtreeIds_(rows, rootId) {
  var ids = [rootId];
  var children = rows.filter(function (r) {
    return r.parentId === rootId;
  });
  children.forEach(function (child) {
    ids = ids.concat(collectSubtreeIds_(rows, child.id));
  });
  return ids;
}

// ---------------------------------------------------------------------
// Log entries
// ---------------------------------------------------------------------

function createLogEntryRow_(input) {
  var sheet = getSheet_("LogEntries");
  var id = newId_("l");
  var row = {
    id: id,
    taskId: input.taskId,
    authorId: input.authorId,
    content: input.content || "",
    attachments: JSON.stringify(input.attachments || []),
    createdAt: nowIso_(),
    editedAt: "",
  };
  appendRow_(sheet, HEADERS.LogEntries, row);
  return withParsedAttachments_(row);
}

function handleCreateLogEntry_(payload) {
  return createLogEntryRow_(payload);
}

function handleUpdateLogEntry_(payload) {
  var sheet = getSheet_("LogEntries");
  var updated = updateRowById_(sheet, HEADERS.LogEntries, payload.id, {
    content: payload.content,
    editedAt: nowIso_(),
  });
  return withParsedAttachments_(updated);
}

function handleDeleteLogEntry_(payload) {
  var id = payload.id;
  deleteRowById_(getSheet_("LogEntries"), id);
  var commentSheet = getSheet_("Comments");
  sheetToObjects_(commentSheet).forEach(function (c) {
    if (c.targetType === "log" && c.targetId === id) {
      deleteRowById_(commentSheet, c.id);
    }
  });
  return { id: id };
}

// ---------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------

function handleCreateComment_(payload) {
  var sheet = getSheet_("Comments");
  var id = newId_("c");
  var row = {
    id: id,
    targetType: payload.targetType,
    targetId: payload.targetId,
    authorId: payload.authorId,
    content: payload.content || "",
    attachments: JSON.stringify(payload.attachments || []),
    createdAt: nowIso_(),
    editedAt: "",
  };
  appendRow_(sheet, HEADERS.Comments, row);
  return withParsedAttachments_(row);
}

function handleUpdateComment_(payload) {
  var sheet = getSheet_("Comments");
  var updated = updateRowById_(sheet, HEADERS.Comments, payload.id, {
    content: payload.content,
    editedAt: nowIso_(),
  });
  return withParsedAttachments_(updated);
}

function handleDeleteComment_(payload) {
  deleteRowById_(getSheet_("Comments"), payload.id);
  return { id: payload.id };
}
