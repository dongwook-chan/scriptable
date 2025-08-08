// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-brown; icon-glyph: magic;
// Scriptable widget: two variants via Widget Parameter
// Add this widget twice on the Home Screen.
// Set the widget parameter to "oct" for the first, "cal" for the second.
// Tapping each widget opens its assigned URL directly (no Scriptable in between).

// ---- config your two targets here ----
const TARGETS = {
  oct: {
    title: "Run OCT",
    subtitle: "Scriptable",
    url: "scriptable:///run/oct",
    sfSymbol: "play.circle"
  },
  cal: {
    title: "Calendar",
    subtitle: "Open",
    url: "showcal://",
    sfSymbol: "calendar"
  }
};
// -------------------------------------

// Resolve which variant to show based on the widget parameter
const paramRaw = (args.widgetParameter || "oct").trim().toLowerCase();
const key = ["oct","cal"].includes(paramRaw) ? paramRaw : "oct";
const target = TARGETS[key];

// Build widget UI
let w = new ListWidget();
w.setPadding(10, 10, 10, 10);
w.url = target.url; // <-- crucial: tap opens this URL directly

// Optional: a subtle background
let grad = new LinearGradient();
grad.colors = [new Color("#1f2937"), new Color("#111827")]; // dark gray gradient
grad.locations = [0, 1];
w.backgroundGradient = grad;

// Content stack
const col = w.addStack();
col.layoutVertically();

// Icon
const icon = SFSymbol.named(target.sfSymbol);
const img = icon.image;
let iconView = col.addImage(img);
iconView.imageSize = new Size(22, 22);
iconView.centerAlignImage();

// Title
let title = col.addText(target.title);
title.font = Font.boldSystemFont(14);
title.textColor = Color.white();
title.centerAlignText();

// Subtitle
let sub = col.addText(target.subtitle);
sub.font = Font.systemFont(10);
sub.textColor = Color.gray();
sub.centerAlignText();

col.addSpacer();

// Tiny footer showing which variant this is
let foot = col.addText(key.toUpperCase());
foot.font = Font.systemFont(8);
foot.textColor = new Color("#9ca3af"); // gray
foot.centerAlignText();

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  // Preview in-app
  await w.presentSmall();
}
Script.complete();