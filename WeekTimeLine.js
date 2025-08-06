// ver 0.0.8
// Variables used by Scriptable.
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline_WithMarginAndNoColumnGap.js
// Scriptable Large widget: weekly 9–23 timeline, per-calendar colors,
// 2 px safe-margin, 6 px inset for rounded-corner clearance,
// no gap between day columns, events through Sunday 23:00,
// aligned grid & events exactly to eliminate 1 px gaps.

;(async () => {
  console.log("🏁 Script start");

  // ── 1) Settings & time window ───────────────────────────────────────────────
  const M          = 2;   // 2 px widget margin
  const INSET      = 6;   // 6 px inset inside margin
  const START_HOUR = 9;   // timeline begins at 09:00
  const END_HOUR   = 23;  // timeline ends   at 23:00

  // Compute Monday @00:00 baseline
  const now       = new Date();
  const diffToMon = (now.getDay() + 6) % 7;
  const monMid    = new Date(now);
  monMid.setDate(now.getDate() - diffToMon);
  monMid.setHours(0, 0, 0, 0);

  // Window: Mon 09:00 → next Mon 23:00
  const weekStart = new Date(monMid);
  weekStart.setHours(START_HOUR, 0, 0, 0);
  const weekEnd   = new Date(monMid);
  weekEnd.setDate(monMid.getDate() + 7);
  weekEnd.setHours(END_HOUR, 0, 0, 0);

  console.log(`📆 Window: ${weekStart.toISOString()} → ${weekEnd.toISOString()}`);

  // ── 2) Fetch Distraction events back 7 weeks through Sunday 23:00 ──────────
  const today     = new Date();
  const dow       = today.getDay();
  const offsetMon = (dow + 6) % 7;
  const monThisWk = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetMon);
  const startDate = new Date(monThisWk);
  startDate.setDate(startDate.getDate() - 49);

  const allCals     = await Calendar.forEvents();
  const distraction = allCals.find(c => c.title === "Distraction");
  let disEvents     = distraction
      ? await CalendarEvent.between(startDate, weekEnd, [distraction])
      : [];
  console.log(`🧪 Fetched events: ${disEvents.length}`);

  // Dummy Tuesday 10–12 for visual check
  disEvents.push({
    calendar: { title: 'Distraction', color: distraction?.color },
    title:    '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1 * 86400000 + 1 * 3600000),
    endDate:   new Date(weekStart.getTime() + 1 * 86400000 + 3 * 3600000)
  });
  console.log(`🧪 + dummy → ${disEvents.length}`);

  // ── 3) Layout math & DrawContext ────────────────────────────────────────────
  const W         = 364, H = 364;
  const contentW  = W - 2 * (M + INSET); // left+right
  const contentH  = H - 2 * (M + INSET); // top+bottom
  const hours     = END_HOUR - START_HOUR; // 14 rows
  const rows      = hours, cols = 7;
  const rowH      = contentH / rows;
  const colW      = contentW / cols;

  const ctx = new DrawContext();
  ctx.size               = new Size(W, H);
  ctx.opaque             = true;
  ctx.respectScreenScale = true;

  // Fill background behind rounded corners
  ctx.setFillColor(new Color('#000'));
  ctx.fillRect(new Rect(0, 0, W, H));

  // ── 4) Draw horizontal grid lines exactly on each hour line ────────────────
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    // No +0.5 so grid lines align on whole‐pixel boundaries
    const y = M + INSET + i * rowH;
    ctx.fillRect(new Rect(M + INSET, y, contentW, 1));
  }

  // ── 5) Draw each event, clamped 09:00–23:00, inset by INSET ───────────────
  console.log("✏️ Drawing events");
  for (const ev of disEvents) {
    const s = ev.startDate, e = ev.endDate;
    const dayIndex = Math.floor((s - monMid) / 86400000);
    if (dayIndex < 0 || dayIndex > 6) continue;

    // Clamp to our 09:00–23:00 window
    const dayBase = new Date(monMid.getTime() + dayIndex * 86400000);
    const clampS  = new Date(dayBase); clampS.setHours(START_HOUR, 0, 0, 0);
    const clampE  = new Date(dayBase); clampE.setHours(END_HOUR,   0, 0, 0);
    const start   = new Date(Math.max(s, clampS));
    const end     = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    // Compute Y and height
    const sH = start.getHours() + start.getMinutes() / 60;
    const eH = end.getHours()   + end.getMinutes()   / 60;
    // No rounding needed—rowH * integer span will be exact on pixel boundaries
    const y1  = M + INSET + (sH - START_HOUR) * rowH;
    let   hgt = (eH - sH) * rowH;
    if (hgt < rowH * 0.3) hgt = rowH * 0.3;

    // Ensure bottom flush at 23:00
    const bottom = M + INSET + contentH;
    if (y1 + hgt > bottom) hgt = bottom - y1;

    const x1 = M + INSET + dayIndex * colW;

    // Draw event block
    ctx.setFillColor(ev.calendar?.color || new Color('#95A5A6'));
    ctx.fillRect(new Rect(x1, y1, colW, hgt));

    // Draw title inset by 4px
    const insetText = 4;
    const txtR = new Rect(
        x1 + insetText,
        y1 + insetText,
        colW - insetText * 2,
        hgt   - insetText * 2
    );
    ctx.setFont(Font.systemFont(10));
    ctx.setTextColor(new Color('#FFF'));
    ctx.drawTextInRect(ev.title || '', txtR);
  }

  // ── 6) Present the widget ──────────────────────────────────────────────────
  console.log("🔍 Presenting widget");
  const widget           = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
