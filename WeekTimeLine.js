// ver 0.1.4
// Variables used by Scriptable.
// icon-color: yellow; icon-glyph: magic;
// CalendarHourlyHeatmapDual.js
// Two‐column hourly heatmap for “Focusmate” (green) and “Distraction” (red)
//  • Hours 09–23, days Mon–Sun, left = Focusmate, right = Distraction

console.log("🟢 Widget generation started");

const W           = 364;
const H           = 364;
const SAFE_MARGIN = 2 + 6;      // 2px widget margin + 6px corner inset
const GRID_W      = 4.5;        // ← changed from 4.0 to 4.5
const START_HOUR  = 9;
const END_HOUR    = 23;
const HOURS       = END_HOUR - START_HOUR; // 14 rows
const DAYS        = 7;          // Mon…Sun
const CALS        = ["Focusmate", "Distraction"];
const MAX_EVENTS  = 4;          // cap for color mapping

// Green palette for Focusmate / Red palette for Distraction
const COLORS_F = [
  "#444444", // 0 events
  "#007728", // 1 event
  "#02a232", // 2 events
  "#0ac740", // 3 events
  "#4ae168"  // 4+ events
];
const COLORS_D = [
  "#444444", // 0 events
  "#ffcccc", // 1 event
  "#ff6666", // 2 events
  "#ff3333", // 3 events
  "#cc0000"  // 4+ events
];

console.log("Constants:", {
  W, H, SAFE_MARGIN, GRID_W,
  START_HOUR, END_HOUR, HOURS, DAYS, CALS, MAX_EVENTS
});

// 1) Compute content area & cell sizes
const contentW = W - 2 * SAFE_MARGIN;
const contentH = H - 2 * SAFE_MARGIN;
const COLS     = DAYS * CALS.length; // 14 columns total (7 days × 2 calendars)
const ROWS     = HOURS;              // 14 rows total (hours 09–22)

// ← use exact division so everything still sums exactly to W/H
const cellW    = (contentW - (COLS - 1) * GRID_W) / COLS;
const cellH    = (contentH - (ROWS - 1) * GRID_W) / ROWS;

console.log("Layout computed:", {
  contentW, contentH, COLS, ROWS,
  cellW, cellH
});

// 2) Compute this week’s Monday @00:00 → Sunday @END_HOUR
const now       = new Date();
console.log("Current date/time:", now);

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

console.log("Week range:", { monMid, weekStart, weekEnd });

// 3) Fetch “Focusmate” and “Distraction” calendars
const allCals = await Calendar.forEvents();
console.log("All calendars fetched:", allCals.map(c => c.title));

const calMaps = CALS.map(name => {
  const cal = allCals.find(c => c.title === name) || null;
  console.log(`Calendar lookup for "${name}":`, cal ? "FOUND" : "MISSING");
  return cal;
});

// 4) Fetch events for each calendar
const calEvents = await Promise.all(
    calMaps.map(async (cal, i) => {
      if (!cal) return [];
      const evs = await CalendarEvent.between(weekStart, weekEnd, [cal]);
      console.log(`Events for "${CALS[i]}" between ${weekStart.toISOString()}–${weekEnd.toISOString()}:`, evs.length);
      return evs;
    })
);

// 5) Bin events into hourly slots [calendar][day][hour]
const bins = calEvents.map((events, ci) => {
  console.log(`\nBinning ${events.length} events for "${CALS[ci]}"`);
  const b = Array.from({ length: DAYS }, () => Array(ROWS).fill(0));
  for (const ev of events) {
    const s  = ev.startDate;
    const e  = ev.endDate;
    const di = Math.floor((s - monMid) / 86400000);
    if (di < 0 || di >= DAYS) {
      console.log("  • Skipping event outside week:", s);
      continue;
    }
    const dayBase = new Date(monMid.getTime() + di * 86400000);
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const slotStart = new Date(dayBase); slotStart.setHours(h, 0, 0, 0);
      const slotEnd   = new Date(dayBase); slotEnd.setHours(h + 1, 0, 0, 0);
      if (s < slotEnd && e > slotStart) {
        const hi = h - START_HOUR;
        b[di][hi] = Math.min(b[di][hi] + 1, MAX_EVENTS);
        console.log(`  • Event "${ev.title || '•'}" hits day ${di}, hour ${h}: count now ${b[di][hi]}`);
      }
    }
  }
  return b;
});

console.log("\nBinning complete:", bins);

// 6) Draw into a transparent canvas
const ctx = new DrawContext();
ctx.size               = new Size(W, H);
ctx.respectScreenScale = true;
ctx.opaque             = false;

// Fill background behind grid gaps
ctx.setFillColor(new Color("#000"));
ctx.fillRect(new Rect(0, 0, W, H));

// 7) Render each block with its calendar’s palette
console.log("\nRendering cells:");
for (let di = 0; di < DAYS; di++) {
  for (let hi = 0; hi < ROWS; hi++) {
    for (let ci = 0; ci < CALS.length; ci++) {
      const palette = ci === 0 ? COLORS_F : COLORS_D;
      const colName = CALS[ci];
      const colIndex = di * CALS.length + ci;
      const x = SAFE_MARGIN + colIndex * (cellW + GRID_W);
      const y = SAFE_MARGIN + hi       * (cellH + GRID_W);
      const count = bins[ci][di][hi];
      console.log(`  • [${colName}] day ${di}, hour slot ${hi}: count=${count}, color=${palette[count]}`);
      ctx.setFillColor(new Color(palette[count]));
      ctx.fillRect(new Rect(x, y, cellW, cellH));
    }
  }
}

// 8) Build & set the widget
console.log("Finalizing widget");
const widget = new ListWidget();
widget.backgroundImage = ctx.getImage();
widget.setPadding(0, 0, 0, 0);

Script.setWidget(widget);
Script.complete();
console.log("✅ Widget set; script complete");
