### Description

This script is a web scraper that uses Puppeteer, to automate browser actions. The script reads search queries from a CSV file, performs Google searches for each query, and then scrapes the resulting URLs. It specifically targets LinkedIn URLs and collects the text content from these pages. The script saves the results in a CSV file.

### How to use

1. First, you need to install the required packages. You can do this by running the following command in the terminal:

`npm install`

- If you don't have npm installed, you can download it from [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

  1.1. Create a `.env` file in the root directory of the project and add the following environment variables:

```env
# .env
LI_AT_COOKIE_VALUE=your_LI_AT_cookie_value
```

- Replace `your_LI_AT_cookie_value` with the value of the `li_at` cookie from your LinkedIn account.

- To get the `li_at` cookie value, you can follow the steps below:

  - Open the LinkedIn website in your browser and log in to your account.
  - Open the developer tools by pressing `F12` or `Ctrl + Shift + I` in the browser.
  - Go to the `Application` tab in the developer tools.
  - In the `Application` tab, expand the `Cookies` section and select `www.linkedin.com`.
  - Find the `li_at` cookie in the list and copy its value.
  - Paste the value of the `li_at` cookie into the `.env` file.

2. After installing the required packages, you can run the code by running the following command in the terminal:

`npm start`

3. The script will keep running until you stop it manually. You can stop the script by pressing `Ctrl + C` in the terminal.

4. The script will create a file called `results.json` in the `output` directory. This file will contain the results of the scraping process.

Notes:

- There is a delay of 1 minute between each request to avoid getting blocked by LinkedIn, a delay of 8 minutes between each request to avoid getting blocked by Google You can change this delay by modifying `LINKEDIN_DELAY_BETWEEN_REQUESTS` and `GOOGLE_DELAY_BETWEEN_REQUESTS` variables in the `scraper.js` file.

- The script will only scrape the first page of the search results. If you want to scrape more pages, you can modify the `MAX_PAGES` variable in the `scraper.js` file.

- The script will only scrape the first 2 pages of the search results. If you want to scrape more pages, you can modify the `MAX_PAGES` variable in the `scraper.js` file.

- Update `INPUT_FILE` variable in `scraper.js` to change the queries input file.

- If you decided to use a list of proxies, you can update `PROXY_LIST` variable in `scraper.js` to change the proxies list and uncomment the `--proxy-server=${proxy}` in `puppeteer.launch` options.
