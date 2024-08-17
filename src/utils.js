import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export const DEBUG = process.env.DEBUG == "true";

export function debug(ID, msg) {
  if (DEBUG == true)
    console.log(`[D-${ID}] ${msg}`);
}
export function error(ID, msg, e) {
  console.log(`[x-${ID}] ${msg}`);
  if (DEBUG == true)
    console.log(e);
}

export function rc4(key, inp) {
  let arr = [];
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
export function subst(a) {
  return (btoa(a)).replace(/\//g, '_').replace(/\+/g, '-');
}
export function subst_(a) {
  return atob((a).replace(/_/g, '/').replace(/-/g, '+'));
}
export function mapp(a, b, c) {
  let d = b.length;
  const e = {};
  while (d-- && (e[b[d]] = c[d] || '')) {
    ;
  }
  return a.split('').map(a => e[a] || a).join('');
}
export function reverse(a) {
  return a.split('').reverse().join('');
}

export function general_enc(key, inp) {
  inp = encodeURIComponent(inp);
  const e = rc4(key, inp);
  const out = btoa(e).replace(/\//g, "_").replace(/\+/g, '-');
  return out;
}

export function general_dec(key, inp) {
  const i = atob((inp).replace(/_/g, "/").replace(/-/g, "+"));
  let e = rc4(key, i);
  e = decodeURIComponent(e);
  return e;
}

export async function try_stream(SERVERS, server, url, args = {}) {
  let handler = SERVERS.find(e => e.id == server)?.handler;
  try {
    return await handler.stream(url, args);
  } catch (e) {
    console.log(`[x] Chosen method is not working ... falling back to others`);
    if (DEBUG)
      console.log(e);
    for (const h of SERVERS) {
      if (h.handler == handler)
        continue;

      try {
        return await h.handler.stream(url, args);
      } catch {
        console.log(`[x] ${h.id} not worked`);
      }
    }

    console.log(`[x] Something went wrong :(`);
    throw NO_STREAM_ERROR;
  }
}

export const keys_path = path.join(__dirname, "keys.json");

const keys = JSON.parse((fs.existsSync(keys_path)) ? fs.readFileSync(keys_path) : "{}");
export function get_keys(hosts) {
  for (const h of hosts) {
    if (keys[h])
      return keys[h];
  }
  throw NO_KEY_ERROR;
}

export let NO_STREAM_ERROR = "NO_STREAM";
export let NO_KEY_ERROR = "NO_KEY";
