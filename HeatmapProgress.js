// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: tasks;

// 대상 리마인더 리스트(LIST_NAME): Progress
// 집계 방식: completed / total reminders per day
// block 곡률(R): 3

const SIZE          = 150;          // widget canvas size
const ROWS          = 7;            // days per column
const M             = 4;            // fixed margin between & around cells
const R             = 3;            // corner radius
const LIST_NAME     = "Progress";   // reminder list to draw
// 5-step aqua palette (ratio 0→1)
const COLORS_AQUA = [
  "#333333", // 0.00
  "#00524e", // 0.25
  "#007a78", // 0.50
  "#00a79f", // 0.75
  "#33cfc7"  // 1.00
];

// 1) Compute cellSize & number of columns
let cellSize  = Math.floor((SIZE - 2*M - (ROWS - 1)*M) / ROWS);
let gridWidth = SIZE - 2*M;
let COLS      = Math.floor((gridWidth + M) / (cellSize + M));

// 2) Find this week’s Monday
let today       = new Date();
let dow         = today.getDay();              // 0=Sun…6=Sat
let offsetToMon = (dow + 6) % 7;               // 0=Mon…6=Sun
let monThisWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - offsetToMon
);

// 3) Compute the first day to draw
let startDate = new Date(monThisWeek);
startDate.setDate(startDate.getDate() - (COLS - 1) * 7);

// 4) Load “Progress” reminder list
let listCal   = await Calendar.forRemindersByTitle(LIST_NAME);
let reminders = listCal
    ? await Reminder.all([listCal])
    : [];
console.log(`Loaded ${reminders.length} reminder(s)`);

// 5) Tally total vs. completed per day
let totalCounts     = {};
let completedCounts = {};
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    let d = new Date(startDate);
    d.setDate(startDate.getDate() + col * 7 + row);
    let key = d.toDateString();
    totalCounts[key]     = 0;
    completedCounts[key] = 0;
  }
}
for (let rem of reminders) {
  if (rem.dueDate) {
    let key = rem.dueDate.toDateString();
    if (totalCounts[key] !== undefined) {
      totalCounts[key]++;
      if (rem.isCompleted) {
        completedCounts[key]++;
      }
    }
  }
}

// 6) Draw the heatmap
let ctx = new DrawContext();
ctx.size               = new Size(SIZE, SIZE);
ctx.opaque             = false;
ctx.respectScreenScale = true;

for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    // skip future days in last column
    if (col === COLS - 1 && row > offsetToMon) continue;

    let d   = new Date(startDate);
    d.setDate(startDate.getDate() + col * 7 + row);
    let key = d.toDateString();
    let total = totalCounts[key]     || 0;
    let done  = completedCounts[key] || 0;

    // compute ratio and level
    let ratio = total > 0 ? done / total : 0;
    let level = Math.round(ratio * (COLORS_AQUA.length - 1));

    console.log(
        `${key} → total=${total}, done=${done}, ratio=${ratio.toFixed(2)}, level=${level}`
    );

    let x = M + col * (cellSize + M) + 3;
    let y = M + row * (cellSize + M) + 2;
    ctx.setFillColor(new Color(COLORS_AQUA[level]));

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
