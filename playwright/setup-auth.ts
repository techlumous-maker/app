import { createInterface } from "node:readline/promises"

import { chromium } from "playwright"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const email = process.env.PLAYWRIGHT_EMAIL
const storageStatePath = "playwright/.auth/user.json"

if (!email) {
  throw new Error("Set PLAYWRIGHT_EMAIL before running the auth setup.")
}

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()

try {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel("Email").fill(email)
  await page.getByRole("button", { name: "Continue with Email" }).click()

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const magicLink = await readline.question(
    "Paste the magic link from your email and press Enter: "
  )
  readline.close()

  if (!magicLink.startsWith("http")) {
    throw new Error("The magic link must be an absolute http(s) URL.")
  }

  await page.goto(magicLink)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 120_000,
  })
  await context.storageState({ path: storageStatePath })

  console.log(`Saved authenticated state to ${storageStatePath}`)
} finally {
  await browser.close()
}
