/*
 * The idea is to use the AST of the original script to find the RC4 function
 * Then open a real url, patch the script in a way that the RC4 function 
 * can exfiltrate its parameters (keys) and gather them
 */

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import { executablePath } from 'puppeteer';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import { webcrack } from 'webcrack';
import { Deobfuscator } from "deobfuscator"
const synchrony = new Deobfuscator()

import { keys_path } from './utils.js';

// watchseries sometimes crashes ... just retry
const WATCHSERIES = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
  EXPECTED_KEYS: 5,
  INJECT_URLS: [
    "all.js",
    "embed.js"
  ],
  INIT_URL: "https://watchseriesx.to/tv/the-big-bang-theory-jyr9n",
  BTN_ID: ".movie-btn",
  MAX_TIMEOUT: 2500
}

const FLIX2 = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
  EXPECTED_KEYS: 5,
  INJECT_URLS: [
    "all.js",
    "embed.js"
  ],
  INIT_URL: "https://2flix.to/tv/the-big-bang-theory-watch-online-jjgjg/1-1",
  BTN_ID: ".playnow-btn",
  MAX_TIMEOUT: 2500
}

const VIDSRC = {
  // PlayStation bypasses dev tools detection
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation',
  EXPECTED_KEYS: 5,
  INJECT_URLS: [
    "all.js",
    "embed.js"
  ],
  INIT_URL: "https://vidsrc.to/embed/movie/385687",
  BTN_ID: "#btn-play",
  MAX_TIMEOUT: 2500
}

const VIDSRC2 = {
  // PlayStation bypasses dev tools detection
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation',
  EXPECTED_KEYS: 5,
  INJECT_URLS: [
    "all.js",
    "embed.js"
  ],
  INIT_URL: "https://vidsrc2.to/embed/movie/385687",
  BTN_ID: "#btn-play",
  MAX_TIMEOUT: 2500
}

const VIDSRCME = {
  // PlayStation bypasses dev tools detection
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation',
  EXPECTED_KEYS: 5,
  INJECT_URLS: [
    "all.js",
    "embed.js"
  ],
  INIT_URL: "https://vidsrc.me/embed/tv?imdb=tt1190634&season=1&episode=1",
  BTN_ID: "#player_iframe",
  MAX_TIMEOUT: 2500
}


// finding possible names for the rc4 function
// a new source is not generated since some functions depend on the min algorithm
// used originally
async function get_rc4_names(source) {
  try {
    source = (await webcrack(source, { mangle: false })).code;
    source = (await webcrack(source, { mangle: false })).code;
    source = (await webcrack(source, { mangle: false })).code;
  } catch (e) {
  }

  const ast = parser.parse(source);
  let names = [];
  const MyVisitor = {
    FunctionDeclaration(path) {
      let forCount = 0;
      if (path?.node?.body?.body) {
        for (let n of path.node.body.body) {
          if (n.type == 'ForStatement') {
            forCount++;
            if (forCount >= 3) {
              if (path.node.id.name)
                names.push(path.node.id.name);
              break;
            }
          }
        }
      }
    }
  };

  traverse.default(ast, MyVisitor);
  return names;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function find_keys(config) {
  const args = [
    '--no-sandbox',
    '--disable-web-security',
  ];

  const options = {
    args,
    executablePath: process.env.PUPPETEER_EXEC_PATH || executablePath(),
    headless: true,
  };

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage()

  let keys = {};
  let keysNum = 0;


  await page.setUserAgent(config.USER_AGENT);
  await page.setViewport({
    width: 1080,
    height: 1080
  })
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = request.url();
    if (config.INJECT_URLS.some(v => url.includes(v))) {
      let host = (new URL(url)).host;
      let body = await (await fetch(url)).text();
      const funcNames = await get_rc4_names(body);
      console.log(url, funcNames)
      // risky approach since we could modify multiple functions
      // ... but in the worst case we would just be printing so no harm
      for (let n of funcNames) {
        let rep = `function ${n}() {if(arguments){arguments['host']='${host}';console.log(\`S:\${JSON.stringify(arguments)}\`);}`;
        body = body.replaceAll(`function ${n}() {`, rep);
        body = body.replaceAll(`function ${n}(){`, rep);
      }
      request.respond({
        status: 200,
        body: body
      });
    } else {
      request.continue();
    }
  });

  let closed = false;
  return new Promise(async (resolve) => {

    page
      .on('console', async (message) => {
        let t = message.text();
        if (t.startsWith("S:")) {
          let j = JSON.parse(t.replace("S:", ""))
          if (!j['0'])
            return;
          if (!keys[j['host']])
            keys[j['host']] = [];
          if (!keys[j['host']].includes(j['0'])) {
            keys[j['host']].push(j['0'])
            keysNum++;
          }
          if (keysNum >= config.EXPECTED_KEYS) {
            closed = true;
            if (browser)
              await browser.close()
            resolve(keys);
          }
        }
      })
      .on('error', async (message) => {
        console.log(`[x] ${message}`);
      });

    await page.goto(config.INIT_URL);
    await page.waitForSelector(config.BTN_ID, { timeout: 5_000 });
    try {
      for (let i = 0; i < 50; i++) {
        if (closed) {
          break;
        }
        await page.bringToFront();
        let btn = await page.$(config.BTN_ID);
        if (btn && !closed) {
          btn.click();
        }
        await sleep(200);
      }
    }
    catch (e) {
      if (!closed)
        console.log(`[x] ${e}`);
    }

    if (browser && !closed) {
      await sleep(config.MAX_TIMEOUT);
      await browser.close();
    }
    resolve(keys);
  });

}

async function main() {
  //(await find_keys(VIDSRC));
  //(await find_keys(VIDSRC2));
  //(await find_keys(VIDSRCME));
  //(await find_keys(FLIX2));
  let keys = (await find_keys(WATCHSERIES));
  fs.writeFileSync(keys_path, JSON.stringify(keys));
  console.log(`[-] Keys successfully stored in ${keys_path}`);
}

main();

