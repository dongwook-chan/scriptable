// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: dumbbell;

// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: heart;

// 대상 달력(CALENDAR_NAME): Fitness
// 집계 방식: minutes per day
// block 곡률(R): 3

const SIZE           = 150;        // Small widget canvas size
const ROWS           = 7;          // days per column
const M              = 4;          // fixed margin between & around cells
const R              = 3;          // corner radius
const CALENDAR_NAME  = "Fitness";// calendar to draw
const MAX_MINUTES    = 30;         // cap for the lightest shade

// 5-step palette (0 → 30+ minutes), grey→skin-pink
const COLORS = [
  "#333333", // 0: no activity
  "#663f35", // 1: muted terracotta–brown (warm base)
  "#b07a63", // 2: rich apricot–peach
  "#ebb6a0", // 3: soft light peach
  "#ffe3d5"  // 4: pale creamy skin tone
];

// 1) Compute cellSize & number of columns
let cellSize  = Math.floor((SIZE - 2*M - (ROWS - 1)*M) / ROWS);
let gridWidth = SIZE - 2*M;
let COLS      = Math.floor((gridWidth + M) / (cellSize + M));

// 2) Find this week’s Monday
let today       = new Date();
let dow         = today.getDay();             // 0=Sun…6=Sat
let offsetToMon = (dow + 6) % 7;              // 0 for Mon→6 for Sun
let monThisWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - offsetToMon
);

// 3) Compute the first day to draw
let startDate = new Date(monThisWeek);
startDate.setDate(startDate.getDate() - (COLS - 1) * 7);

// 4) Load only the “Fitness” calendar
let allCals     = await Calendar.forEvents();
let selectedCal = allCals.find(c => c.title === CALENDAR_NAME);
let events      = selectedCal
    ? await CalendarEvent.between(startDate, today, [selectedCal])
    : [];
console.log(`Loaded ${events.length} event(s) from calendar "${CALENDAR_NAME}"`);

// 5) Tally minutes per day
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
    // sum duration in whole minutes
    let mins = Math.round((ev.endDate - ev.startDate) / 60000);
    counts[k] += mins;
  }
}

// 6) Draw the heatmap into a transparent canvas
let ctx = new DrawContext();
ctx.size               = new Size(SIZE, SIZE);
ctx.opaque             = false;
ctx.respectScreenScale = true;

for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    // skip future days in the last column
    if (col === COLS - 1 && row > offsetToMon) continue;

    let d       = new Date(startDate);
    d.setDate(startDate.getDate() + col * 7 + row);
    let mins    = counts[d.toDateString()] || 0;

    // map 0→dark grey, then minute thresholds to 4 shades of pink
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

// 7) Build and set the widget
let w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.backgroundImage = ctx.getImage();
w.setPadding(0, 0, 0, 0);
Script.setWidget(w);
Script.complete();
