// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: times-circle;

// 대상 달력(CALENDAR_NAME): Distraction
// 집계 방식: event count per day
// block 곡률(R): 3

const SIZE = 150;            // Small widget approx size
const ROWS = 7;              // days per week
const M    = 4;              // margin (pts) between & around cells
const CALENDAR_NAME = "Distraction"; // 불러올 캘린더 이름
const R    = 4;              // cell 모서리 반경 (pts)

// 5-step red palette (0 → 4+ events)
const COLORS = [
  "#333333", // 0
  "#6e2222", // 1
  "#952b2b", // 2
  "#c84040", // 3
  "#ff5f5f"  // ≥ 4
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

// 4) Load only the 지정한 캘린더
let allCals = await Calendar.forEvents();
let distractionCal = allCals.find(c => c.title === CALENDAR_NAME);
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
  // 사각형에 곡률 적용
  let path = new Path();
  path.addRoundedRect(new Rect(x, y, cellSize, cellSize), R, R);
  ctx.addPath(path);
  ctx.fillPath();
}

// 7) Create and set the widget
let w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.backgroundImage = ctx.getImage();
w.setPadding(0, 0, 0, 0);
Script.setWidget(w);
Script.complete();
