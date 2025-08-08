// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: times-circle;

// 대상 달력(CALENDAR_NAME): Distraction
// 집계 방식: event count per day
// block 곡률(R): 3

const SIZE           = 150;        // Small widget canvas size
const ROWS           = 7;          // days per column
const M              = 4;          // fixed margin between & around cells
const R              = 3;          // corner radius
const CALENDAR_NAME  = "Distraction";// calendar to draw
const MAX_EVENTS     = 30;          // cap for the lightest shade

// 5-step red palette (0 → 4+ events)
const COLORS = [
  "#333333", // 0 events
  "#6e2222", // >0 events
  "#952b2b", // >MAX_EVENTS*1/4
  "#c84040", // >MAX_EVENTS*2/4
  "#ff5f5f"  // ≥MAX_EVENTS
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

// 4) Load only the “Distraction” calendar
let allCals     = await Calendar.forEvents();
let selectedCal = allCals.find(c => c.title === CALENDAR_NAME);
let events      = selectedCal
    ? await CalendarEvent.between(startDate, today, [selectedCal])
    : [];
console.log(`Loaded ${events.length} event(s) from calendar "${CALENDAR_NAME}"`);

// 5) Tally event count per day
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
  if (counts[k] !== undefined) {
    counts[k]++;
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
    let evCount = counts[d.toDateString()] || 0;

    // map 0→dark grey, then 1…MAX_EVENTS to 4 shades of red
    let ratio = Math.min(evCount / MAX_EVENTS, 1);
    let level = Math.round(ratio * (COLORS.length - 1));

    // **LOGGING:**
    // console.log(
    //     `${d.toDateString()} → count=${evCount}, ratio=${ratio.toFixed(2)}, level=${level}`
    // );

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
