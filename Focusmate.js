// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: magic;
// CalendarHeatmapFocusmateGitHubHours
// Small (≈155×155 pt) GitHub–style green heatmap of “Focusmate” events
//  • Monday–row 0 … Sunday–row 6, as many columns as fit  
//  • Only Mon–Wed in the final column (today = Wednesday)  
//  • 4 pt margin all around and between cells; transparent BG  
//  • 0 hours = dark grey, then green shades lightening up to 9 hours = lightest green  

const SIZE           = 150;        // Small widget canvas size
const ROWS           = 7;          // days per column
const M              = 4;          // fixed margin between & around cells
const R              = 0;          // corner radius
const CALENDAR_NAME  = "Focusmate";// calendar to draw
const MAX_HOURS      = 9;          // cap for the lightest shade

// GitHub palette, but level‐0 = dark grey, then 4 greens (dark→light)
const COLORS = [
  "#444444", // 0 h
  "#007728", // >0 h
  "#02a232", // >MAX_HOURS*1/4
  "#0ac740", // >MAX_HOURS*2/4
  "#4ae168"  // ≥MAX_HOURS
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

// 4) Load only the “Focusmate” calendar
let allCals     = await Calendar.forEvents();
let selectedCal = allCals.find(c => c.title === CALENDAR_NAME);
let events      = selectedCal
  ? await CalendarEvent.between(startDate, today, [selectedCal])
  : [];

// 5) Tally total hours per day
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
    counts[k] += (ev.endDate - ev.startDate) / 1000 / 3600;
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

    let d   = new Date(startDate);
    d.setDate(startDate.getDate() + col * 7 + row);
    let hrs = counts[d.toDateString()] || 0;

    // map 0→dark grey, then 1…MAX_HOURS to 4 shades of green
    let ratio = Math.min(hrs / MAX_HOURS, 1);
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