#!/usr/bin/env node

import { launch } from "puppeteer";
import chalk from "chalk";
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";

const url = "https://1337x.to/";
// const searchQuery = "batman";

const sleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

const welcome = async () => {
  const title = chalkAnimation.rainbow(
    "Welcome to satanrout's torrent scraper"
  );
  await title.start();
  await sleep(1200);
  await title.stop();
};

const chooseTorrentProvider = async () => {
  const providers = ["1337x", "the pirate bay", "nyaa si"];
  const { provider } = await inquirer.prompt({
    type: "list",
    name: "provider",
    message: "Choose a torrent provider",
    choices: providers,
  });
  return provider;
};

const searchQuery = async () => {
  const { query } = await inquirer.prompt({
    type: "input",
    name: "query",
    message: "Enter a search query",
  });
  return query;
};

const getTorrent = async (provider, query) => {
  switch (provider) {
    case "1337x":
      getTorrentList1337x(query);
      break;
    case "the pirate bay":
      console.log("currently the pirate bay is not supported");
      break;
    case "nyaa si":
      console.log("currently nyaa si is not supported");
      break;
    default:
      break;
  }
};

const getTorrentList1337x = async (query) => {
  const spinner = createSpinner();
  await spinner.start({ text: "Booting Up...", color: "yellow" });
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  await spinner.update({ text: "Navigating to 1337x...", color: "yellow" });
  await page.goto(url);
  await spinner.update("in url");
  await page.focus("#autocomplete");
  await spinner.update("focused on input");
  await page.keyboard.type(query);
  await spinner.update("typed query");
  await page.keyboard.press("Enter");
  await spinner.update({ text: "Scraping torrents...", color: "yellow" });
  await page.waitForSelector(".box-info-detail", { timeout: 100000 });
  const results = await page.evaluate(() => {
    const results = [];
    const elements = document.querySelectorAll(
      ".box-info-detail  .table-list-wrap  tbody  tr"
    );
    elements.forEach((element, index) => {
      results.push({
        title: element.querySelectorAll("a")[1].innerText,
        detailPage: element.querySelectorAll("a")[1].href,
        seeders: element.querySelector(".seeds").innerText,
        leechers: element.querySelector(".leeches").innerText,
        size: element.querySelector(".size").innerText,
        date: element.querySelector(".coll-date").innerText,
      });
    });
    return results;
  });
  if (results.length === 0) {
    await spinner.update("No torrents found");
    await browser.close();
    process.exit();
  }
  await spinner.success({
    text: "Found " + results.length + " torrents",
    color: "green",
  });
  const { torrent } = await inquirer.prompt({
    type: "list",
    name: "torrent",
    message: "Choose a torrent",
    choices: results.map((result, index) => {
      return {
        name: `${index + 1}. ${result.title} - ${result.size}`,
        value: result.detailPage,
      };
    }),
  });
  await getMagnetLink(torrent, page, spinner, browser);
};

const getMagnetLink = async (url, page, spinner, browser) => {
  await spinner.start({
    text: "Loading torrent detail page...",
    color: "yellow",
  });
  await page.goto(url);
  await spinner.update({ text: "Getting magnet link...", color: "yellow" });
  await page.waitForSelector(
    ".page-content .torrent-detail-page .no-top-radius ul li a",
    { timeout: 100000 }
  );
  const magnetLink = await page.evaluate(() => {
    const element = document.querySelector(
      ".page-content .torrent-detail-page .no-top-radius ul li a"
    );
    return element.href;
  });
  if (magnetLink) {
    await spinner.success({
      text: "Found magnet link",
      color: "green",
    });
    console.log(magnetLink);
    await browser.close();
    process.exit();
  } else {
    await spinner.error({ text: "No magnet link found", color: "red" });
    await browser.close();
    process.exit();
  }
};

await welcome();
await getTorrent(await chooseTorrentProvider(), await searchQuery());
