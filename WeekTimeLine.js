// ver 0.0.7
// Variables used by Scriptable.
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline_WithMarginAndNoColumnGap.js
// Scriptable Large widget: weekly 9–23 timeline, per-calendar colors,
// 2 px safe-margin, 5 px inset for rounded-corner clearance,
// no gap between day columns, events through today, clipped flush at 23:00 and Sunday.

;(async () => {
  console.log("🏁 Script start");

  // ── 1) Settings and time window ────────────────────────────────────────────
  const M          = 2;   // 2 px widget margin
  const INSET      = 6;   // 5 px inset inside margin
  const START_HOUR = 9;   // timeline begins at 09:00
  const END_HOUR   = 23;  // timeline ends at 23:00

  // Compute this week’s Monday @00:00
  const now       = new Date();
  const diffToMon = (now.getDay() + 6) % 7;
  const monMid    = new Date(now);
  monMid.setDate(now.getDate() - diffToMon);
  monMid.setHours(0, 0, 0, 0);

  // Drawing window: Monday 09:00 → next Monday 23:00
  const weekStart = new Date(monMid);
  weekStart.setHours(START_HOUR, 0, 0, 0);
  const weekEnd   = new Date(monMid);
  weekEnd.setDate(monMid.getDate() + 7);
  weekEnd.setHours(END_HOUR, 0, 0, 0);

  console.log(`📆 Window: ${weekStart.toISOString()} → ${weekEnd.toISOString()}`);

  // ── 2) Fetch events from Distraction calendar (7 weeks back → Sunday 23:00) ─
  const today     = new Date();
  const dow       = today.getDay();              // 0=Sun…6=Sat
  const offsetMon = (dow + 6) % 7;
  const monThisWk = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetMon);
  const startDate = new Date(monThisWk);
  startDate.setDate(startDate.getDate() - 49);   // 7 weeks back

  const allCals     = await Calendar.forEvents();
  const distraction = allCals.find(c => c.title === "Distraction");
  let disEvents     = distraction
      ? await CalendarEvent.between(startDate, weekEnd, [distraction])
      : [];
  console.log(`🧪 Events fetched: ${disEvents.length}`);

  // Inject dummy for visual check (Tuesday 10–12)
  disEvents.push({
    calendar: { title: 'Distraction', color: distraction?.color },
    title:    '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1 * 86400000 + 1 * 3600000),
    endDate:   new Date(weekStart.getTime() + 1 * 86400000 + 3 * 3600000)
  });
  console.log(`🧪 + dummy → ${disEvents.length}`);

  // ── 3) Prepare DrawContext & layout math ──────────────────────────────────
  const W         = 364;
  const H         = 364;
  // inset on both sides: 2px margin + 5px inset => total 7px on left & right
  const contentW  = W - 2 * (M + INSET); // 364 - 14 = 350
  const contentH  = H - 2 * (M + INSET); // 364 - 14 = 350
  const hours     = END_HOUR - START_HOUR; // 14
  const rows      = hours;
  const cols      = 7;
  const rowH      = contentH / rows;      // 25 px
  const colW      = contentW / cols;      // 50 px

  const ctx = new DrawContext();
  ctx.size               = new Size(W, H);
  ctx.opaque             = true;
  ctx.respectScreenScale = true;

  // Fill black background behind margins
  ctx.setFillColor(new Color('#000'));
  ctx.fillRect(new Rect(0, 0, W, H));

  // ── 4) Draw horizontal grid lines (one per hour), inset by M+INSET ────────
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    const y = M + INSET + i * rowH + 0.5;
    ctx.fillRect(new Rect(M + INSET, y, contentW, 1));
  }

  // ── 5) Draw each event rectangle, clamped to 09:00–23:00, grouped by instance ─
  console.log("✏️ Drawing events");
  for (const ev of disEvents) {
    const s = ev.startDate;
    const e = ev.endDate;

    // dayIndex from Monday midnight
    const dayIndex = Math.floor((s - monMid) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) continue;

    // Build that day's clamp window
    const dayBase = new Date(monMid.getTime() + dayIndex * 86400000);
    const clampS  = new Date(dayBase); clampS.setHours(START_HOUR, 0, 0, 0);
    const clampE  = new Date(dayBase); clampE.setHours(END_HOUR,   0, 0, 0);

    // Clamp start/end
    const start = new Date(Math.max(s, clampS));
    const end   = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    // Compute positions
    const sH  = start.getHours() + start.getMinutes() / 60;
    const eH  = end.getHours()   + end.getMinutes()   / 60;
    const y1  = M + INSET + (sH - START_HOUR) * rowH;
    let   hgt = (eH - sH) * rowH;
    if (hgt < rowH * 0.3) hgt = rowH * 0.3;

    const x1  = M + INSET + dayIndex * colW;

    // Ensure bottom flush and right flush
    const bottomLimit = M + INSET + contentH;
    if (y1 + hgt > bottomLimit) {
      hgt = bottomLimit - y1;
    }

    const rightLimit = M + INSET + contentW;
    let width = colW;
    if (x1 + width > rightLimit) {
      width = rightLimit - x1;
    }

    // Draw the event block
    const fillColor = ev.calendar?.color || new Color('#95A5A6');
    ctx.setFillColor(fillColor);
    ctx.fillRect(new Rect(x1, y1, width, hgt));

    // Draw title inset by 4px
    const insetText = 4;
    const txtR = new Rect(
        x1 + insetText,
        y1 + insetText,
        width        - insetText * 2,
        hgt          - insetText * 2
    );
    ctx.setFont(Font.systemFont(10));
    ctx.setTextColor(new Color('#FFF'));
    ctx.drawTextInRect(ev.title || '', txtR);
  }

  // ── 6) Present widget ───────────────────────────────────────────────────────
  console.log("🔍 Presenting widget");
  const widget           = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
