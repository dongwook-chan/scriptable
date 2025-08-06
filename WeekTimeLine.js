// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline_UseAllEventsFiltered.js
// Scriptable Large widget: fetches all events and filters for “Distraction”
// with full startup logging and a 1.5 s timeout

(async () => {
  // ── STARTUP LOGGING ─────────────────────────────────────────────
  console.log("🏁 Script start");
  console.log("🧩 config.runsInWidget:", config.runsInWidget);
  console.log("📦 config.widgetFamily:", config.widgetFamily);
  console.log("⏱️ Timestamp:", new Date().toISOString());

  // 1) Compute ISO-week window: Monday 07:00 → next Monday 23:00
  const now      = new Date();
  const diffToMon= (now.getDay() + 6) % 7;
  const weekStart= new Date(now);
  weekStart.setDate(now.getDate() - diffToMon);
  weekStart.setHours(7, 0, 0, 0);
  const weekEnd  = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 0, 0, 0);
  console.log("📆 Week window:", weekStart.toISOString(), "→", weekEnd.toISOString());

  // 2) Fetch ALL events (no calendar filter) with 1.5 s timeout
  // 2) Find this week’s Monday
  console.log("2)");
  let today       = new Date();
  let dow         = today.getDay();             // 0=Sun…6=Sat
  let offsetToMon = (dow + 6) % 7;              // 0 for Mon→6 for Sun
  let monThisWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - offsetToMon
  );

  // 3) Compute the first day to draw
  console.log("3)");
  let startDate = new Date(monThisWeek);
  console.log("3)");
  startDate.setDate(startDate.getDate() - 49);
  console.log("3)");


  // 4) Load only the “Focusmate” calendar
  console.log("4)");
  let allCals     = await Calendar.forEvents();
  console.log(allCals.length);
  let selectedCal = allCals.find(c => c.title === "Distraction");
  console.log(selectedCal.length);
  let disEvents      = selectedCal
    ? await CalendarEvent.between(startDate, today, [selectedCal])
    : [];
  console.log(disEvents.length);
  // 4) Inject dummy event on Tuesday 08:00–10:00 for visual check
  disEvents.push({
    calendar:  { title: 'Distraction' },
    title:     '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1 * 86400000 + 1 * 3600000),
    endDate:   new Date(weekStart.getTime() + 1 * 86400000 + 3 * 3600000)
  });
  console.log("🧪 Injected dummy event. Total to draw:", disEvents.length);

  // 5) Prepare DrawContext (364×364 pts)
  const W = 364, H = 364, rows = 16, cols = 7;
  const rowH = H / rows;
  const ctx = new DrawContext();
  ctx.size = new Size(W, H);
  ctx.opaque = true;
  ctx.respectScreenScale = true;

  // Black background
  ctx.setFillColor(new Color('#000'));
  ctx.fillRect(new Rect(0, 0, W, H));

  // 6) Draw horizontal grid lines (one per hour from 07 to 23)
  console.log("📊 Drawing grid lines");
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    const y = i * rowH + 0.5;
    ctx.fillRect(new Rect(0, y, W, 1));
  }

  // 7) Draw each “Distraction” event as a true-height rectangle
  console.log("✏️ Drawing events");
  const DIS_COLOR = new Color('#95A5A6');
  for (const ev of disEvents) {
    const s = ev.startDate;
    console.log(s);
    const e = ev.endDate;
    console.log(e);
    const dayIndex = Math.floor((s - weekStart) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) continue;

    // Clamp to 07:00–23:00
    const dayBase = new Date(weekStart.getTime() + dayIndex * 86400000);
    const clampS = new Date(dayBase); clampS.setHours(7, 0, 0, 0);
    const clampE = new Date(dayBase); clampE.setHours(23, 0, 0, 0);
    const start = new Date(Math.max(s, clampS));
    const end   = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    const sH = start.getHours() + start.getMinutes() / 60;
    const eH = end  .getHours() + end  .getMinutes() / 60;
    const y1 = (sH - 7) * rowH;
    const hgt = Math.max((eH - sH) * rowH, rowH * 0.3);
    const x1 = dayIndex * (W / cols);

    // Draw event rectangle
    const rect = new Rect(x1 + 1, y1 + 1, W / cols - 2, hgt - 2);
    ctx.setFillColor(DIS_COLOR);
    ctx.fillRect(rect);

    // Draw title inset by 4 pts
    const inset = 4;
    const txtR = new Rect(
      rect.x + inset,
      rect.y + inset,
      rect.width - inset * 2,
      rect.height - inset * 2
    );
    ctx.setFont(Font.systemFont(10));
    ctx.setTextColor(new Color('#FFF'));
    ctx.drawTextInRect(ev.title || '', txtR);
  }

  // 8) Present in-app for full console visibility
  console.log("🔍 Presenting widget for preview");
  const widget = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
