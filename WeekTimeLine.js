// ver 0.0.8
// Variables used by Scriptable.
// icon-color: light-brown; icon-glyph: magic;
// DistractionWeeklyTimeline_WithMarginAndNoColumnGap.js
// Scriptable Large widget: weekly 9–23 timeline, per-calendar colors,
// 2 px safe-margin, 6 px inset, no gap between day columns,
// events through Sunday 23:00, pixel-snapped grid & rectangles.

;(async () => {
  console.log("🏁 Script start");

  // ── 1) Settings & week window ───────────────────────────────────────────────
  const M          = 2;     // 2 px outer margin
  const INSET      = 6;     // 6 px inner inset for rounded corners
  const START_HOUR = 9;     // timeline from 09:00
  const END_HOUR   = 23;    // to 23:00

  // Compute this week’s Monday @00:00
  const now       = new Date();
  const diffToMon = (now.getDay() + 6) % 7;
  const monMid    = new Date(now);
  monMid.setDate(now.getDate() - diffToMon);
  monMid.setHours(0, 0, 0, 0);

  // Window: Mon 09:00 → next Mon 23:00
  const weekStart = new Date(monMid);
  weekStart.setHours(START_HOUR, 0, 0, 0);
  const weekEnd   = new Date(monMid);
  weekEnd.setDate(monMid.getDate() + 7);
  weekEnd.setHours(END_HOUR, 0, 0, 0);

  console.log(`📆 Window: ${weekStart.toISOString()} → ${weekEnd.toISOString()}`);

  // ── 2) Fetch Distraction events (7 weeks back → Sunday 23:00) ──────────────
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

  // Inject dummy Tuesday 10–12 for visual check
  disEvents.push({
    calendar:  { title: 'Distraction', color: distraction?.color },
    title:     '🔷 Dummy',
    startDate: new Date(weekStart.getTime() + 1*86400000 + 1*3600000),
    endDate:   new Date(weekStart.getTime() + 1*86400000 + 3*3600000)
  });
  console.log(`🧪 + dummy → ${disEvents.length}`);

  // ── 3) Layout math & DrawContext ────────────────────────────────────────────
  const W         = 364, H = 364;
  const contentW  = W - 2*(M + INSET);  // inner width
  const contentH  = H - 2*(M + INSET);  // inner height
  const hours     = END_HOUR - START_HOUR; // 14 rows
  const rows      = hours, cols = 7;
  const rowHraw   = contentH / rows;      // may be fractional
  const colW      = contentW / cols;

  console.log(`Layout → contentW:${contentW}, contentH:${contentH}, rowHraw:${rowHraw.toFixed(3)}, colW:${colW.toFixed(3)}`);

  const ctx = new DrawContext();
  ctx.size               = new Size(W, H);
  ctx.opaque             = true;
  ctx.respectScreenScale = true;

  // Fill background (behind rounded corners)
  ctx.setFillColor(new Color('#000'));
  ctx.fillRect(new Rect(0, 0, W, H));

  // ── 4) Draw pixel‐snapped horizontal grid lines ─────────────────────────────
  ctx.setFillColor(new Color('#555'));
  for (let i = 0; i <= rows; i++) {
    // compute raw position, then round to nearest whole pixel
    const yRaw = M + INSET + i * rowHraw;
    const y    = Math.round(yRaw);
    ctx.fillRect(new Rect(M + INSET, y, contentW, 1));
  }

  // ── 5) Draw events as pixel-snapped rectangles ─────────────────────────────
  console.log("✏️ Drawing events");
  for (const ev of disEvents) {
    const s = ev.startDate, e = ev.endDate;
    const di = Math.floor((s - monMid) / 86400000);
    if (di < 0 || di > 6) continue;

    // clamp to 09:00–23:00
    const dayBase = new Date(monMid.getTime() + di * 86400000);
    const clampS  = new Date(dayBase); clampS.setHours(START_HOUR,0,0,0);
    const clampE  = new Date(dayBase); clampE.setHours(END_HOUR,  0,0,0);
    const start   = new Date(Math.max(s, clampS));
    const end     = new Date(Math.min(e, clampE));
    if (end <= start) continue;

    // compute raw y & height
    const sH    = start.getHours() + start.getMinutes()/60;
    const eH    = end.getHours()   + end.getMinutes()/60;
    const yRaw  = M + INSET + (sH - START_HOUR) * rowHraw;
    const hRaw  = (eH - sH) * rowHraw;
    // enforce minimum display height
    const minH  = rowHraw * 0.3;
    const hClamped = Math.max(hRaw, minH);

    // pixel-snap y and height
    let yPix = Math.round(yRaw);
    let hPix = Math.round(hClamped);

    // clamp to bottom
    const bottom = M + INSET + contentH;
    if (yPix + hPix > bottom) {
      hPix = bottom - yPix;
    }

    // compute x & width (no rounding needed horizontally)
    const xRaw = M + INSET + di * colW;
    const xPix = Math.round(xRaw);
    const wPix = Math.round(Math.min(colW, M + INSET + contentW - xRaw));

    // draw rectangle
    ctx.setFillColor(ev.calendar?.color || new Color('#95A5A6'));
    ctx.fillRect(new Rect(xPix, yPix, wPix, hPix));

    // draw title inset by 4 px
    const ti = 4;
    ctx.setFont(Font.systemFont(10));
    ctx.setTextColor(new Color('#FFF'));
    ctx.drawTextInRect(
        ev.title || '',
        new Rect(xPix + ti, yPix + ti, wPix - ti*2, hPix - ti*2)
    );
  }

  // ── 6) Present widget ───────────────────────────────────────────────────────
  console.log("🔍 Presenting widget");
  const widget           = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  await widget.presentLarge();
  Script.complete();
})();
