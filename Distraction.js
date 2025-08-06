// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: magic;
// CalendarHeatmapDistractionGitHub2
// Small (≈155×155 pt) GitHub-style red heatmap of “Distraction” events
// • Monday–row 0 … Sunday–row 6, as many cols as fit
// • Only Mon–Wed in final column (today = Wednesday)
// • 4 pt margin all around and between cells; transparent BG

const SIZE = 150;     // Small widget approx size
const ROWS = 7;       // days per week
const M    = 4;       // margin (pts) between & around cells

// 5-step red palette (0 → 4+ events)
const COLORS = [
  "#ebedf0",  // 0 events
  "#fee0d2",  // light
  "#fc9272",  // medium
  "#de2d26",  // dark
  "#a50f15"   // very dark
];

// 1) Compute cell size and number of columns
let cellSize = Math.floor((SIZE - 2*M - (ROWS - 1)*M) / ROWS);
let gridWidth = SIZE - 2*M;
let COLS = Math.floor((gridWidth + M) / (cellSize + M));

// 2) Find the Monday of this week
let today = new Date();
let dow   = today.getDay();                      // 0=Sun,1=Mon…
let offsetToMon = (dow + 6) % 7;                 // 0 for Mon, 1 for Tue…
let monThisWeek = new Date(
  today.getFullYear(), today.getMonth(),
  today.getDate() - offsetToMon
);

// 3) Compute start date (go back COLS−1 full weeks)
let startDate = new Date(monThisWeek);
startDate.setDate(startDate.getDate() - (COLS - 1) * 7);

// 4) Load only the “Distraction” calendar
let allCals = await Calendar.forEvents();
let distractionCal = allCals.find(c => c.title === "Distraction");
let events = distractionCal
  ? await CalendarEvent.between(startDate, today, [distractionCal])
  : [];

// 5) Tally counts per date
let counts = {};
for (let i = 0; i < COLS * ROWS; i++) {
  let col = Math.floor(i / ROWS), row = i % ROWS;
  let d = new Date(startDate);
  d.setDate(startDate.getDate() + col*7 + row);
  counts[d.toDateString()] = 0;
}
for (let ev of events) {
  let k = ev.startDate.toDateString();
  if (counts[k] !== undefined) counts[k]++;
}
let maxCount = Math.max(...Object.values(counts), 1);

// 6) Draw into a transparent canvas
let ctx = new DrawContext();
ctx.size               = new Size(SIZE, SIZE);
ctx.opaque             = false;
ctx.respectScreenScale = true;

for (let i = 0; i < COLS * ROWS; i++) {
  let col = Math.floor(i / ROWS), row = i % ROWS;
  // Skip future days in current (last) column
  if (col === COLS - 1 && row > offsetToMon) continue;

  let d = new Date(startDate);
  d.setDate(startDate.getDate() + col*7 + row);
  let c = counts[d.toDateString()] || 0;
  let level = c === 0
    ? 0
    : Math.min(1 + Math.floor((c / maxCount) * (COLORS.length - 2)), COLORS.length - 1);

  let x = M + col * (cellSize + M) + 3;
  let y = M + row * (cellSize + M) + 2;
  ctx.setFillColor(new Color(COLORS[level]));
  ctx.fillRect(new Rect(x, y, cellSize, cellSize));
}

// 7) Create and set the widget
let w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.backgroundImage = ctx.getImage();
w.setPadding(0, 0, 0, 0);
Script.setWidget(w);
Script.complete();