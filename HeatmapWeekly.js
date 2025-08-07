// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: calendar-check;

console.log("🟢 Widget generation started (ver 0.2.4)");

const W            = 364;
const H            = 364;
const SAFE_MARGIN  = 8;           // 2px widget + 6px inset
const GRID_W       = 4.5;
const START_HOUR   = 9;
const END_HOUR     = 23;
const HOURS        = END_HOUR - START_HOUR; // 14
const DAYS         = 7;
const MAX_DIST     = 4;
const R            = 4;

// your calendars
const PRIMARY_CALS    = ["Focusmate","Fitness","Meditate"];
const DISTRACTION_CAL = "Distraction";
const ALL_CALS        = [...PRIMARY_CALS, DISTRACTION_CAL];

// day names for logging
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// color ramps
const PALETTES = {
  Focusmate:   ["#333","#174d25","#1e7533","#32b150","#40d663"],
  Fitness:     ["#333","#FFD1DC","#FFADC1","#FF7791","#FF3E61"],
  Meditate:  ["#333","#79C9B1","#53B69B","#2F9C82","#0A8068"],
  Distraction: ["#333","#6e2222","#952b2b","#c84040","#ff5f5f"]
};

const COLORS_ORANGE = [
  "#333333", // 0
  "#7f3f00", // 1: dark burnt orange
  "#b25a00", // 2: medium rich orange
  "#e0741b", // 3: vibrant orange
  "#ffac33"  // 4: light golden orange
];

const COLORS_PINK = [
  "#333333", // 0
  "#702039", // 1: deep rose
  "#b65078", // 2: rich pink
  "#e789b1", // 3: soft pink
  "#fccce6"  // 4: pastel baby-pink
];

const COLORS_AQUA = [
  "#333333", // 0
  "#00524e", // 1: dark teal
  "#007a78", // 2: medium teal
  "#00a79f", // 3: bright aqua
  "#33cfc7"  // 4: light minty aqua
];

// Bluish-Purple levels
const COLORS_BLUISH_PURPLE = [
  "#333333", // 0: no activity
  "#412b58", // 1: deep bluish-purple
  "#5c4985", // 2: medium slate purple
  "#7a6cb3", // 3: vibrant bluish-purple
  "#9a8edf"  // 4: light pastel bluish-purple
];

// Bluish-Purple levels (extra-blue)
const COLORS_BLUISH_PURPLE = [
  "#333333", // 0: no activity
  "#2e2f65", // 1: dark navy-purple
  "#3f4dc0", // 2: medium vibrant indigo
  "#5975eb", // 3: bright periwinkle-blue
  "#8aa9fe"  // 4: light sky-blue purple
];

const COLORS_PURPLE = [
  "#333333", // 0
  "#3d1f47", // 1: deep plum
  "#602b70", // 2: rich purple
  "#914da5", // 3: lavender purple
  "#b682d1"  // 4: light lilac
];


/////////////////////////////////////////////////////////
// 1) Layout
console.log("Layout constants:", {W,H,SAFE_MARGIN,GRID_W,START_HOUR,END_HOUR,HOURS,DAYS});
const contentW = W - SAFE_MARGIN*2;
const contentH = H - SAFE_MARGIN*2;
const COLS     = DAYS * 2;    // left=primary, right=distraction
const ROWS     = HOURS;
const cellW    = (contentW - (COLS-1)*GRID_W) / COLS;
const cellH    = (contentH - (ROWS-1)*GRID_W) / ROWS;
console.log("Cell size:", {cellW, cellH});

/////////////////////////////////////////////////////////
// 2) This week’s window
const now        = new Date();
const dow        = now.getDay();
const diffToMon  = (dow + 6) % 7;
const monMid     = new Date(now);
monMid.setDate(now.getDate() - diffToMon);
monMid.setHours(0,0,0,0);

const weekStart  = new Date(monMid); weekStart.setHours(START_HOUR,0,0,0);
const weekEnd    = new Date(monMid); weekEnd.setDate(monMid.getDate()+7);
weekEnd.setHours(END_HOUR,0,0,0);

console.log("Week span:", { weekStart: weekStart.toString(), weekEnd: weekEnd.toString() });

const msPerDay       = 86400e3;
const currentDayIdx  = Math.floor((now - monMid)/msPerDay);
const currentHourIdx = now.getHours() - START_HOUR;
console.log("Now is", now.toString(), "→ currentDayIdx=", currentDayIdx, "currentHourIdx=", currentHourIdx);

/////////////////////////////////////////////////////////
// 3) Fetch calendars & events
console.log("Fetching calendars…");
const allCals  = await Calendar.forEvents();
const calMaps  = ALL_CALS.map(name => {
  const c = allCals.find(x => x.title.toLowerCase() === name.toLowerCase());
  if (!c) console.warn(`⚠️ Calendar not found: “${name}”`);
  return c || null;
});
console.log("Calendar mappings (in order):", ALL_CALS.map((n,i)=>(calMaps[i]? calMaps[i].title : null)));

console.log("Fetching events for each calendar…");
const calEvents = await Promise.all(
    calMaps.map(c => c
        ? CalendarEvent.between(weekStart, weekEnd, [c])
        : Promise.resolve([])
    )
);
calEvents.forEach((evs,i) => {
  console.log(`  → ${ALL_CALS[i]}: ${evs.length} events`);
});

/////////////////////////////////////////////////////////
// 4) Bin every calendar into a DAYS×HOURS matrix
console.log("Binning events into slots…");
const bins = calEvents.map((events, idx) => {
  const mat = Array.from({length:DAYS},()=>Array(ROWS).fill(0));
  for (let ev of events) {
    const s = ev.startDate.getTime();
    const e = ev.endDate.getTime();
    const dayIdx = Math.floor((s - monMid)/msPerDay);
    if (dayIdx<0||dayIdx>=DAYS) continue;
    const dayBase = monMid.getTime() + dayIdx*msPerDay;
    for (let h=START_HOUR; h<END_HOUR; h++) {
      const slotStart = dayBase + h*3600e3;
      const slotEnd   = slotStart + 3600e3;
      if (idx < PRIMARY_CALS.length) {
        // sum minutes of overlap
        const overlap = Math.min(e,slotEnd) - Math.max(s,slotStart);
        if (overlap > 0) {
          mat[dayIdx][h-START_HOUR] += overlap/60000;
        }
      } else {
        // distraction: count capped events
        if (s < slotEnd && e > slotStart) {
          mat[dayIdx][h-START_HOUR] = Math.min(mat[dayIdx][h-START_HOUR]+1, MAX_DIST);
        }
      }
    }
  }
  console.log(`  • Binned ${ALL_CALS[idx]} → first day-hours:`, mat[0].slice(0,5));
  return mat;
});
const primaryBins    = bins.slice(0, PRIMARY_CALS.length);
const distractionBin = bins[bins.length-1];

/////////////////////////////////////////////////////////
// 5) Draw and log each slot’s decision
console.log("Drawing slots…");
const ctx = new DrawContext();
ctx.size               = new Size(W,H);
ctx.respectScreenScale = true;
ctx.opaque             = false;
ctx.setFillColor(new Color("#000"));
ctx.fillRect(new Rect(0,0,W,H));

for (let d=0; d<DAYS; d++) {
  for (let hr=0; hr<ROWS; hr++) {
    if (d>currentDayIdx) break;
    if (d===currentDayIdx && hr>currentHourIdx) break;

    const y  = SAFE_MARGIN + hr*(cellH+GRID_W);
    const x0 = SAFE_MARGIN + (d*2)*(cellW+GRID_W);
    const x1 = x0 + cellW + GRID_W;

    // — left: pick the primary with most minutes
    const minutes = primaryBins.map(mb=>mb[d][hr]);
    const winner  = minutes.indexOf(Math.max(...minutes));
    const m       = minutes[winner];
    const step    = m===0?0 : m<15?1 : m<30?2 : m<50?3 : 4;
    const calName = PRIMARY_CALS[winner];
    const colPrim = PALETTES[calName][step];

    console.log(`Slot ${DAY_NAMES[d]} ${START_HOUR+hr}–${START_HOUR+hr+1}:`,
        PRIMARY_CALS.map((n,i)=>`${n}=${minutes[i].toFixed(1)}m`).join(", "),
        `→ winner=${calName} (step=${step})`
    );

    ctx.setFillColor(new Color(colPrim));
    let p = new Path();
    p.addRoundedRect(new Rect(x0,y,cellW,cellH), R,R);
    ctx.addPath(p);
    ctx.fillPath();

    // — right: distraction
    const cnt = distractionBin[d][hr];
    const idx = Math.min(cnt, PALETTES.Distraction.length-1);
    const colD = PALETTES.Distraction[idx];

    console.log(`  Distraction count=${cnt} → color step=${idx}`);

    ctx.setFillColor(new Color(colD));
    p = new Path();
    p.addRoundedRect(new Rect(x1,y,cellW,cellH), R,R);
    ctx.addPath(p);
    ctx.fillPath();
  }
}

console.log("✅ All slots drawn, finalizing widget.");

const widget = new ListWidget();
widget.backgroundImage = ctx.getImage();
widget.setPadding(0,0,0,0);

console.log("🎉 Widget generation complete!");
Script.setWidget(widget);
Script.complete();
