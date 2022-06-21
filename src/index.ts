import { createWriteStream, mkdirSync, existsSync } from "node:fs";
import { chromium } from "playwright";
import * as csv from "fast-csv";
import { marketplaceItems } from "./marketplaceItems";
import { today } from "./utils";

const output = __dirname + `/../data/${today()}`;

const csvStream = csv.format({ headers: true });

if (!existsSync(output)) {
  mkdirSync(output, { recursive: true });
}

const writeStream = createWriteStream(`${output}/widgets.csv`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const mpItem of marketplaceItems) {
    console.log("Marketplace URL 💻", mpItem);
    const page = await browser.newPage();
    await page.goto(mpItem);
    const versionNumber = await page
      .locator("p", { hasText: "Version" })
      .first()
      .innerText();
    const publicationDate = await page
      .locator("p", { hasText: "Date:" })
      .first()
      .innerText();
    const downloads = await page
      .locator(".pds-u-icon-download-bottom-before")
      .first()
      .innerText();
    const name = await page.locator("h1").first().innerText();

    const vote = await page.locator(".mx-name-container_reviewContent");
    let lastVote = "";

    if (await vote.count()) {
      lastVote = await vote.first().innerText();
    }

    await page.screenshot({ path: `${output}/${name}-${today()}.png` });

    const widget = {
      name,
      versionNumber,
      publicationDate,
      downloads,
      lastVote,
    };
    csvStream.write(widget);
    await page.close();
  }

  await browser.close();
  csvStream.pipe(writeStream);
  csvStream.end();
})();
