import fetch from 'node-fetch';
import t, { FunctionDeclaration } from "@babel/types";
import { webcrack } from 'webcrack';
import vm from 'node:vm';

import { Source, Stream, ServerListItem, isJSON, log, error, debug } from '../utils.js';
import { RequestInit } from 'node-fetch';



const HOST = 'vidsrc.xyz';
const ALT_HOSTS = [HOST, 'vidsrc.me', 'vidsrc.net'];
const SERVERS: Array<ServerListItem> = [
];
const ID = "VDM";
const REFERER = `http://${HOST}`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
let js_context = vm.createContext(globalThis);

async function fetchReferer(url: URL | string, args: RequestInit = { headers: {} }) {
  if (args.headers == undefined)
    args.headers = {};
  if ((args.headers as Record<string, string>)['Referer'] == undefined && (args.headers as Record<string, string>)['Referer'] != "")
    (args.headers as Record<string, string>)['Referer'] = REFERER;
  (args.headers as Record<string, string>)['User-Agent'] = USER_AGENT;
  return fetch(url, args);
}

function dec(input: string) {
  const reversed = input.split("").reverse().join("");
  let result = "";
  for (let i = 0; i < reversed.length; i++) {
    result += String.fromCharCode(reversed.charCodeAt(i) - 1);
  }
  let result2 = "";
  for (let i = 0; i < result.length; i += 2) {
    result2 += String.fromCharCode(parseInt(result.substr(i, 2), 16));
  }
  return result2;
}

async function episode(data_id: string, _server?: string): Promise<Stream> {
  const url = `https://${HOST}/embed/${data_id}`;
  debug(ID, url);
  const res = await (await fetchReferer(url)).text();
  const url2 = 'https:' + (/id="player_iframe" src="(.*?)"/gm).exec(res)[1].trim();
  debug(ID, url2);
  const res2 = await (await fetchReferer(url2)).text();
  debug(ID, res2);
  const host = (new URL(url2)).host;
  const srcrcpLink = /src:\s*'(.*?)'/gm.exec(res2)![1];
  debug(ID, srcrcpLink);
  const url3 = `https://${host}${srcrcpLink}`;
  debug(ID, url3);
  const res3 = await (await fetch(url3)).text();
  const [, enc_url] = (/<div id=".*?" style="display:none;">(.*?)<\/div>/gm).exec(res3)!;
  const script_url = `https://${host}` + (/<script src="(.{20,}\.js\?_=.*?)"/gm).exec(res3)![1];
  debug(ID, script_url);
  let script = "";
  for (let i = 0; i < 3; i++) {
    const res_script = await fetchReferer(script_url);
    if (res_script.status != 200)
      continue;
    script = await (res_script).text();
  }
  const [_, script_id] = /window\[bMGyx71TzQLfdonN\(["'](.*?)["'].*innerHTML\);$/gm.exec(script)!;
  const new_script = (await webcrack(script, { mangle: false })).code;
  try {
    vm.runInContext(new_script, js_context);
  } catch (e) {
  }
  const dec_url = vm.runInContext(`${script_id}('${enc_url}')`, js_context);
  debug(ID, dec_url)
  return { stream: dec_url } as Stream;
};

async function movie(id: string, _server?: string) {
  debug(ID, id);
  return episode(id, _server);
}

async function tv(id: string, s: number = 1, e: number = 1, _server?: string) {
  debug(ID, id);
  return episode(`${id}/${s}-${e}`, _server);
}

async function test() {
  try {
    const tests = [movie("tt1300854")/*, tv('tt1312171', 1, 1)*/];
    const results = await Promise.all(tests);
    for (const r of results) {
      if (!isJSON(r))
        throw `${JSON.stringify(r)} is not json`;
      debug(ID, JSON.stringify(r));
    }
    log(ID, `${HOST} passed the tests`);
  } catch (e: unknown) {
    error(ID, `${HOST} failed the tests`, (e as Error));
  }
}

export const VidsrcMe: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, test };

