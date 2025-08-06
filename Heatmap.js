// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;
// CalendarHeatmapSmall for Scriptable
// Small (≈155×155pt) transparent heatmap of the last 30 days

// ───── CONFIG ─────
const DAYS = 30;              // days back to render
const SIZE = 155;             // small widget dimensions
const COLORS = [
  "#eeeeee",
  "#d6e685",
  "#8cc665",
  "#44a340",
  "#1e6823"
];
// ────────────────────

let endDate = new Date();
let startDate = new Date(endDate);
startDate.setDate(endDate.getDate() - DAYS + 1);

// 1) Fetch calendar events
let events = await CalendarEvent.between(startDate, endDate, []);

// 2) Count per-day
let counts = {};
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  counts[d.toDateString()] = 0;
}
for (let ev of events) {
  let key = ev.startDate.toDateString();
  if (counts[key] !== undefined) counts[key]++;
}
let maxCount = Math.max(...Object.values(counts), 1);

// 3) Grid math (7 rows × N columns)
let startDow = startDate.getDay();
let cols = Math.ceil((startDow + DAYS) / 7);
let cellW = SIZE  / cols;
let cellH = SIZE / 7;

// 4) Draw on transparent canvas
let ctx = new DrawContext();
ctx.size = new Size(SIZE, SIZE);
ctx.opaque = false;              // ensure transparency
ctx.respectScreenScale = true;

for (let i = 0; i < DAYS; i++) {
  let d = new Date(startDate);
  d.setDate(startDate.getDate() + i);
  let c = counts[d.toDateString()];
  let level = Math.min(
    Math.floor((c / maxCount) * (COLORS.length - 1)),
    COLORS.length - 1
  );
  let idx = startDow + i;
  let col = Math.floor(idx / 7);
  let row = idx % 7;

  ctx.setFillColor(new Color(COLORS[level]));
  let m = 1;  // margin
  let x = col * cellW + m;
  let y = row * cellH + m;
  ctx.fillRect(new Rect(x, y, cellW - 2*m, cellH - 2*m));
}

// 5) Create widget with the drawn image
let w = new ListWidget();
w.backgroundImage = ctx.getImage();
w.setPadding(0, 0, 0, 0);
Script.setWidget(w);
Script.complete();