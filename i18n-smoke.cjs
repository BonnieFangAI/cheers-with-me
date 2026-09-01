const { chromium } = require("/home/esben/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core");
const fs = require("node:fs");

global.window = {};
require("./i18n.js");
const translationData = global.window.CheersI18n.translations;
delete global.window;

const baseUrl = "http://127.0.0.1:8791/?skipIntro=1";

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  if (dimensions.scrollWidth > dimensions.width) throw new Error(`${label}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.width}`);
}

(async () => {
  const source = `${fs.readFileSync("index.html", "utf8")}\n${fs.readFileSync("app.js", "utf8")}`;
  const keys = new Set([
    ...Array.from(source.matchAll(/data-i18n(?:-html|-aria|-alt|-content)?="([^"]+)"/g), (match) => match[1]),
    ...Array.from(source.matchAll(/\bt\("([^"]+)"/g), (match) => match[1])
  ]);
  for (const [language, messages] of Object.entries(translationData)) {
    const missing = [...keys].filter((key) => !(key in messages));
    if (missing.length) throw new Error(`${language} is missing translations: ${missing.join(", ")}`);
  }

  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "zh-CN" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  await page.locator("#languageButton").click();
  await page.locator('[data-language="en"]').click();
  if (await page.locator("html").getAttribute("lang") !== "en") throw new Error("English language did not apply");
  if ((await page.locator("#languageTitle").textContent()).trim() !== "Choose language") throw new Error("English language sheet copy is wrong");
  await assertNoOverflow(page, "English language sheet");

  await page.locator('[data-close-sheet]').last().click();
  await page.locator("#cheersButton").click();
  if ((await page.locator("#checkinTitle").textContent()).trim() !== "What are you having?") throw new Error("English check-in copy is wrong");
  await assertNoOverflow(page, "English check-in sheet");
  await page.locator('#checkinSheet [data-close-sheet]').click();

  await page.locator("#languageButton").click();
  await page.locator('[data-language="sv"]').click();
  if (await page.locator("html").getAttribute("lang") !== "sv") throw new Error("Swedish language did not apply");
  if ((await page.locator("#languageTitle").textContent()).trim() !== "Välj språk") throw new Error("Swedish language sheet copy is wrong");
  await assertNoOverflow(page, "Swedish language sheet");
  await page.reload({ waitUntil: "networkidle" });
  if (await page.locator("html").getAttribute("lang") !== "sv") throw new Error("Saved Swedish preference did not persist");
  await page.locator("#cheersButton").click();
  if ((await page.locator("#checkinTitle").textContent()).trim() !== "Vad dricker du just nu?") throw new Error("Swedish check-in copy is wrong");
  await assertNoOverflow(page, "Swedish check-in sheet");

  const autoContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "sv-SE" });
  const autoPage = await autoContext.newPage();
  autoPage.on("pageerror", (error) => errors.push(error.message));
  await autoPage.goto(baseUrl, { waitUntil: "networkidle" });
  if (await autoPage.locator("html").getAttribute("lang") !== "sv") throw new Error("Device-language detection did not select Swedish");
  await assertNoOverflow(autoPage, "Automatic Swedish home");

  if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
  console.log("i18n smoke test passed: zh-CN auto, English, Swedish, persistence, and 390x844 overflow checks");
  await browser.close();
})().catch(async (error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
