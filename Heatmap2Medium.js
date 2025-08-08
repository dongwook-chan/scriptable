// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: columns;

////////////////////////////////////////////////////////////
// Medium widget: Progress (left) + Activity (right)
// Minimal shrink via internal insets (no spacers)
////////////////////////////////////////////////////////////

const SIZE = 150;      // canvas for each half (same as small)
const ROWS = 7;
const M    = 4;        // spacing between cells
const R    = 3;        // cell corner radius
const GAP  = 0;        // space between halves

// Tune these to clear the corner mask with minimal shrink
const INSET_T = 5;    // mostly needed
const INSET_B = 1.1;
const INSET_L = 0;
const INSET_R = 0;

// LEFT: Progress Reminders
const PROGRESS_LIST_NAME = "Progress";
const PROGRESS_URL       = "shortcuts://run-shortcut?name=Open Progress Reminders";
const COLORS_AQUA        = ["#333333","#00524e","#007a78","#00a79f","#33cfc7"];

// RIGHT: Fitness / Meditate (time-based toggle)
const FITNESS_URL  = "https://hevy.com/routine/PyoUWcDSaxE"; // 23–9
const MEDITATE_URL = "shortcuts://run-shortcut?name=meditate"; // 9–23
const FITNESS_START_HOUR  = 23;
const MEDITATE_START_HOUR = 9;

const FITNESS_CALENDAR     = "Fitness";
const FITNESS_MAX_MINUTES  = 30;
const FITNESS_COLORS       = ["#333333","#663f35","#b07a63","#ebb6a0","#ffe3d5"];

const MEDITATE_CALENDAR    = "Meditate";
const MEDITATE_MAX_MINUTES = 30;
const MEDITATE_COLORS      = ["#333333","#5a3b82","#8761af","#b19ae1","#dccdfb"];

// Shared date window & grid geometry
const now       = new Date();
const hour      = now.getHours();

const DRAW_W    = SIZE - INSET_L - INSET_R;
const DRAW_H    = SIZE - INSET_T - INSET_B;

// choose cell size that fits both width & height after insets
let cellSize = Math.floor(
    Math.min(
        (DRAW_W - 2*M - (ROWS - 1)*M) / ROWS,
        (DRAW_H - 2*M - (ROWS - 1)*M) / ROWS
    )
);

let gridWidth = DRAW_W - 2*M;
let COLS      = Math.floor((gridWidth + M) / (cellSize + M));

// week window
let dow         = now.getDay();
let offsetToMon = (dow + 6) % 7;
let monThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetToMon);
let startDate   = new Date(monThisWeek);
startDate.setDate(startDate.getDate() - (COLS - 1) * 7);

// Decide right-side mode
let RIGHT_CALENDAR, RIGHT_COLORS, RIGHT_MAX, RIGHT_URL;
if (hour >= FITNESS_START_HOUR || hour < MEDITATE_START_HOUR) {
  RIGHT_CALENDAR = FITNESS_CALENDAR;
  RIGHT_COLORS   = FITNESS_COLORS;
  RIGHT_MAX      = FITNESS_MAX_MINUTES;
  RIGHT_URL      = FITNESS_URL;
} else {
  RIGHT_CALENDAR = MEDITATE_CALENDAR;
  RIGHT_COLORS   = MEDITATE_COLORS;
  RIGHT_MAX      = MEDITATE_MAX_MINUTES;
  RIGHT_URL      = MEDITATE_URL;
}

// Helpers
function blankDayMap() {
  const map = {};
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + c*7 + r);
      map[d.toDateString()] = 0;
    }
  }
  return map;
}

function drawHeatmap(valuesByDay, palette, ratioFn) {
  const ctx = new DrawContext();
  ctx.size = new Size(SIZE, SIZE);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (c === COLS - 1 && r > offsetToMon) continue;

      const d = new Date(startDate);
      d.setDate(startDate.getDate() + c*7 + r);
      const key = d.toDateString();

      const ratio = Math.max(0, Math.min(1, ratioFn(valuesByDay, key)));
      const level = Math.round(ratio * (palette.length - 1));

      const x = INSET_L + M + c*(cellSize + M) + 6.5;
      const y = INSET_T + M + r*(cellSize + M) + 1.5

      ctx.setFillColor(new Color(palette[level]));
      const path = new Path();
      path.addRoundedRect(new Rect(x, y, cellSize, cellSize), R, R);
      ctx.addPath(path);
      ctx.fillPath();
    }
  }
  return ctx.getImage();
}

// LEFT: Progress (done/total)
const listCal   = await Calendar.forRemindersByTitle(PROGRESS_LIST_NAME);
const reminders = listCal ? await Reminder.all([listCal]) : [];
const totals    = blankDayMap();
const doneMap   = blankDayMap();
for (const rem of reminders) {
  if (!rem.dueDate) continue;
  const k = rem.dueDate.toDateString();
  if (totals[k] !== undefined) {
    totals[k]++;
    if (rem.isCompleted) doneMap[k]++;
  }
}
const progressImg = drawHeatmap(
    totals,
    COLORS_AQUA,
    (maps, key) => {
      const total = totals[key] || 0;
      const done  = doneMap[key] || 0;
      return total > 0 ? done / total : 0;
    }
);

// RIGHT: minutes heatmap
const allCals     = await Calendar.forEvents();
const selectedCal = allCals.find(c => c.title === RIGHT_CALENDAR);
const events      = selectedCal ? await CalendarEvent.between(startDate, now, [selectedCal]) : [];
const minutes = blankDayMap();
for (const ev of events) {
  if (!ev.startDate || !ev.endDate) continue;
  const k = ev.startDate.toDateString();
  if (minutes[k] !== undefined) {
    minutes[k] += Math.round((ev.endDate - ev.startDate) / 60000);
  }
}
const activityImg = drawHeatmap(
    minutes,
    RIGHT_COLORS,
    (_, key) => Math.min((minutes[key] || 0) / RIGHT_MAX, 1)
);

// Build
const w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.setPadding(0, 0, 0, 0);

const row = w.addStack();
row.setPadding(0, 0, 0, 0);

const left = row.addStack();
left.url = PROGRESS_URL;
left.addImage(progressImg).imageSize = new Size(SIZE, SIZE);

row.addSpacer(GAP);

const right = row.addStack();
right.url = RIGHT_URL;
right.addImage(activityImg).imageSize = new Size(SIZE, SIZE);

Script.setWidget(w);
Script.complete();
