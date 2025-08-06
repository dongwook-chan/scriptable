// ver 0.0.2
// Variables used by Scriptable.
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline_WithMarginAndNoColumnGap.js
// Scriptable Large widget: weekly 9–23 timeline, per-calendar colors,
// 2px margin for rounded corners, no gap between day columns.

;(async () => {
  console.log("🏁 Script start");

  // ── 1) Define drawing margins and time window
  const M          = 2;   // 2-pixel margin all around
  const START_HOUR = 9;   // timeline starts at 09:00
  const END_HOUR   = 23;  // timeline ends at 23:00

  // Compute this week's Monday at midnight (for dayIndex)
  const now       = new Date();
  const diffToMon = (now.getDay() + 6) % 7;
  const monMid    = new Date(now);
  monMid.setDate(now.getDate() - diffToMon);
  monMid.setHours(0, 0, 0, 0);

  // Also compute the drawing window (9:00 Monday → 23:00 next Monday)
  const weekStart = new Date(monMid);
  weekStart.setHours(START_HOUR, 0, 0, 0);
  const weekEnd   = new Date(monMid);
  weekEnd.setDate(monMid.getDate() + 7);
  weekEnd.setHours(END_HOUR, 0, 0, 0);

  console.log("📆 Drawing window:", weekStart.toISOString(), "→", weekEnd.toISOString());

  // ── 2) Fetch events from “Distraction” calendar over the past 7 weeks
  const today     = new Date();
  const dow       = today.getDay();              // 0=Sun…6=Sat
  const offsetMon = (dow + 6) % 7;
  const monThisWk = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offsetMon
  );
  const startDate = new Date(monThisWk);
  startDate.setDate(startDate.getDate() - 49);   // 7 weeks back

  const allCals     = await Calendar.forEvents();
  const distraction = allCals.find(c => c.title === "Distraction");
  let disEvents     = distraction
      ? await CalendarEvent.between(startDate, today, [distraction])
      : [];

  // Inject dummy event on Tuesday 10–12 for visual check
  disEvents.push({
    calendar:  { title: 'Distraction', color: distraction?.color },
    title:     '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1 * 86400000 + 1 * 3600000),
    endDate:   new Date(weekStart.getTime() + 1 * 86400000 + 3 * 3600000)
  });
  console.log("🧪 Events to draw:", disEvents.length);

  // ── 3) Prepare drawing context
  const W        = 364;
  const H        = 364;
  const contentW = W - 2 * M; // 360
  const contentH = H - 2 * M; // 360
  const hours    = END_HOUR - START_HOUR; // 14
  const rows     = hours;
  const cols     = 7;
  const rowH     = contentH / rows;
  const colW     = contentW / cols;

  const ctx = new DrawContext();
  ctx.size               = new Size(W, H);
  ctx.opaque             = true;
  ctx.respectScreenScale = true;

  // Fill entire background (behind the 2px margin)
  ctx.setFillColor(new Color('#000'));
  ctx.fillRect(new Rect(0, 0, W, H));

  // ── 4) Draw horizontal grid lines (one per hour)
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    const y = M + i * rowH + 0.5;
    ctx.fillRect(new Rect(M, y, contentW, 1));
  }

  // ── 5) Draw each event, clamped to 9–23, with no horizontal gap
  console.log("✏️ Drawing events");
  for (const ev of disEvents) {
    const s = ev.startDate;
    const e = ev.endDate;

    // Determine which day 0…6 it falls on (using monMid)
    const dayIndex = Math.floor((s - monMid) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) continue;

    // Compute that day's clamp bounds at 09:00 and 23:00
    const dayBase = new Date(monMid.getTime() + dayIndex * 86400000);
    const clampS  = new Date(dayBase); clampS.setHours(START_HOUR, 0, 0, 0);
    const clampE  = new Date(dayBase); clampE.setHours(END_HOUR,   0, 0, 0);

    // Clamp event times into our window
    const start = new Date(Math.max(s, clampS));
    const end   = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    // Convert to y-position + height
    const sH  = start.getHours() + start.getMinutes() / 60;
    const eH  = end.getHours()   + end.getMinutes()   / 60;
    const y1  = M + (sH - START_HOUR) * rowH;
    const hgt = Math.max((eH - sH) * rowH, rowH * 0.3);

    // x-position spans exactly one day's width, flush to neighbors
    const x1 = M + dayIndex * colW;

    // Use the calendar’s actual color if available, else gray
    const fillColor = ev.calendar?.color || new Color('#95A5A6');
    ctx.setFillColor(fillColor);

    // Draw the event block
    const rect = new Rect(x1, y1, colW, hgt);
    ctx.fillRect(rect);

    // Draw the title inset by 4px
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

  // ── 6) Present the widget
  console.log("🔍 Presenting widget");
  const widget           = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
