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

import { keys_path, debug } from './utils.js';
import { Watchseries } from './sources/watchseriesx.js';
import { Vidsrc } from './sources/vidsrc.js';
import { Aniwave } from './sources/aniwave.js';

const ID = 'GK';

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

// finding possible names for the rc4 function
// a new source is not generated since some functions depend on the min algorithm
// used originally
async function get_rc4_names(source) {
  try {
    // deobfuscate 
    source = (await webcrack(source, { mangle: false })).code;
    source = (await webcrack(source, { mangle: false })).code;
    source = (await webcrack(source, { mangle: false })).code;
  } catch (e) {
    console.log(`[x] Can't webcrack`);
  }

  function add_params(name, params) {
    // escape ( and ) to be used in the regexp
    name = name + '\\(';
    for (let i = 0; i < params.length; i++) {
      name += params[i].name;
      if (i < params.length - 1)
        name += ',';
    }
    name += '\\)'
    return name;
  }

  const ast = parser.parse(source);
  let names = [];
  const MyVisitor = {
    FunctionDeclaration(path) {
      let forCount = 0;
      let whileCount = 0;
      if (path?.node?.body?.body) {
        for (let n of path.node.body.body) {
          if (n.type == 'ForStatement') {
            forCount++;
            if (forCount >= 3) {
              if (path.node.id.name) {
                let name = add_params(path.node.id.name, path.node.params);
                names.push({ name: name, type: 'rc4' });
              }
              return;
            }
          }
          if (n.type == 'WhileStatement') {
            whileCount++;
          }
        }
        // the new technique used by some websites involves a new function that maps
        // the input based on a key
        if (whileCount == 1 && path.node.params.length == 3) {
          if (path.node.id.name) {
            let name = add_params(path.node.id.name, path.node.params);
            names.push({ name: name, type: 'map' });
          }
        }
      }
    }
  };

  traverse.default(ast, MyVisitor);
  return names;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// https://gist.github.com/jabney/5018b4adc9b2bf488696
function entropy(str) {
  const len = str.length
  const frequencies = Array.from(str)
    .reduce((freq, c) => (freq[c] = (freq[c] || 0) + 1) && freq, {})
  return Object.values(frequencies)
    .reduce((sum, f) => sum - f / len * Math.log2(f / len), 0)
}


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
      const funcs = await get_rc4_names(body);
      debug(ID, url, JSON.stringify(funcs));
      // risky approach since we could modify multiple functions
      // ... but in the worst case we would just be printing so no harm
      for (let n of funcs) {
        let reg = new RegExp(`function ${n.name}\\s*{`, 'gms');
        let sel = reg.exec(body);
        if (sel) {
          let rep = `${sel[0]}if(arguments){arguments['host']='${host}';arguments['type']='${n.type}';console.log(\`S:\${JSON.stringify(arguments)}\`);}`;
          body = body.replaceAll(sel[0], rep);
        }
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

    function add_key(host, key) {
      if (!keys[host].includes(key) && entropy(key) > 3.2) {
        keys[host].push(key)
        return true;
      }
    }

    page
      .on('console', async (message) => {
        let t = message.text();
        if (t.startsWith("S:")) {
          let j = JSON.parse(t.replace("S:", ""))
          if (!j['0'])
            return;
          if (!keys[j['host']])
            keys[j['host']] = [];
          if (j['type'] == 'rc4') {
            if (add_key(j['host'], j['0'])) {
              keysNum++;
            }
          } else if (j['type'] == 'map') {
            if (add_key(j['host'], j['1'])) {
              keysNum++;
            }
            if (add_key(j['host'], j['2'])) {
              keysNum++;
            }
          }
          //if (keysNum >= config.EXPECTED_KEYS) {
          //  closed = true;
          //  debug(ID, `${config.ID} got ${keys.lenght}/${config.EXPECTED_KEYS}`);
          //  resolve(keys);
          //}
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
          await page.evaluate((element) => {
            element.click()
          }, btn)
        }
        await sleep(200);
      }
    }
    catch (e) {
      if (!closed)
        console.log(`[x] ${e}`);
    }

    if (keysNum < config.EXPECTED_KEYS) {
      await sleep(config.MAX_TIMEOUT);
    }
    await browser.close();
    debug(ID, `${config.ID} got ${keysNum}/${config.EXPECTED_KEYS}`);
    resolve(keys);
  });

}

async function main() {
  let promises = [find_keys(Vidsrc.SCRAPE_CONFIG), find_keys(Watchseries.SCRAPE_CONFIG), find_keys(Aniwave.SCRAPE_CONFIG)];
  //let promises = [find_keys(Watchseries.SCRAPE_CONFIG)];
  let results = await Promise.all(promises);
  let keys = Object.assign({}, ...results);
  fs.writeFileSync(keys_path, JSON.stringify(keys));
  console.log(`[-] Keys successfully stored in ${keys_path}`);
}

main();

