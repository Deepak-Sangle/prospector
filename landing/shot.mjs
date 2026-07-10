import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = "shots";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

async function shoot(name, width, height, full) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  // force reveals visible for full-page capture
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => el.setAttribute("data-shown", "true"));
    document.querySelectorAll(".hero-anim").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.animation = "none";
    });
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: full });
  await page.close();
}

await shoot("desktop-full", 1440, 900, true);
await shoot("desktop-hero", 1440, 900, false);
await shoot("mobile-full", 390, 844, true);

await browser.close();
console.log("done");
