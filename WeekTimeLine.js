// ver 0.0.0
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline_UseAllEventsFiltered.js
// Scriptable Large widget: fetches all “Distraction” events and draws
// a weekly 9–23 timeline using each calendar’s color.

(async () => {
  console.log("🏁 Script start");

  // ── 1) Compute ISO-week window: Monday START_HOUR → next Monday END_HOUR
  const START_HOUR = 9;
  const END_HOUR   = 23;
  const now        = new Date();
  const diffToMon  = (now.getDay() + 6) % 7;
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - diffToMon);
  weekStart.setHours(START_HOUR, 0, 0, 0);
  const weekEnd    = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(END_HOUR, 0, 0, 0);
  console.log("📆 Week window:", weekStart.toISOString(), "→", weekEnd.toISOString());

  // 2) Find Monday of this week (for clamping past events)
  let today       = new Date();
  let dow         = today.getDay();             // 0=Sun…6=Sat
  let offsetToMon = (dow + 6) % 7;
  let monThisWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offsetToMon
  );

  // 3) Compute the first day to draw (keep your “-49 days” history if you want)
  let startDate = new Date(monThisWeek);
  startDate.setDate(startDate.getDate() - 49);

  // 4) Load only the “Distraction” calendar
  let allCals     = await Calendar.forEvents();
  let selectedCal = allCals.find(c => c.title === "Distraction");
  let disEvents   = selectedCal
      ? await CalendarEvent.between(startDate, today, [selectedCal])
      : [];
  // Inject dummy event for visual check
  disEvents.push({
    calendar:  { title: 'Distraction', color: selectedCal?.color },
    title:     '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1 * 86400000 + 1 * 3600000),
    endDate:   new Date(weekStart.getTime() + 1 * 86400000 + 3 * 3600000)
  });
  console.log("🧪 Injected dummy event. Total to draw:", disEvents.length);

  // 5) Prepare DrawContext
  const W    = 364, H = 364;
  const span = END_HOUR - START_HOUR;          // now 14 hours
  const rows = span;
  const cols = 7;
  const rowH = H / rows;
  const ctx  = new DrawContext();
  ctx.size               = new Size(W, H);
  ctx.opaque             = true;
  ctx.respectScreenScale = true;

  // Black background
  ctx.setFillColor(new Color('#000'));
  ctx.fillRect(new Rect(0, 0, W, H));

  // 6) Draw horizontal grid lines (one per hour from START_HOUR to END_HOUR)
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    const y = i * rowH + 0.5;
    ctx.fillRect(new Rect(0, y, W, 1));
  }

  // 7) Draw each event, clamped to the 9–23 window, using its calendar’s color
  console.log("✏️ Drawing events");
  for (const ev of disEvents) {
    const s = ev.startDate;
    const e = ev.endDate;
    // dayIndex 0..6 relative to this week
    const dayIndex = Math.floor((s - weekStart) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) continue;

    // Clamp start/end to our 9–23 window
    const dayBase = new Date(weekStart.getTime() + dayIndex * 86400000);
    const clampS  = new Date(dayBase); clampS.setHours(START_HOUR, 0, 0, 0);
    const clampE  = new Date(dayBase); clampE.setHours(END_HOUR, 0, 0, 0);
    const start   = new Date(Math.max(s, clampS));
    const end     = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    // Compute vertical position & height
    const sH  = start.getHours() + start.getMinutes() / 60;
    const eH  = end.getHours()   + end.getMinutes()   / 60;
    const y1  = (sH - START_HOUR) * rowH;
    const hgt = Math.max((eH - sH) * rowH, rowH * 0.3);
    const x1  = dayIndex * (W / cols);

    // Pick the calendar’s color, or fall back
    let fillColor = ev.calendar?.color || new Color('#95A5A6');
    ctx.setFillColor(fillColor);

    // Draw the event rectangle
    const rect = new Rect(x1 + 1, y1 + 1, W / cols - 2, hgt - 2);
    ctx.fillRect(rect);

    // Draw title (you can include times here if you like)
    const inset = 4;
    const txtR  = new Rect(
        rect.x + inset,
        rect.y + inset,
        rect.width - inset * 2,
        rect.height - inset * 2
    );
    ctx.setFont(Font.systemFont(10));
    ctx.setTextColor(new Color('#FFF'));
    ctx.drawTextInRect(ev.title, txtR);
  }

  // 8) Present widget
  console.log("🔍 Presenting widget");
  const widget = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
