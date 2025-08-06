// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: magic;
// QuarterWidgetSmall.js

// 1. 위젯 생성
let w = new ListWidget()
w.setPadding(0, 0, 0, 0)
w.backgroundColor = Color.dynamic(new Color("#ffffff"), new Color("#000000"))

// 2. 2×2 그리드용 스택
let row1 = w.addStack()
row1.layoutHorizontally()
row1.setPadding(0, 0, 0, 0)

let row2 = w.addStack()
row2.layoutHorizontally()
row2.setPadding(0, 0, 0, 0)

// 3. 셀 생성 헬퍼
function makeCell(parent, emoji, title, urlScheme) {
  let cell = parent.addStack()
  cell.layoutVertically()
  cell.centerAlignContent()
  // small 위젯(약 155×155pt) 기준 사분면 대략 절반 크기
  cell.size = new Size(77, 77)
  cell.addSpacer()
  let icon = cell.addText(emoji)
  icon.font = Font.systemFont(20)
  icon.centerAlignText()
  let label = cell.addText(title)
  label.font = Font.systemFont(10)
  label.centerAlignText()
  cell.addSpacer()
  // element-level URL (small에선 무시될 수 있습니다)
  cell.url = urlScheme
}

// 4. 네 개의 분할에 iOS 기본 앱 URL 스킴 지정
makeCell(row1, "🕒", "Clock",    "clock-alarm://")
makeCell(row1, "🗓", "Calendar", "calshow://")
makeCell(row2, "🗺️", "Maps",     "maps://")
makeCell(row2, "⚙️", "Settings","App-Prefs://")

// 5. 위젯 등록
Script.setWidget(w)
Script.complete()
