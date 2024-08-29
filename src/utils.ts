import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEBUG = process?.env?.DEBUG == "true";

export type ScrapeConfig = {
  ID: string,
  // input of encrypt function
  ENTRY: RegExp,
  // output of encrypt function
  OUT: RegExp,
  USER_AGENT: string,
  INJECT_URLS: Array<string>,
  INIT_URL: string,
  BTN_ID: string,
  MAX_TIMEOUT?: number
  EXPECTED_KEYS?: number,
}

export type Subtitle = {
  label: string, file: string
}
export type Stream = {
  stream: string
  subtitles?: Array<Subtitle>
}

export type Source = {
  HOST: string,
  ALT_HOSTS: Array<string>,
  SERVERS: Array<ServerListItem>,
  ID: string,
  SCRAPE_CONFIG?: ScrapeConfig,
  movie(id: string, server?: string): Promise<Stream>;
  tv(id: string, s: number, e: number, server?: string): Promise<Stream>;
  search?(query: string): Promise<Array<SearchResult>>;
  test(): void
}

export type Provider = {
  ALT_HOSTS: Array<string>,
  SCRAPE_CONFIG?: ScrapeConfig,
  stream(url: string, args?: Record<string, string>): Promise<Stream>;
}

export type ServerListItem = {
  id: string,
  handler: Provider
}

export type Trace = Record<string, string>;
export type EntryOut = {
  entry: string,
  out: string
}
export type Store = {
  keys: Record<string, Array<string>>,
  encrypt_order: Record<string, Array<string>>,
  traces: Record<string, Array<Trace>>,
  entries_outs: Record<string, EntryOut>
}

export type SearchResultType = 'tv' | 'movie';

export type SearchResult = {
  type: SearchResultType,
  title: string,
  id: string
}

export type TransformText = ((...arg: Array<string>) => string);

export function log(ID: string, msg: string) {
  console.log(`[!-${ID}] ${msg} `);
}
export function debug(ID: string, msg: string) {
  if (DEBUG == true)
    console.log(`[D - ${ID}] ${msg} `);
}
export function error(ID: string, msg: string, e?: Error) {
  console.log(`[x - ${ID}] ${msg} `);
  if (DEBUG == true && e)
    console.log(e);
}

export function isJSON(d: object): boolean {
  try {
    if (typeof (d) === "string") {
      JSON.parse(d);
    } else {
      JSON.parse(JSON.stringify(d));
    }

    return true;
  } catch {
    return false;
  }
}

export function rc4(key: string, inp: string): string {
  const arr = [];
  let counter = 0;
  let i = 0;
  let tmp = 0;
  let decrypted = "";
  for (i = 0; i < 256; i++) {
    arr[i] = i;
  }
  for (i = 0; i < 256; i++) {
    counter = (counter + arr[i] + key.charCodeAt(i % key.length)) % 256;
    tmp = arr[i];
    arr[i] = arr[counter];
    arr[counter] = tmp;
  }
  i = 0;
  counter = 0;
  for (let j = 0; j < inp.length; j++) {
    i = (i + 1) % 256;
    counter = (counter + arr[i]) % 256;
    tmp = arr[i];
    arr[i] = arr[counter];
    arr[counter] = tmp;
    decrypted += String.fromCharCode(inp.charCodeAt(j) ^ arr[(arr[i] + arr[counter]) % 256]);
  }
  return decrypted;
}
export function subst(a: string) {
  return (btoa(a)).replace(/\//g, '_').replace(/\+/g, '-');
}
export function subst_(a: string) {
  return atob((a).replace(/_/g, '/').replace(/-/g, '+'));
}
export function mapp(a: string, b: string, c: string) {
  let d = b.length;
  const e: Record<string, string> = {};
  while (d-- && (e[b[d]] = c[d] || '')) {
    ;
  }
  return a.split('').map(a => e[a] || a).join('');
}
export function reverse(a: string) {
  return a.split('').reverse().join('');
}

export function general_enc(key: string, inp: string) {
  inp = encodeURIComponent(inp);
  const e = rc4(key, inp);
  const out = btoa(e).replace(/\//g, "_").replace(/\+/g, '-');
  return out;
}

export function general_dec(key: string, inp: string) {
  const i = atob((inp).replace(/_/g, "/").replace(/-/g, "+"));
  let e = rc4(key, i);
  e = decodeURIComponent(e);
  return e;
}

function string_to_func(func: string): TransformText {
  switch (func) {
    case "rc4":
      return rc4;
    case "mapp":
      return mapp;
    case "subst":
      return subst;
    case "reverse":
      return reverse;
  }
  return ((v: string) => v);
}

export async function try_stream(SERVERS: Array<ServerListItem>, server: string, url: string, args?: Record<string, string>): Promise<Stream> {
  const handler = SERVERS.find(e => e.id == server)?.handler;
  try {
    return await handler!.stream(url, args);
  } catch {
    for (const h of SERVERS) {
      if (h.handler == handler)
        continue;

      try {
        return await h.handler.stream(url, args);
      } catch {
        continue;
      }
    }

    throw NO_STREAM_ERROR;
  }
}

export function enc_with_order(keys: Array<string>, order: Array<TransformText>, inp: string) {
  let res = "";
  let k_i = 0;

  function use_func(func: TransformText, inp: string) {
    let r: string = "";
    switch (func) {
      case rc4:
        r = rc4(keys[k_i], inp);
        k_i++;
        break;
      case mapp:
        r = mapp(inp, keys[k_i], keys[k_i + 1]);
        k_i += 2;
        break;
      default:
        r = func(inp);
        break;
    }
    return r;
  }

  try {
    for (let i = 0; i < order.length; i++)
      res = use_func(order[i], i == 0 ? inp : res);
  } catch {
    return "";
  }

  return res;
}
export function dec_with_order(keys: Array<string>, order: Array<TransformText>, inp: string) {
  return enc_with_order(keys.concat().reverse(), order.concat().reverse().map(f => f == subst ? subst_ : f), inp);
}

export const keys_path = path.join(__dirname, "keys.json");
const store: Store = JSON.parse((fs.existsSync(keys_path)) ? fs.readFileSync(keys_path).toString() : "{}");
const keys: Record<string, Array<string>> = store.keys;
const encrypt_orders: Record<string, Array<string>> = store.encrypt_order

export function get_keys(hosts: Array<string>): Array<string> {
  for (const h of hosts) {
    if (keys[h])
      return keys[h];
  }
  throw NO_KEY_ERROR;
}

export function get_encrypt_order(hosts: Array<string>): Array<TransformText> {
  for (const h of hosts) {
    if (encrypt_orders[h])
      return encrypt_orders[h].map(f => string_to_func(f));
  }
  return [];
}

export const NO_STREAM_ERROR = "NO_STREAM";
export const NO_KEY_ERROR = "NO_KEY";
