import { readFile, writeFile } from "node:fs/promises";
import { mkdirSync, existsSync } from "node:fs";
import { chromium } from "playwright";
import * as xl from "excel4node";
import { today } from "./utils";

const wb = new xl.Workbook();

const ws = wb.addWorksheet("WIDGETS");

const style = wb.createStyle({
  font: {
    color: "black",
    size: 12,
  },
  numberFormat: "$#,##0.00; ($#,##0.00); -",
});

const jsonArray = [];

const output = __dirname + `/../data/${today()}`;
const excelPath = `${output}/widgets.xlsx`;
const jsonPath = `${output}/widgets.json`;

if (!existsSync(output)) {
  mkdirSync(output, { recursive: true });
}

const titles = [
  "name",
  "description",
  "versionNumber",
  "publicationDate",
  "downloads",
  "lastVote",
  "numberOfRatings",
  "mxVersion",
  "link",
];
(async () => {
  const linksToVisit = await readFile(`${__dirname}/../links.txt`, "utf8");
  const parsedLinks = linksToVisit.split("\n");
  let count = 1;
  for (const [i, title] of titles.entries()) {
    ws.cell(count, i + 1)
      .string(title)
      .style(style);
  }

  const browser = await chromium.launch({ headless: true });

  for (const mpItem of parsedLinks) {
    console.log("Marketplace URL 💻", mpItem);
    count++;
    const page = await browser.newPage();
    await page.goto(mpItem.trim());
    const sideBar = await page.locator(".pds-u-max-width-256");
    const versionNumber = await sideBar
      .locator("p", { hasText: "Version" })
      .first()
      .innerText();
    const publicationDate = await sideBar
      .locator("p", { hasText: "Date:" })
      .first()
      .innerText();
    const downloads = await page
      .locator(".pds-u-icon-download-bottom-before")
      .first()
      .innerText();
    const numberOfRatings = await page
      .locator(".col-lg-auto:has(p.pds-c-text-14)")
      .first()
      .innerText();
    const mxVersion = await sideBar
      .locator("p", { hasText: "Requires" })
      .first()
      .innerText();

    const name = await page.locator("h1").first().innerText();

    const vote = await page.locator(".mx-name-container_reviewContent");
    const description = await page
      .locator(".mx-name-cKEditorViewerForMendix1")
      .first()
      .innerText();

    let lastVote = "";

    if (await vote.count()) {
      lastVote = await vote.first().innerText();
    }
    await page.screenshot({ path: `${output}/${name}-${today()}.png` });
    const widget = {
      name,
      link: mpItem,
      versionNumber: versionNumber ?? "",
      publicationDate: publicationDate ?? "",
      downloads: downloads ?? "",
      lastVote: lastVote ?? "",
      numberOfRatings: numberOfRatings ?? "",
      mxVersion: mxVersion ?? "",
      description: description ?? "",
    };
    jsonArray.push(widget);

    for (const [i, title] of titles.entries()) {
      ws.cell(count, i + 1)
        .string(widget[title])
        .style(style);
    }
    await page.close();
  }

  await writeFile(jsonPath, JSON.stringify(jsonArray));
  await wb.write(excelPath);
  await browser.close();
})();
