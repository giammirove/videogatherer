import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export const DEBUG = process?.env?.DEBUG == "true";

export function log(ID, msg) {
  console.log(`[!-${ID}] ${msg}`);
}
export function debug(ID, msg) {
  if (DEBUG == true)
    console.log(`[D-${ID}] ${msg}`);
}
export function error(ID, msg, e) {
  console.log(`[x-${ID}] ${msg}`);
  if (DEBUG == true && e)
    console.log(e);
}

export function isJSON(d) {
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

function string_to_func(func) {
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
}

export async function try_stream(SERVERS, server, url, args = {}) {
  let handler = SERVERS.find(e => e.id == server)?.handler;
  try {
    return await handler.stream(url, args);
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

export function enc_with_order(keys, order, inp) {
  let res = "";
  let k_i = 0;

  function use_func(func, inp) {
    let r = 0;
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
  } catch (e) {
    console.log("MANNG", inp);
    console.log(keys);
    console.log(order);
    console.error(e);
    return "";
  }

  return res;
}
export function dec_with_order(keys, order, inp) {
  return enc_with_order(keys.concat().reverse(), order.concat().reverse().map(f => f == subst ? subst_ : f), inp);
}

export const keys_path = path.join(__dirname, "keys.json");
const store = JSON.parse((fs.existsSync(keys_path)) ? fs.readFileSync(keys_path) : "{}");
const keys = store["keys"];
const encrypt_orders = store["encrypt_order"];

export function get_keys(hosts) {
  for (const h of hosts) {
    if (keys[h])
      return keys[h];
  }
  throw NO_KEY_ERROR;
}

export function get_encrypt_order(hosts) {
  for (const h of hosts) {
    if (encrypt_orders[h])
      return encrypt_orders[h].map(f => string_to_func(f));
  }
  return [];
}

export const NO_STREAM_ERROR = "NO_STREAM";
export const NO_KEY_ERROR = "NO_KEY";
