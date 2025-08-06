// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;
// QuarterWidget.js

// 1. 위젯 생성
let w = new ListWidget()

// 2. Medium 외엔 안내 메시지 후 종료
if (config.widgetFamily !== "medium") {
  w.backgroundColor = new Color("#ffecb3")
  let t = w.addText("▶ Medium 크기로 추가해 주세요")
  t.centerAlignText()
  t.font = Font.systemFont(14)
  Script.setWidget(w)
  Script.complete()
}

// 3. Medium 레이아웃 설정
w.setPadding(0, 0, 0, 0)
w.backgroundColor = Color.dynamic(new Color("#ffffff"), new Color("#000000"))

// 4. 2×2 그리드 만들기
let row1 = w.addStack()
row1.layoutHorizontally()
row1.setPadding(0, 0, 0, 0)

let row2 = w.addStack()
row2.layoutHorizontally()
row2.setPadding(0, 0, 0, 0)

// 5. 셀 생성 헬퍼
function makeCell(parent, emoji, title, urlScheme) {
  let cell = parent.addStack()
  cell.layoutVertically()
  cell.centerAlignContent()
  cell.size = new Size(0, 0)  // flex
  cell.addSpacer()
  let icon = cell.addText(emoji)
  icon.font = Font.systemFont(24)
  icon.centerAlignText()
  let label = cell.addText(title)
  label.font = Font.systemFont(12)
  label.centerAlignText()
  cell.addSpacer()
  cell.url = urlScheme     // **요기** element-level URL!
}

// 6. 네 개의 분할에 각기 다른 URL 지정
makeCell(row1, "🕒", "Clock",    "clock-alarm://")
makeCell(row1, "🗓", "Calendar", "calshow://")
makeCell(row2, "🗺️", "Maps",     "maps://")
makeCell(row2, "⚙️", "Settings","App-Prefs://")

// 7. 위젯 등록
Script.setWidget(w)
Script.complete()
