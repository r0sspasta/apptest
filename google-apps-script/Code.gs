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
 *   - "Progress": a line chart of best weight per session per exercise
 *   - "Chart Data": the pivot table feeding that chart
 *   - "Backup": a full JSON snapshot you can restore via the app's Import
 */

var LOG_SHEET = 'Workout Log';
var BACKUP_SHEET = 'Backup';
var CHART_DATA_SHEET = 'Chart Data';
var PROGRESS_SHEET = 'Progress';
var MAX_CHART_SERIES = 8;
var SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

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
    writeProgressChart(data);
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

  var rows = [['Date', 'Day', 'Exercise', 'Type', 'Set', 'Set type', 'Superset with',
               'Weight (kg)', 'Per hand', 'Total kg moved', 'Reps', 'Logged at']];
  var setCounters = {};
  // Names of an exercise's superset partners, for the "Superset with" column.
  var partnersOf = {};
  (data.exercises || []).forEach(function (x) {
    if (!x.supersetId) return;
    partnersOf[x.id] = (data.exercises || [])
      .filter(function (o) { return o.id !== x.id && o.supersetId === x.supersetId; })
      .map(function (o) { return o.name; })
      .join(', ');
  });
  logs.forEach(function (l) {
    var ex = exById[l.exerciseId] || {};
    var key = l.date + '|' + l.exerciseId;
    // Drop continuations belong to the set above them, so they don't take a
    // new set number.
    if (!l.drop) setCounters[key] = (setCounters[key] || 0) + 1;
    var perHand = !!ex.perHand;
    var isBW = ex.mode === 'bodyweight';
    var reps = l.reps == null ? '' : l.reps;
    // What was actually moved: both hands for per-hand work.
    var total = (l.weight || 0) * (perHand ? 2 : 1);
    rows.push([
      l.date,
      cats[ex.category] || ex.category || '',
      ex.name || '(deleted exercise)',
      isBW ? 'Bodyweight' : 'Weighted',
      setCounters[key] || 1,
      l.drop ? (l.amrap ? 'Drop, to failure' : 'Drop') : (l.amrap ? 'To failure' : 'Working'),
      partnersOf[l.exerciseId] || '',
      l.weight,
      perHand ? 'Yes' : '',
      total,
      reps,
      l.ts ? new Date(l.ts) : '',
    ]);
  });

  var sheet = ss.getSheetByName(LOG_SHEET) || ss.insertSheet(LOG_SHEET, 0);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/**
 * Rebuilds "Chart Data" (Date × exercise, cell = best weight that session)
 * and a line chart on "Progress". Series are capped at the most-trained
 * exercises so the chart stays readable.
 */
function writeProgressChart(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var exById = {};
  (data.exercises || []).forEach(function (x) { exById[x.id] = x; });

  // Best value per exercise per date: reps for bodyweight work, weight
  // otherwise — matching how the app measures progress.
  var bestByDateEx = {}; // date -> exId -> best value
  var sessionCount = {}; // exId -> distinct dates
  (data.logs || []).forEach(function (l) {
    var ex = exById[l.exerciseId];
    if (!ex || l.drop) return; // drops are part of the set above, not a data point
    var v = ex.mode === 'bodyweight' ? (l.reps || 0) : l.weight;
    if (!bestByDateEx[l.date]) bestByDateEx[l.date] = {};
    var cur = bestByDateEx[l.date][l.exerciseId];
    if (cur === undefined || v > cur) bestByDateEx[l.date][l.exerciseId] = v;
  });
  Object.keys(bestByDateEx).forEach(function (date) {
    Object.keys(bestByDateEx[date]).forEach(function (exId) {
      sessionCount[exId] = (sessionCount[exId] || 0) + 1;
    });
  });

  var topExIds = Object.keys(sessionCount)
    .sort(function (a, b) { return sessionCount[b] - sessionCount[a]; })
    .slice(0, MAX_CHART_SERIES);

  var dataSheet = ss.getSheetByName(CHART_DATA_SHEET) || ss.insertSheet(CHART_DATA_SHEET);
  dataSheet.clearContents();
  var chartSheet = ss.getSheetByName(PROGRESS_SHEET) || ss.insertSheet(PROGRESS_SHEET, 1);
  chartSheet.getCharts().forEach(function (c) { chartSheet.removeChart(c); });

  if (topExIds.length === 0) return;

  var dates = Object.keys(bestByDateEx).sort();
  // Bodyweight series are reps, so label them to keep the mixed chart readable.
  var rows = [['Date'].concat(topExIds.map(function (id) {
    var ex = exById[id];
    return ex.mode === 'bodyweight' ? ex.name + ' (reps)' : ex.name;
  }))];
  dates.forEach(function (date) {
    var row = [date];
    topExIds.forEach(function (exId) {
      var v = bestByDateEx[date][exId];
      row.push(v === undefined ? '' : v);
    });
    rows.push(row);
  });
  dataSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  dataSheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  dataSheet.setFrozenRows(1);

  var chart = chartSheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(dataSheet.getRange(1, 1, rows.length, rows[0].length))
    .setPosition(1, 1, 8, 8)
    .setOption('title', 'Best per session (kg, or reps for bodyweight)')
    .setOption('width', 900)
    .setOption('height', 480)
    .setOption('colors', SERIES_COLORS.slice(0, topExIds.length))
    .setOption('interpolateNulls', true)
    .setOption('pointSize', 5)
    .setOption('lineWidth', 2)
    .setOption('legend', { position: 'right' })
    .setOption('hAxis', { title: 'Date' })
    .setOption('vAxis', { title: 'kg / reps' })
    .build();
  chartSheet.insertChart(chart);
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
