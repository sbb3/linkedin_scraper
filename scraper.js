require("dotenv").config();
const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const UserAgent = require("user-agents");
const ora = require("ora");
const chalk = require("chalk");

const MAX_PAGES = 3;
const INPUT_FILE = path.join(__dirname, "input/query.csv");
const GOOGLE_DELAY_BETWEEN_REQUESTS = 20000; // in ms, 20 seconds
const LINKEDIN_DELAY_BETWEEN_REQUESTS = 5000; // in ms, 5 seconds

puppeteer.use(
  RecaptchaPlugin({
    provider: { id: "2captcha", token: process.env.CAPTCHA_API_KEY },
  })
);

puppeteer.use(StealthPlugin());

let browser;
let proxyIndex = 0;
const spinner = ora();

const BASE_URL = "https://www.google.com/search?q=";
const SELECTOR = ".yuRUbf a";
const GL = "us"; // ! country to search from
const HL = "en"; // ! language to search in

// This cooldow between requests
const delay = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));

// This function reads queries from a CSV file
async function readQueriesFromCSV(filePath) {
  let queries = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => row.query && queries.push(row.query))
      .on("end", () => resolve(queries))
      .on("error", reject);
  });
}

// Function to append data to a JSON file
function appendDataToFile(data, fileName) {
  let existingData = [];
  try {
    const fileContents = fs.readFileSync(fileName, { encoding: "utf8" });
    existingData = JSON.parse(fileContents);
  } catch (error) {}

  existingData.push(data);

  try {
    fs.writeFileSync(fileName, JSON.stringify(existingData, null, 2));
  } catch (error) {}
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateFileName() {
  const isoDateString = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
  const outputFileName = `results_${isoDateString}.json`;
  const outputDirectory = path.join(process.cwd(), "output");

  ensureDirectoryExists(outputDirectory);

  const outputFilePath = path.join(outputDirectory, outputFileName);

  return outputFilePath;
}

async function setLinkedinCookies(page) {
  const cookies = [
    {
      name: "li_at",
      value: process.env.LI_AT_COOKIE_VALUE,
      domain: ".linkedin.com",
      path: "/",
    },
  ];

  await page.setCookie(...cookies);
}

// This function aborts requests for unnecessary res
async function setupRequestInterception(page) {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["stylesheet", "font", "image"].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

// This function scrapes google search results for a query
async function getGoogleUrls(query) {
  const page = await browser.newPage();
  await setupRequestInterception(page);
  const userAgent = new UserAgent();
  await page.setUserAgent(userAgent.toString());

  const formattedQuery = query.trim().replace(/\s+/g, "+");
  const searchUrl = `${BASE_URL}${formattedQuery}&gl=${GL}&hl=${HL}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

  await page.solveRecaptchas();

  await delay(1000);
  await page.mouse.wheel({ deltaY: 300 });
  await delay(1000);
  const urls = await page.evaluate(
    (selector, limit) => {
      return Array.from(document.querySelectorAll(selector))
        .slice(0, limit)
        .map((a) => a.href);
    },
    SELECTOR,
    MAX_PAGES
  );

  await page.close();

  return urls;
}

async function collectLinkedinContent(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.solveRecaptchas();

    await delay(700);
    await page.mouse.wheel({ deltaY: 300 });
    await delay(1000);
    await page.mouse.wheel({ deltaY: 400 });
    await delay(800);

    return await page.evaluate(() => document.body.innerText);
  } catch (err) {
    return false;
  }
}

// This function scrapes  linkedin content
async function getLinkedinContent(urls) {
  let texts = [];
  try {
    const page = await browser.newPage();
    await setupRequestInterception(page);
    const userAgent = new UserAgent();
    await page.setUserAgent(userAgent.toString());
    await setLinkedinCookies(page);

    for (const [index, url] of urls.entries()) {
      if (index >= 1) {
        await delay(LINKEDIN_DELAY_BETWEEN_REQUESTS);
      }

      let data = false;
      let attempts = 0;
      while (!data && attempts < 2) {
        data = await collectLinkedinContent(page, url);
        if (!data) {
          await delay(3000); // 3 seconds delay
        }
        attempts++;
      }

      texts.push(data || `Failed to collect data for ${url}`);
    }

    await page.close();
    return texts;
  } catch (error) {
    return texts;
  }
}

async function run(queries, outputFileName) {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-infobars"],
  });

  // let results = [];
  for (const query of queries) {
    if (proxyIndex >= 1) {
      await delay(GOOGLE_DELAY_BETWEEN_REQUESTS);
    }
    spinner.text = chalk.blue(`Processing query: ${query}...`);
    const urls = await getGoogleUrls(query);
    const texts = await getLinkedinContent(urls);

    spinner.text = chalk.green(
      `Completed processing query: ${query}\nCollected data has been written to file.`
    );
    appendDataToFile({ query, urls, texts }, outputFileName);

    proxyIndex++;
  }

  await browser.close();
}

(async () => {
  try {
    spinner.start();
    spinner.text = chalk.blue("Scraping started...");
    const outputFileName = generateFileName();
    const queries = await readQueriesFromCSV(INPUT_FILE);

    await run(queries, outputFileName);
  } catch (error) {}
})();
