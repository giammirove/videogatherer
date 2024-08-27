import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, get_keys, dec_with_order, enc_with_order, get_encrypt_order, ScrapeConfig, Stream, Provider, TransformText } from '../utils.js';

type StreamJson = {
  result: string;
}

// alternative hosts
const HOST = "vid2v11.site";
const ALT_HOSTS = [HOST, "vid2faf.site"];
const ID = "F2";

const SCRAPE_CONFIG: ScrapeConfig = {
  ID: ID,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36, Playstation',
  EXPECTED_KEYS: 19,
  INJECT_URLS: [
  ],
  // input of encrypt function
  ENTRY: new RegExp(`https://.*?/e/(.*?)\\?`.replace(/\//g, '/')),
  // output of encrypt function
  OUT: new RegExp(`https://.*?/mediainfo/(.*?)[&\\?]`.replace(/\//g, '/')),
  INIT_URL: `https://${HOST}/`,
  BTN_ID: "",
}

function enc(inp: string): string {
  const keys: Array<string> = get_keys(ALT_HOSTS);
  const order: Array<TransformText> = get_encrypt_order(ALT_HOSTS);
  if (order.length > 0)
    return enc_with_order(keys, order, inp);
  let a: string = mapp(inp, keys[0], keys[1]);
  a = reverse(a);
  a = rc4(keys[2], a);
  a = subst(a);
  a = reverse(a);
  a = mapp(a, keys[3], keys[4]);
  a = rc4(keys[5], a);
  a = subst(a);
  a = rc4(keys[6], a);
  a = subst(a);
  a = reverse(a);
  a = mapp(a, keys[7], keys[8]);
  a = subst(a);
  return a;
}

function dec(inp: string): string {
  const keys: Array<string> = get_keys(ALT_HOSTS);
  const order: Array<TransformText> = get_encrypt_order(ALT_HOSTS);
  if (order.length > 0)
    return dec_with_order(keys, order, inp);
  let a: string = subst_(inp);
  a = mapp(a, keys[8], keys[7]);
  a = reverse(a);
  a = subst_(a);
  a = rc4(keys[6], a);
  a = subst_(a);
  a = rc4(keys[5], a);
  a = mapp(a, keys[4], keys[3]);
  a = reverse(a);
  a = subst_(a);
  a = rc4(keys[2], a);
  a = reverse(a);
  a = mapp(a, keys[1], keys[0]);
  return a;
}

async function stream(iurl: string): Promise<Stream> {
  const url: URL = new URL(iurl);
  const embed_id: string = url.pathname.split("/")[2];
  debug(ID, embed_id);
  const mediainfo_url: string = `https://${url.host}/mediainfo/${enc(embed_id)}${url.search}&ads=0`;
  debug(ID, mediainfo_url);
  const resp: StreamJson = await (await fetch(mediainfo_url)).json() as StreamJson;
  debug(ID, JSON.stringify(resp));
  const playlist = dec(resp.result)?.replace(/\\\//g, "/");
  debug(ID, playlist);
  return JSON.parse(playlist) as Stream;
}

export const F2Cloud: Provider = { SCRAPE_CONFIG, ALT_HOSTS, stream };

