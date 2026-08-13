/**
 * Gym Tracker → Google Sheets sync endpoint.
 *
 * Paste this into an Apps Script project bound to your Google Sheet
 * (Extensions → Apps Script), then deploy it as a Web app with
 * "Execute as: Me" and "Who has access: Anyone". Full setup steps are in
 * the repository README under "Google Sheets sync setup".
 *
 * The tracker POSTs its full log after every change. This script rewrites:
 *   - "Workout Log": one row per set, human-readable, for long-term tracking
 *   - "Backup": a full JSON snapshot you can restore via the app's Import
 */

var LOG_SHEET = 'Workout Log';
var BACKUP_SHEET = 'Backup';

function doGet() {
  return jsonOut({
    ok: true,
    message: 'Gym Tracker sync endpoint is live. Paste this URL into the app’s Sheets sync settings.',
  });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: 'Invalid JSON' });
  }

  if (data.type === 'ping') {
    return jsonOut({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
  }
  if (data.type !== 'sync') {
    return jsonOut({ ok: false, error: 'Unknown request type' });
  }

  var lock = LockService.getScriptLock();
  lock.tryLock(20000);
  try {
    writeWorkoutLog(data);
    writeBackup(data);
    return jsonOut({ ok: true, sets: (data.logs || []).length, syncedAt: new Date().toISOString() });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function writeWorkoutLog(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var exById = {};
  (data.exercises || []).forEach(function (x) { exById[x.id] = x; });
  var cats = data.categories || {};

  var logs = (data.logs || []).slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.ts || 0) - (b.ts || 0);
  });

  var rows = [['Date', 'Day', 'Exercise', 'Set', 'Weight (kg)', 'Reps', 'Logged at']];
  var setCounters = {};
  logs.forEach(function (l) {
    var ex = exById[l.exerciseId] || {};
    var key = l.date + '|' + l.exerciseId;
    setCounters[key] = (setCounters[key] || 0) + 1;
    rows.push([
      l.date,
      cats[ex.category] || ex.category || '',
      ex.name || '(deleted exercise)',
      setCounters[key],
      l.weight,
      l.reps == null ? '' : l.reps,
      l.ts ? new Date(l.ts) : '',
    ]);
  });

  var sheet = ss.getSheetByName(LOG_SHEET) || ss.insertSheet(LOG_SHEET, 0);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function writeBackup(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BACKUP_SHEET) || ss.insertSheet(BACKUP_SHEET);
  sheet.clearContents();

  var json = JSON.stringify({ exercises: data.exercises || [], logs: data.logs || [] });
  var CHUNK = 45000; // stay under the 50,000-character cell limit

  sheet.getRange(1, 1).setValue('Full JSON backup. To restore: join the cells below into one .json file and use the app’s Import data button.');
  sheet.getRange(2, 1).setValue('Last synced');
  sheet.getRange(2, 2).setValue(new Date());
  for (var i = 0, row = 3; i < json.length; i += CHUNK, row++) {
    sheet.getRange(row, 1).setValue(json.slice(i, i + CHUNK));
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
