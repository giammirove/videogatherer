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

import { keys_path, debug, error, log, rc4, mapp, subst, reverse, enc_with_order } from './utils.js';
import { Watchseries } from './sources/watchseriesx.js';
import { Vidsrc } from './sources/vidsrc.js';
import { Aniwave } from './sources/aniwave.js';
import { F2Cloud } from './providers/f2cloud.js';

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

const VIDSRCCC = {
  ID: "CC",
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36, Playstation',
  EXPECTED_KEYS: 5,
  INJECT_URLS: [
    "all.js",
    "all.min.js",
    "embed.js",
    "embed.min.js"
  ],
  INIT_URL: "https://vidsrc.cc/v2/embed/movie/385687",
  BTN_ID: "#btn-play",
  MAX_TIMEOUT: 2500,
}

let ENTRIES = {
}


let funcs = [reverse, subst];
let mfuncs = [[subst], [reverse, subst]];

/**
 * Returns names of the (sorted) functions used to produce `expected`
 *
 * @param {string} expected The expected value.
 * @param {Trace} prev_trace The trace of the step before (can be empty in case of first step).
 * @param {string} r1 Only used for the first step. It is the entry value (e.g. `LoFbkLSv`).
 * @return {Array} Names of the functions.
 */
function find_funcs(expected = undefined, prev_trace = {}, r1 = "") {
  let fun = [];
  if (prev_trace["type"] == "rc4") {
    r1 = rc4(prev_trace["0"], prev_trace["1"]);
    fun = [rc4];
  } else if (prev_trace["type"] == "map") {
    r1 = mapp(prev_trace["0"], prev_trace["1"], prev_trace["2"]);
    fun = [mapp];
  }

  if (r1 === expected) {
    return fun;
  }

  if (r1 === "")
    r1 = expected;
  for (let i = 0; i < funcs.length; i++) {
    let r2 = funcs[i](r1);
    if (r2 == expected)
      return [...fun, funcs[i]];
    for (let j = 0; j < mfuncs[i].length; j++) {
      let r3 = mfuncs[i][j](r2);
      if (r3 == expected)
        return [...fun, funcs[i], mfuncs[i][j]];
    }
  }

  throw "NO COMBINATION";
}


/**
 * Returns the result of the previous trace (it is the argument of the current trace)
 *
 * @param {Trace} trace The trace that has per argument the previous trace result
 * @return {string} Result
 */
function get_result_from_prev_trace(trace) {
  if (trace["type"] == "rc4") {
    return trace["1"];
  } else if (trace["type"] == "map") {
    return trace["0"];
  }
}

function get_result_from_trace(trace) {
  if (trace["type"] == "rc4") {
    return rc4(trace["0"], trace["1"]);
  } else if (trace["type"] == "map") {
    return mapp(trace["0"], trace["1"], trace["2"]);
  }
}
function get_func_from_trace(trace) {
  if (trace["type"] == "rc4") {
    return rc4;
  } else if (trace["type"] == "map") {
    return mapp;
  }
}

// Assumption: 
// - while intercepting using puppeteer we ONLY get keys (not false positives)
// - the order of the keys intercepted is critical
// - we log only the first usage of the encrypt function (we get there `entry` and `out`)
// - `entry` and `out` must be related to `traces`
//
// The idea is that we log every call to "important" functions (e.g. rc4, mapp)
// The logs must be in the correct order
// With the logs we know parameters and we can compute the output
// We then try all the combinations to find the correct functions
// 
function reverse_crypt_function(traces, entry = "", out = "") {

  let log = '';
  let funcs = [];
  if (entry != "") {
    let prev_res = get_result_from_prev_trace(traces[0]);
    let comb = find_funcs(entry, {}, prev_res);
    funcs.push(...comb);
    log += (`0. ${comb.map(f => f.name)}\n`);
  }
  for (let i = 1; i < traces.length; i++) {
    let prev_res = get_result_from_prev_trace(traces[i]);
    let comb = find_funcs(prev_res, traces[i - 1]);
    funcs.push(...comb);
    log += (`${i}. ${comb.map(f => f.name)}\n`);
  }

  const prev_res = get_result_from_trace(traces[traces.length - 1]);
  let comb = find_funcs(out, {}, prev_res);
  funcs.push(get_func_from_trace(traces[traces.length - 1]));
  funcs.push(...comb);
  log += (`L${traces.length}. ${comb.map(f => f.name)}\n`);
  debug(ID, log);

  return funcs;
}

// finding possible names for the rc4 function
// a new source is not generated since some functions depend on the min algorithm
// used originally
async function get_rc4_names(source) {

  const ast = parser.parse(source);
  let names = [];
  const MyVisitor = {
    VariableDeclaration(path) {
      let s = source.slice(path.node.start, path.node.end);
      let name = s.split("{")[0].replace("(", "\\(").replace(")", "\\)");
      for (let dec of path.node.declarations) {
        let forCount = 0;
        let whileCount = 0;
        if (dec?.init?.body?.body != undefined) {
          for (let n of dec.init.body.body) {
            if (n.type == 'ForStatement') {
              forCount++;
              if (forCount >= 3) {
                names.push({ name: name, type: 'rc4', source: 'var' });
                return;
              }
            }
            if (n.type == 'WhileStatement') {
              whileCount++;
            }
          }
          // the new technique used by some websites involves a new function that maps
          // the input based on a key
          if ((whileCount == 1 || forCount == 1) && dec.init.params.length == 3) {
            if (dec.id.name) {
              names.push({ name: name, type: 'map', source: 'var' });
            }
          }
        }
      }
    },
    FunctionDeclaration(path) {
      let forCount = 0;
      let whileCount = 0;
      let s = source.slice(path.node.start, path.node.end);
      let name = s.split("{")[0].replace("(", "\\(").replace(")", "\\)");
      if (path?.node?.body?.body) {
        for (let n of path.node.body.body) {
          if (n.type == 'ForStatement') {
            forCount++;
            if (forCount >= 3) {
              if (path.node.id.name) {
                names.push({ name: name, type: 'rc4', source: 'func' });
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
        if ((whileCount == 1 || forCount == 1) && path.node.params.length == 3) {
          if (path.node.id.name) {
            names.push({ name: name, type: 'map', source: 'func' });
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

async function handle_intercept(request, config, entries_outs = {}) {
  const url = decodeURIComponent(request.url());
  const host = (new URL(url)).host;
  if (config.INJECT_URLS.some(v => url.includes(v))) {
    let body = await (await fetch(url)).text();
    const funcs = await get_rc4_names(body);
    debug(ID, url);
    debug(ID, JSON.stringify(funcs));
    // risky approach since we could modify multiple functions
    // ... but in the worst case we would just be printing so no harm
    for (let n of funcs) {
      let reg;
      reg = new RegExp(`${n.name}\\s*{`, 'gms');

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
    if (ENTRIES[host] && ENTRIES[host].ENTRY.test(url)) {
      if (entries_outs[host] == undefined)
        entries_outs[host] = { entry: "", out: "" }
      if (entries_outs[host].entry == "")
        entries_outs[host].entry = ENTRIES[host].ENTRY.exec(url)[1];
      debug(ID, `ENTRY : ${entries_outs[host].entry} for ${host}`);
    }
    if (ENTRIES[host] && ENTRIES[host].OUT.test(url)) {
      if (entries_outs[host] == undefined)
        entries_outs[host] = { entry: "", out: "" }
      if (entries_outs[host].out == "")
        entries_outs[host].out = ENTRIES[host].OUT.exec(url)[1];
      debug(ID, `OUT : ${entries_outs[host].out} for ${host}`);
    }
    request.continue();
  }
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
  let traces = {};
  let entries_outs = {};

  await page.setUserAgent(config.USER_AGENT);
  await page.setViewport({
    width: 1080,
    height: 1080
  })
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    await handle_intercept(request, config, entries_outs);
  });

  let closed = false;
  return new Promise(async (resolve) => {

    function add_key(host, key, trace) {
      if (!keys[host].includes(key) && entropy(key) > 3.2) {
        keys[host].push(key)
        if (!traces[host].includes(trace))
          traces[host].push(trace);
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
          //debug(ID, JSON.stringify(j));
          if (!keys[j['host']]) {
            keys[j['host']] = [];
            traces[j['host']] = [];
          }
          if (j['type'] == 'rc4') {
            if (add_key(j['host'], j['0'], j)) {
              keysNum++;
            }
          } else if (j['type'] == 'map') {
            if (add_key(j['host'], j['1'], j)) {
              keysNum++;
            }
            if (add_key(j['host'], j['2'], j)) {
              keysNum++;
            }
          }
        }
      })
      .on('error', async (message) => {
        error(ID, message);
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
        await sleep(100);
      }
    }
    catch (e) {
      if (!closed)
        error(ID, e);
    }

    if (keysNum < config.EXPECTED_KEYS) {
      await sleep(config.MAX_TIMEOUT);
    }
    await browser.close();
    debug(ID, `${config.ID} got ${keysNum}/${config.EXPECTED_KEYS}`);
    resolve({ keys, traces, entries_outs });
  });

}

// TODO: generalize and refactor
function prepare_entries(arr) {
  for (let e of arr) {
    if (e.SCRAPE_CONFIG.ENTRY) {
      for (let h of e.ALT_HOSTS) {
        ENTRIES[h] = e.SCRAPE_CONFIG;
      }
    }
  }
}

function test_keys_funcs(keys, funcs, entry, out) {
  let res = enc_with_order(keys, funcs, entry);
  return res == out;
}

async function main() {
  prepare_entries([Vidsrc, F2Cloud, Watchseries, Aniwave]);
  let promises = [find_keys(Vidsrc.SCRAPE_CONFIG), find_keys(Watchseries.SCRAPE_CONFIG), find_keys(Aniwave.SCRAPE_CONFIG)];
  let results_promises = (await Promise.all(promises));
  let results = { keys: {}, traces: {}, entries_outs: {}, encrypt_order: {} }
  for (let r of results_promises) {
    results.keys = Object.assign({}, results.keys, r.keys);
    results.traces = Object.assign({}, results.traces, r.traces);
    results.entries_outs = Object.assign({}, results.entries_outs, r.entries_outs);
  }
  let keys = results["keys"];
  let traces = results["traces"];
  let entries_outs = results["entries_outs"];
  for (let t in traces) {
    let entry = entries_outs[t]?.entry;
    let out = entries_outs[t]?.out;
    if (entry && out && keys[t]) {
      let funcs = reverse_crypt_function(traces[t], entry, out);
      if (test_keys_funcs(keys[t], funcs, entry, out)) {
        log(ID, `Encrypt function found for ${t}`);
        results.encrypt_order[t] = funcs.map(f => f.name);
      }
    }
  }
  fs.writeFileSync(keys_path, JSON.stringify(results));
  log(ID, `Keys successfully stored in ${keys_path}`);
}

main();

