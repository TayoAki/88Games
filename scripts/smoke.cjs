// Run after export:web and serving dist on port 8081. Uses installed Chromium when available.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.SMOKE_URL || "http://127.0.0.1:8081");
    await page.getByRole("button", { name: "Take a seat" }).click();
    await page.getByRole("button", { name: "Bid 3 tricks" }).click();
    await page.getByRole("switch").click();
    // Play all thirteen human turns; bots and trick collection use the real UI timer.
    for (let trick = 0; trick < 13; trick++) {
      await page
        .getByText("Your turn. Choose a highlighted card.", { exact: true })
        .waitFor();
      await page
        .locator(
          '[role="button"][aria-label*=" of "]:not([aria-disabled="true"])',
        )
        .first()
        .click();
    }
    await page.getByRole("button", { name: "Deal next round" }).waitFor();
    await page.screenshot({
      path: "artifacts/round-result.png",
      fullPage: true,
    });
    const saved = await page.evaluate(() =>
      localStorage.getItem("88games.spades.v1"),
    );
    assert.equal(JSON.parse(saved).completed, 13);
    await page.reload();
    await page.getByRole("button", { name: "Continue your match" }).click();
    await page.getByRole("button", { name: "Deal next round" }).click();
    await page.getByText("SPADES / ROUND 2", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Game library" }).click();
    await page.getByText("Start a new match", { exact: true }).click();
    await page.getByRole("button", { name: "Keep current match" }).click();
    await page.getByRole("button", { name: "Continue your match" }).click();
    await page.getByText("SPADES / ROUND 2", { exact: true }).waitFor();
    // Save at an active turn, reload and confirm exact hand and round are retained.
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("88games.spades.v1")),
    );
    await page.reload();
    await page.getByRole("button", { name: "Continue your match" }).click();
    const after = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("88games.spades.v1")),
    );
    assert.equal(after.round, before.round);
    assert.deepEqual(after.hands, before.hands);
    await page
      .getByRole("button", { name: "How to play", exact: true })
      .click();
    await page.getByText("05 / Reach 500", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Got it." }).click();
    assert.deepEqual(errors, []);
    // Narrow screen, corrupt-save recovery, no overflow and a clean new game.
    await page.evaluate(() =>
      localStorage.setItem("88games.spades.v1", '{"version":1}'),
    );
    await page.setViewportSize({ width: 320, height: 700 });
    await page.reload();
    await page
      .getByText("Your saved game could not be restored.", { exact: false })
      .waitFor();
    await page.getByRole("button", { name: "Take a seat" }).click();
    await page.getByRole("button", { name: "Bid 3 tricks" }).waitFor();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= 320),
    );
    console.log(
      "PASS: full 13-trick round, scoring, next deal, resume, cancel reset, rules, corrupt-save recovery and 320px layout; no browser exceptions.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
