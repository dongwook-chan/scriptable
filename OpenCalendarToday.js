// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: calendar-alt;
// Open Calendar to Today’s View (Scriptable)

let now      = new Date();
let refDate  = new Date("2001-01-01T00:00:00Z");           // Apple’s reference epoch
let seconds  = (now.getTime() - refDate.getTime()) / 1000; // seconds since Jan 1 2001 UTC
let url      = `calshow:${seconds}`;                       // Calendar URL scheme

// Launch Calendar
Safari.open(url);