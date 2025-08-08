// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;

// Medium widget: 14 columns × 7 rows
// Three calendars (4 cols each) showing the SAME 4-week period

const WIDTH             = 280;          // Medium widget width
const HEIGHT            = 140;          // Medium widget height
const ROWS              = 7;            // days per column
const M                 = 4;            // fixed margin between & around cells
const R                 = 3;            // corner radius
const CALENDAR_NAMES    = [
  "Fitness",
  "Meditation",
  "Progress"
];
const SEG_WEEKS         = 4;            // weeks per calendar segment
const SPACING_COLS      = 1;            // columns between segments
const COLS              = CALENDAR_NAMES.length * SEG_WEEKS
    + (CALENDAR_NAMES.length - 1) * SPACING_COLS; // 14 total columns
const MAX_HOURS         = 9;            // cap for the lightest shade

// GitHub palette, but level‐0 = dark grey, then 4 greens (dark→light)
const COLORS = [
  "#333333", // 0 h
  "#007728", // >0 h
  "#02a232", // >MAX_HOURS*1/4
  "#0ac740", // >MAX_HOURS*2/4
  "#4ae168"  // ≥MAX_HOURS
];

// Calculate cell size from height
let cellSize  = Math.floor((HEIGHT - 2 * M - (ROWS - 1) * M) / ROWS);

// 1) Find this week’s Monday and period start (4 weeks back)
let today       = new Date();
let dow         = today.getDay();             // 0=Sun…6=Sat
let offsetToMon = (dow + 6) % 7;              // 0 for Mon→6 for Sun
let monThisWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - offsetToMon
);
let startDate = new Date(monThisWeek);
startDate.setDate(startDate.getDate() - (SEG_WEEKS - 1) * 7);

// 2) Load events for each calendar for the 4-week span
let allCals = await Calendar.forEvents();
let eventsByCal = {};
for (let name of CALENDAR_NAMES) {
  let cal = allCals.find(c => c.title === name);
  eventsByCal[name] = cal
      ? await CalendarEvent.between(startDate, today, [cal])
      : [];
}

// 3) Tally hours per day per calendar
let counts = {};
for (let name of CALENDAR_NAMES) {
  counts[name] = {};
}
for (let w = 0; w < SEG_WEEKS; w++) {
  for (let row = 0; row < ROWS; row++) {
    let d = new Date(startDate);
    d.setDate(d.getDate() + w * 7 + row);
    let key = d.toDateString();
    for (let name of CALENDAR_NAMES) {
      counts[name][key] = 0;
    }
  }
}
for (let name of CALENDAR_NAMES) {
  for (let ev of eventsByCal[name]) {
    let key = ev.startDate.toDateString();
    if (counts[name][key] !== undefined) {
      counts[name][key] += (ev.endDate - ev.startDate) / 1000 / 3600;
    }
  }
}

// 4) Draw the heatmap
let ctx = new DrawContext();
ctx.size               = new Size(WIDTH, HEIGHT);
ctx.opaque             = false;
ctx.respectScreenScale = true;

for (let i = 0; i < CALENDAR_NAMES.length; i++) {
  let name = CALENDAR_NAMES[i];
  for (let w = 0; w < SEG_WEEKS; w++) {
    for (let row = 0; row < ROWS; row++) {
      // skip future days in current week
      if (w === SEG_WEEKS - 1 && row > offsetToMon) continue;

      let d   = new Date(startDate);
      d.setDate(d.getDate() + w * 7 + row);
      let hrs = counts[name][d.toDateString()] || 0;

      let ratio = Math.min(hrs / MAX_HOURS, 1);
      let level = Math.round(ratio * (COLORS.length - 1));

      // x offset: segment index * (weeks+spacing) + week index
      let colIndex = i * (SEG_WEEKS + SPACING_COLS) + w;
      let x = M + colIndex * (cellSize + M) + 2.5;
      let y = M + row * (cellSize + M) + 3;
      ctx.setFillColor(new Color(COLORS[level]));

      let path = new Path();
      path.addRoundedRect(new Rect(x, y, cellSize, cellSize), R, R);
      ctx.addPath(path);
      ctx.fillPath();
    }
  }
}

// 5) Build and set the widget
let w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.backgroundImage = ctx.getImage();
w.setPadding(0, 0, 0, 0);
Script.setWidget(w);
Script.complete();