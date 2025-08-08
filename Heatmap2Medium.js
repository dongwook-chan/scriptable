// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: columns;

////////////////////////////////////////////////////////////
// Medium widget: Progress (left) + Activity (right)
// Minimal shrink via internal insets (no spacers)
// + Fitness mode: split right half into two tap zones
////////////////////////////////////////////////////////////

const SIZE = 150;      // canvas for each half (same as small)
const ROWS = 7;
const M    = 4;        // spacing between cells
const R    = 3;        // cell corner radius
const GAP  = 0;        // space between halves

// Tune these to clear the corner mask with minimal shrink
const INSET_T = 5;     // mostly needed
const INSET_B = 1.1;
const INSET_L = 0;
const INSET_R = 0;

// LEFT: Progress Reminders
const PROGRESS_LIST_NAME = "Progress";
const PROGRESS_URL       = "shortcuts://run-shortcut?name=Open Progress Reminders";
const COLORS_AQUA        = ["#333333","#00524e","#007a78","#00a79f","#33cfc7"];

// RIGHT: Fitness / Meditate (time-based toggle)
const FITNESS_URL_MAIN   = "https://hevy.com/routine/PyoUWcDSaxE"; // top half (23–9)
const FITNESS_URL_ALT    = "https://hevy.com/routine/D25AmK0DBDK"; // bottom half (23–9)
const MEDITATE_URL       = "shortcuts://run-shortcut?name=meditate"; // 9–23
const FITNESS_START_HOUR  = 23;
const MEDITATE_START_HOUR = 9;

const FITNESS_CALENDAR     = "Fitness";
const FITNESS_MAX_MINUTES  = 30;
const FITNESS_COLORS       = ["#333333","#663f35","#b07a63","#ebb6a0","#ffe3d5"];

const MEDITATE_CALENDAR    = "Meditate";
const MEDITATE_MAX_MINUTES = 30;
const MEDITATE_COLORS      = ["#333333","#5a3b82","#8761af","#b19ae1","#dccdfb"];

// --- Mode override: "auto" | "fitness" | "meditate"
// You can also set the Widget Parameter to "fitness", "meditate", or "auto".
const MODE_OVERRIDE = "auto"; // ← back to schedule
const PARAM = ((args && args.widgetParameter) ? String(args.widgetParameter) : "").trim().toLowerCase();
const MODE  = (["auto","fitness","meditate"].includes(PARAM)) ? PARAM : MODE_OVERRIDE;

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

// Decide right-side mode (uses override/parameter if provided)
const isFitnessTime = (hour >= FITNESS_START_HOUR || hour < MEDITATE_START_HOUR);
const useFitness = (MODE === "fitness") || (MODE === "auto" && isFitnessTime);

let RIGHT_CALENDAR, RIGHT_COLORS, RIGHT_MAX, RIGHT_URL;
if (useFitness) {
  RIGHT_CALENDAR = FITNESS_CALENDAR;
  RIGHT_COLORS   = FITNESS_COLORS;
  RIGHT_MAX      = FITNESS_MAX_MINUTES;
  RIGHT_URL      = FITNESS_URL_MAIN; // split tap zones applied below
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
      const y = INSET_T + M + r*(cellSize + M) + 1.5;

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

// helper: fully transparent image of a given size
function transparentImage(w, h) {
  const c = new DrawContext();
  c.size = new Size(w, h);
  c.opaque = false;
  c.setFillColor(new Color("#000000", 0));
  c.fillRect(new Rect(0, 0, w, h));
  return c.getImage();
}

// Build
const w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.setPadding(0, 0, 0, 0);

const row = w.addStack();
row.setPadding(0, 0, 0, 0);

// Left (Progress)
const left = row.addStack();
left.setPadding(0, 0, 0, 0);
const leftImg = left.addImage(progressImg);
leftImg.imageSize = new Size(SIZE, SIZE);
left.url = PROGRESS_URL;

// Gap
row.addSpacer(GAP);

// Right (Activity)
const right = row.addStack();
right.setPadding(0, 0, 0, 0);
right.size = new Size(SIZE, SIZE);  // ensure fixed area

if (useFitness) {
  // Fitness mode: background + two *sized* tappable halves
  right.backgroundImage = activityImg;
  right.layoutVertically();

  const half1 = Math.floor(SIZE / 2);
  const half2 = SIZE - half1;

  const topTap = right.addStack();
  topTap.setPadding(0, 0, 0, 0);
  topTap.size = new Size(SIZE, half1);
  topTap.url = FITNESS_URL_MAIN;
  const topImg = topTap.addImage(transparentImage(SIZE, half1));
  topImg.imageSize = new Size(SIZE, half1);

  const bottomTap = right.addStack();
  bottomTap.setPadding(0, 0, 0, 0);
  bottomTap.size = new Size(SIZE, half2);
  bottomTap.url = FITNESS_URL_ALT;
  const bottomImg = bottomTap.addImage(transparentImage(SIZE, half2));
  bottomImg.imageSize = new Size(SIZE, half2);

} else {
  // Meditate mode: single tap target
  const img = right.addImage(activityImg);
  img.imageSize = new Size(SIZE, SIZE);
  right.url = RIGHT_URL;
}

Script.setWidget(w);
Script.complete();
