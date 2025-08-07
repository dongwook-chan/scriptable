// ver 0.1.8
// Variables used by Scriptable.
// icon-color: yellow; icon-glyph: magic;
// CalendarHourlyHeatmapDual.js
// Two‐column hourly heatmap for “Focusmate” (duration-based green) and “Distraction” (count-based red)
//  • Hours 09–23, days Mon–Sun, left = Focusmate, right = Distraction
//  • Focusmate blocks colored by total minutes in that hour
//  • Distraction blocks colored by event count: darkest red = 1 event, lightest red ≥4 events
//  • Single‐event red is now extra dark

console.log("🟢 Widget generation started (ver 0.1.8)");

const W           = 364;
const H           = 364;
const SAFE_MARGIN = 2 + 6;       // 2px widget margin + 6px corner inset
const GRID_W      = 4.5;         // fractional grid width
const START_HOUR  = 9;
const END_HOUR    = 23;
const HOURS       = END_HOUR - START_HOUR; // 14 rows
const DAYS        = 7;           // Mon…Sun
const CALS        = ["Focusmate", "Distraction"];
const MAX_EVENTS  = 4;           // cap for Distraction count mapping

// Green palette for Focusmate / Red palette for Distraction (darkest at low counts)
const COLORS_F = [
  "#333333", // 0 min
  "#174d25", // 1–14 min
  "#1e7533", // 15–29 min
  "#32b150", // 30–49 min
  "#40d663"  // ≥ 50 min
];
const COLORS_D = [
  "#333333", // 0
  "#6e2222", // 1
  "#952b2b", // 2
  "#c84040", // 3
  "#ff5f5f"  // ≥ 4
];

console.log("Constants:", { W, H, SAFE_MARGIN, GRID_W, START_HOUR, END_HOUR, HOURS, DAYS, CALS, MAX_EVENTS });

// 1) Compute content area & cell sizes
const contentW = W - 2 * SAFE_MARGIN;
const contentH = H - 2 * SAFE_MARGIN;
const COLS     = DAYS * CALS.length;
const ROWS     = HOURS;
const cellW    = (contentW - (COLS - 1) * GRID_W) / COLS;
const cellH    = (contentH - (ROWS - 1) * GRID_W) / ROWS;

// 2) Compute this week’s Monday @00:00 → Sunday @END_HOUR
const now       = new Date();
const dow       = now.getDay();
const diffToMon = (dow + 6) % 7;
const monMid    = new Date(now);
monMid.setDate(now.getDate() - diffToMon);
monMid.setHours(0, 0, 0, 0);

const weekStart = new Date(monMid);
weekStart.setHours(START_HOUR, 0, 0, 0);
const weekEnd   = new Date(monMid);
weekEnd.setDate(monMid.getDate() + 7);
weekEnd.setHours(END_HOUR, 0, 0, 0);

const msPerDay         = 24 * 60 * 60 * 1000;
const currentDayIndex  = Math.floor((now - monMid) / msPerDay);
const currentHourIndex = now.getHours() - START_HOUR;

// 3) Fetch calendars & 4) fetch events
const allCals = await Calendar.forEvents();
const calMaps = CALS.map(name => allCals.find(c => c.title === name) || null);
const calEvents = await Promise.all(
    calMaps.map(async (cal) => cal ? await CalendarEvent.between(weekStart, weekEnd, [cal]) : [])
);

// 5) Bin events into [day][hour] slots
const bins = calEvents.map((events, ci) => {
  const b = Array.from({ length: DAYS }, () => Array(ROWS).fill(0));
  for (const ev of events) {
    const s  = ev.startDate, e = ev.endDate;
    const di = Math.floor((s - monMid) / msPerDay);
    if (di < 0 || di >= DAYS) continue;
    const dayBase = new Date(monMid.getTime() + di * msPerDay);
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const slotStart = new Date(dayBase); slotStart.setHours(h,0,0,0);
      const slotEnd   = new Date(dayBase); slotEnd.setHours(h+1,0,0,0);
      if (s < slotEnd && e > slotStart) {
        const hi = h - START_HOUR;
        if (ci === 0) {
          const overlapStart = s > slotStart ? s : slotStart;
          const overlapEnd   = e < slotEnd   ? e : slotEnd;
          b[di][hi] += (overlapEnd - overlapStart) / 60000;
        } else {
          b[di][hi] = Math.min(b[di][hi] + 1, MAX_EVENTS);
        }
      }
    }
  }
  return b;
});

// 6) Draw canvas & 7) render only past/current slots
const ctx = new DrawContext();
ctx.size               = new Size(W, H);
ctx.respectScreenScale = true;
ctx.opaque             = false;
ctx.setFillColor(new Color("#000"));
ctx.fillRect(new Rect(0,0,W,H));

for (let di = 0; di < DAYS; di++) {
  for (let hi = 0; hi < ROWS; hi++) {
    if (di > currentDayIndex) continue;
    if (di === currentDayIndex && hi > currentHourIndex) continue;
    for (let ci = 0; ci < CALS.length; ci++) {
      const colIndex = di * CALS.length + ci;
      const x = SAFE_MARGIN + colIndex * (cellW + GRID_W);
      const y = SAFE_MARGIN + hi       * (cellH + GRID_W);
      let color;
      if (ci === 0) {
        const mins = bins[0][di][hi];
        const idx = mins === 0 ? 0 : mins < 15 ? 1 : mins < 30 ? 2 : mins < 50 ? 3 : 4;
        color = COLORS_F[idx];
      } else {
        const cnt = bins[1][di][hi];
        color = COLORS_D[cnt];
      }
      ctx.setFillColor(new Color(color));
      ctx.fillRect(new Rect(x, y, cellW, cellH));
    }
  }
}

// 8) Finalize widget
const widget = new ListWidget();
widget.backgroundImage = ctx.getImage();
widget.setPadding(0,0,0,0);
Script.setWidget(widget);
Script.complete();
