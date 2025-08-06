// ver 0.0.1
// Variables used by Scriptable.
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline.js
// Scriptable Large widget: weekly 9–23 timeline, per-calendar colors.

;(async () => {
  console.log("🏁 Script start");

  // ── 1) Define window hours and compute this week's Monday at midnight
  const START_HOUR = 9;
  const END_HOUR   = 23;
  const now        = new Date();
  const diffToMon  = (now.getDay() + 6) % 7;

  // monMid = this week's Monday at 00:00
  const monMid = new Date(now);
  monMid.setDate(now.getDate() - diffToMon);
  monMid.setHours(0, 0, 0, 0);

  // weekStart = Monday at START_HOUR
  const weekStart = new Date(monMid);
  weekStart.setHours(START_HOUR, 0, 0, 0);

  // weekEnd = next Monday at END_HOUR
  const weekEnd = new Date(monMid);
  weekEnd.setDate(monMid.getDate() + 7);
  weekEnd.setHours(END_HOUR, 0, 0, 0);

  console.log("📆 Week window:", weekStart.toISOString(), "→", weekEnd.toISOString());

  // ── 2) Compute a history boundary (e.g. 7 weeks ago) for fetching past events
  const today       = new Date();
  const dow         = today.getDay();              // 0=Sun…6=Sat
  const offsetToMon = (dow + 6) % 7;
  const monThisWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offsetToMon
  );
  const startDate = new Date(monThisWeek);
  startDate.setDate(startDate.getDate() - 49);     // 7 weeks back

  // ── 3) Load only the “Distraction” calendar’s events
  const allCals     = await Calendar.forEvents();
  const selectedCal = allCals.find(c => c.title === "Distraction");
  let disEvents     = selectedCal
      ? await CalendarEvent.between(startDate, today, [selectedCal])
      : [];

  // Inject dummy event for visual check (Tuesday 10:00–12:00)
  disEvents.push({
    calendar:  { title: 'Distraction', color: selectedCal?.color },
    title:     '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1 * 86400000 + 1 * 3600000),
    endDate:   new Date(weekStart.getTime() + 1 * 86400000 + 3 * 3600000)
  });
  console.log("🧪 Injected dummy event. Total to draw:", disEvents.length);

  // ── 4) Prepare DrawContext
  const W    = 364;
  const H    = 364;
  const span = END_HOUR - START_HOUR;   // 14 hours (9 → 23)
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

  // ── 5) Draw horizontal grid lines (one per hour)
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    const y = i * rowH + 0.5;
    ctx.fillRect(new Rect(0, y, W, 1));
  }

  // ── 6) Draw each event, clamped to 9–23, colored by calendar
  console.log("✏️ Drawing events");
  for (const ev of disEvents) {
    const s = ev.startDate;
    const e = ev.endDate;

    // dayIndex from Monday 00:00 → ensures even 08:30 maps to day 0
    const dayIndex = Math.floor((s - monMid) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) continue;

    // Define that day's 9:00 and 23:00 clamp points
    const dayBase = new Date(monMid.getTime() + dayIndex * 86400000);
    const clampS  = new Date(dayBase); clampS.setHours(START_HOUR, 0, 0, 0);
    const clampE  = new Date(dayBase); clampE.setHours(END_HOUR,   0, 0, 0);

    // Clamp start/end
    const start = new Date(Math.max(s, clampS));
    const end   = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    // Compute Y position & height
    const sH  = start.getHours() + start.getMinutes() / 60;
    const eH  = end.getHours()   + end.getMinutes()   / 60;
    const y1  = (sH - START_HOUR) * rowH;
    const hgt = Math.max((eH - sH) * rowH, rowH * 0.3);

    const x1 = dayIndex * (W / cols);

    // Use the calendar’s own color if available, else fallback
    const fillColor = ev.calendar?.color || new Color('#95A5A6');
    ctx.setFillColor(fillColor);

    // Draw event rectangle
    const rect = new Rect(x1 + 1, y1 + 1, W / cols - 2, hgt - 2);
    ctx.fillRect(rect);

    // Draw title inset by 4 pts
    const inset = 4;
    const txtR  = new Rect(
        rect.x + inset,
        rect.y + inset,
        rect.width - inset * 2,
        rect.height - inset * 2
    );
    ctx.setFont(Font.systemFont(10));
    ctx.setTextColor(new Color('#FFF'));
    ctx.drawTextInRect(ev.title || '', txtR);
  }

  // ── 7) Present the widget
  console.log("🔍 Presenting widget");
  const widget             = new ListWidget();
  widget.backgroundImage   = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
