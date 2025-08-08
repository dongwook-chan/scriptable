// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: brain;

const SIZE                = 150;         // widget canvas size
const ROWS                = 7;           // days per column
const M                   = 4;           // margin between & around cells
const R                   = 3;           // block corner radius

// ─── Widget URLs (top-level, uppercase) ─────────────────────────
const FITNESS_URL         = "https://hevy.com/routine/PyoUWcDSaxE"; // 23–9
const MEDITATE_URL        = "shortcuts://run-shortcut?name=meditate"; // 9–23

// ─── Toggle hours ───────────────────────────────────────────────
const FITNESS_START_HOUR  = 23;          // inclusive: hour at/after which to show Fitness
const MEDITATE_START_HOUR = 9;           // inclusive: hour at/after which to show Meditate

// ─── Fitness configuration ─────────────────────────────────────
const FITNESS_CALENDAR       = "Fitness";
const FITNESS_MAX_MINUTES    = 30;
const FITNESS_COLORS         = [
  "#333333", // 0: no activity
  "#663f35", // 1: muted terracotta–brown
  "#b07a63", // 2: rich apricot–peach
  "#ebb6a0", // 3: soft light peach
  "#ffe3d5"  // 4: pale creamy skin tone
];

// ─── Meditate configuration ────────────────────────────────────
const MEDITATE_CALENDAR      = "Meditate";
const MEDITATE_MAX_MINUTES   = 30;
const MEDITATE_COLORS        = [
  "#333333", // 0: no activity
  "#5a3b82", // 1: deep indigo
  "#8761af", // 2: mid purple
  "#b19ae1", // 3: soft lavender
  "#dccdfb"  // 4: pale lilac
];

// ─── Determine which mode to show ──────────────────────────────
const now  = new Date();
const hour = now.getHours();

let CALENDAR_NAME, COLORS, MAX_MINUTES, WIDGET_URL;

if (hour >= FITNESS_START_HOUR || hour < MEDITATE_START_HOUR) {
  // Fitness mode (23–9)
  CALENDAR_NAME = FITNESS_CALENDAR;
  COLORS        = FITNESS_COLORS;
  MAX_MINUTES   = FITNESS_MAX_MINUTES;
  WIDGET_URL    = FITNESS_URL;
} else {
  // Meditate mode (9–23)
  CALENDAR_NAME = MEDITATE_CALENDAR;
  COLORS        = MEDITATE_COLORS;
  MAX_MINUTES   = MEDITATE_MAX_MINUTES;
  WIDGET_URL    = MEDITATE_URL;
}

// ─── Compute grid layout ────────────────────────────────────────
let cellSize  = Math.floor((SIZE - 2*M - (ROWS - 1)*M) / ROWS);
let gridWidth = SIZE - 2*M;
let COLS      = Math.floor((gridWidth + M) / (cellSize + M));

// ─── Find this week’s Monday ───────────────────────────────────
let dow         = now.getDay();
let offsetToMon = (dow + 6) % 7;
let monThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetToMon);

// ─── Compute first day to draw ─────────────────────────────────
let startDate = new Date(monThisWeek);
startDate.setDate(startDate.getDate() - (COLS - 1) * 7);

// ─── Load events from the selected calendar ────────────────────
let allCals     = await Calendar.forEvents();
let selectedCal = allCals.find(c => c.title === CALENDAR_NAME);
let events      = selectedCal
    ? await CalendarEvent.between(startDate, now, [selectedCal])
    : [];
console.log(`Loaded ${events.length} event(s) from "${CALENDAR_NAME}"`);

// ─── Tally minutes per day ──────────────────────────────────────
let counts = {};
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    let d = new Date(startDate);
    d.setDate(startDate.getDate() + col * 7 + row);
    counts[d.toDateString()] = 0;
  }
}
for (let ev of events) {
  let k = ev.startDate.toDateString();
  if (counts[k] !== undefined && ev.endDate) {
    counts[k] += Math.round((ev.endDate - ev.startDate) / 60000);
  }
}

// ─── Draw the heatmap ───────────────────────────────────────────
let ctx = new DrawContext();
ctx.size               = new Size(SIZE, SIZE);
ctx.opaque             = false;
ctx.respectScreenScale = true;

for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    if (col === COLS - 1 && row > offsetToMon) continue;

    let d    = new Date(startDate);
    d.setDate(startDate.getDate() + col * 7 + row);
    let mins = counts[d.toDateString()] || 0;

    let ratio = Math.min(mins / MAX_MINUTES, 1);
    let level = Math.round(ratio * (COLORS.length - 1));

    let x = M + col * (cellSize + M) + 3;
    let y = M + row * (cellSize + M) + 2;
    ctx.setFillColor(new Color(COLORS[level]));

    let path = new Path();
    path.addRoundedRect(new Rect(x, y, cellSize, cellSize), R, R);
    ctx.addPath(path);
    ctx.fillPath();
  }
}

// ─── Build and set the widget ───────────────────────────────────
let w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.backgroundImage = ctx.getImage();
w.setPadding(0, 0, 0, 0);
w.url = WIDGET_URL; // ← toggled URL
Script.setWidget(w);
Script.complete();
