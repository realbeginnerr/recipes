import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = "D:/recipes/.tmp/glossary_review_data.json";
const outputDir = "D:/recipes/outputs/glossary-review";
const outputPath = `${outputDir}/붕억빵_용어_중요도_검토.xlsx`;
const previewPath = `${outputDir}/붕억빵_용어_중요도_검토_preview.png`;

const payload = JSON.parse(await fs.readFile(inputPath, "utf8"));
const { summary, rows } = payload;
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("용어 목록");
sheet.showGridLines = false;
sheet.tabColor = "#255A46";

sheet.getRange("A2:H2").merge();
sheet.getRange("A2").values = [["붕억빵 용어·중요도 검토"]];
sheet.getRange("A2:H2").format = {
  font: { name: "Arial", size: 15, bold: true, color: "#122B22" },
  verticalAlignment: "center",
};
sheet.getRange("A3:H3").format.borders = {
  bottom: { style: "thin", color: "#255A46" },
};

sheet.getRange("A4:H4").merge();
sheet.getRange("A4").values = [[
  `총 ${summary.total}개 · 원본 중요도 ${summary.original}개 · 보완 중요도 ${summary.inferred}개`,
]];
sheet.getRange("A4:H4").format = {
  font: { name: "Arial", size: 10, bold: true, color: "#255A46" },
  fill: "#F6F5F1",
  verticalAlignment: "center",
};

sheet.getRange("A5:H5").merge();
sheet.getRange("A5").values = [[
  "중요도는 원본의 ‘실무에서의 언급량/기본상식’을 5점 만점으로 해석했습니다. 빈 항목은 실무 노출 빈도와 기본 개념성을 기준으로 보완했습니다.",
]];
sheet.getRange("A5:H5").format = {
  font: { name: "Arial", size: 10, italic: true, color: "#596B64" },
  verticalAlignment: "center",
  wrapText: true,
};

const headers = [["번호", "분야", "용어", "영문·약어", "뜻", "중요도", "점수", "산정"]];
sheet.getRange("A7:H7").values = headers;
const data = rows.map((row) => [
  row.number,
  row.categories,
  row.term,
  row.englishTerm,
  row.definition,
  row.importance,
  row.score,
  row.scoreSource,
]);
sheet.getRange(`A8:H${7 + data.length}`).values = data;

const used = sheet.getRange(`A7:H${7 + data.length}`);
used.format.font = { name: "Arial", size: 10, color: "#122B22" };
used.format.verticalAlignment = "center";
sheet.getRange(`B8:E${7 + data.length}`).format.wrapText = true;
sheet.getRange(`A8:A${7 + data.length}`).format.horizontalAlignment = "right";
sheet.getRange(`F8:H${7 + data.length}`).format.horizontalAlignment = "center";
sheet.getRange(`F8:F${7 + data.length}`).format.font = {
  name: "Arial",
  size: 11,
  bold: true,
  color: "#B7791F",
};
sheet.getRange(`G8:G${7 + data.length}`).format.numberFormat = "0";

sheet.getRange("A7:H7").format = {
  fill: "#255A46",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: {
    insideVertical: { style: "thin", color: "#FFFFFF" },
    bottom: { style: "thin", color: "#255A46" },
  },
};

sheet.getRange(`A8:H${7 + data.length}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#E5EAE9" },
  bottom: { style: "thin", color: "#CBD4D2" },
};
sheet.getRange(`H8:H${7 + data.length}`).conditionalFormats.add("containsText", {
  text: "보완",
  format: { fill: "#FFF4D6", font: { color: "#7A4B00", bold: true } },
});

sheet.getRange(`A1:A${7 + data.length}`).format.columnWidth = 7;
sheet.getRange(`B1:B${7 + data.length}`).format.columnWidth = 22;
sheet.getRange(`C1:C${7 + data.length}`).format.columnWidth = 25;
sheet.getRange(`D1:D${7 + data.length}`).format.columnWidth = 31;
sheet.getRange(`E1:E${7 + data.length}`).format.columnWidth = 74;
sheet.getRange(`F1:F${7 + data.length}`).format.columnWidth = 15;
sheet.getRange(`G1:G${7 + data.length}`).format.columnWidth = 8;
sheet.getRange(`H1:H${7 + data.length}`).format.columnWidth = 10;
sheet.getRange("A2:H2").format.rowHeight = 25;
sheet.getRange("A4:H4").format.rowHeight = 23;
sheet.getRange("A5:H5").format.rowHeight = 34;
sheet.getRange("A7:H7").format.rowHeight = 25;
sheet.getRange(`A8:H${7 + data.length}`).format.autofitRows();

const table = sheet.tables.add(`A7:H${7 + data.length}`, true, "GlossaryReviewTable");
table.style = "TableStyleMedium4";
table.showBandedColumns = false;
table.showFilterButton = true;

sheet.freezePanes.freezeRows(7);
sheet.freezePanes.freezeColumns(3);

workbook.recalculate();
const topInspect = await workbook.inspect({
  kind: "table",
  range: "용어 목록!A1:H15",
  include: "values,formulas",
  tableMaxRows: 15,
  tableMaxCols: 8,
  maxChars: 10000,
});
console.log(topInspect.ndjson);
const bottomInspect = await workbook.inspect({
  kind: "table",
  range: `용어 목록!A240:H${7 + data.length}`,
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 8,
  maxChars: 8000,
});
console.log(bottomInspect.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({
  sheetName: "용어 목록",
  range: "A1:H18",
  scale: 1.2,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, previewPath, summary }, null, 2));
