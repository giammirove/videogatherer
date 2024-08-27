import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, try_stream, get_keys, error, isJSON, log, enc_with_order, dec_with_order, get_encrypt_order, ServerListItem, ScrapeConfig, Stream, SearchResult, SearchResultType, Source, TransformText } from '../utils.js';
import { F2Cloud } from '../providers/f2cloud.js';
import { FMCloud } from '../providers/fmcloud.js';

type EpisodeListJson = {
  result: string
}
type EpisodeJson = {
  result: {
    url: string
  };
}

const HOST: string = 'watchseriesx.to';
const ALT_HOSTS: Array<string> = [HOST];
const SERVER_F2CLOUD: string = '41';
const SERVER_MEGACLOUD: string = '28';
const SERVER_FMCLOUD: string = '45';
const SERVERS: Array<ServerListItem> = [
  { id: SERVER_F2CLOUD, handler: F2Cloud },
  { id: SERVER_MEGACLOUD, handler: F2Cloud },
  { id: SERVER_FMCLOUD, handler: FMCloud },
];
const ID: string = 'WA';

// watchseries sometimes crashes ... just retry
const SCRAPE_CONFIG: ScrapeConfig = {
  ID: ID,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36, Playstation',
  EXPECTED_KEYS: 19,
  INJECT_URLS: [
    "all.js",
    "scripts.js",
    "embed.js"
  ],
  // input of encrypt function
  ENTRY: new RegExp(`https://.*?/ajax/episode/list/(.*?)\\?`.replace(/\//g, '/')),
  // output of encrypt function
  OUT: new RegExp(`https://.*?/ajax/episode/list/.*?\\?vrf=(.*?)$`.replace(/\//g, '/')),
  INIT_URL: `https://${HOST}/tv/the-big-bang-theory-jyr9n`,
  BTN_ID: ".movie-btn",
  MAX_TIMEOUT: 3500
}

function enc(inp: string): string {
  const keys: Array<string> = get_keys(ALT_HOSTS);
  const order: Array<TransformText> = get_encrypt_order(ALT_HOSTS);
  if (order.length > 0)
    return enc_with_order(keys, order, inp);
  let a: string = subst(rc4(keys[2], reverse(mapp(inp, keys[0], keys[1]))));
  a = subst(rc4(keys[5], reverse(mapp(a, keys[3], keys[4]))));
  a = subst(rc4(keys[8], reverse(mapp(a, keys[6], keys[7]))));
  a = subst(a);
  return a;
}

function dec(inp: string): string {
  const keys: Array<string> = get_keys(ALT_HOSTS);
  const order: Array<TransformText> = get_encrypt_order(ALT_HOSTS);
  if (order.length > 0)
    return dec_with_order(keys, order, inp);
  let c = subst_(inp);
  c = mapp(reverse(rc4(keys[8], subst_(c))), keys[7], keys[6])
  c = mapp(reverse(rc4(keys[5], subst_(c))), keys[4], keys[3])
  c = mapp(reverse(rc4(keys[2], subst_(c))), keys[1], keys[0])
  return c;
}

async function episode(data_id: string, server: string = SERVER_F2CLOUD): Promise<Stream> {
  let url: string = `https://${HOST}/ajax/server/list/${data_id}?vrf=${encodeURIComponent(enc(data_id))}`;
  const resp: EpisodeListJson = await (await fetch(url)).json() as EpisodeListJson;
  const new_data_id = (new RegExp(`data-id="${server}" data-link-id="(.*?)"`)).exec(resp.result)![1];
  debug(ID, new_data_id);
  url = `https://${HOST}/ajax/server/${new_data_id}?vrf=${encodeURIComponent(enc(new_data_id))}`;
  const resp2 = await (await fetch(url)).json() as EpisodeJson;
  const url_dec = dec(resp2.result.url);
  debug(ID, url_dec);
  return await try_stream(SERVERS, server, url_dec);
}

async function movie(id: string, server: string = SERVER_F2CLOUD): Promise<Stream> {
  return await tv(id, 1, 1, server);
}

async function tv(id: string, s: number = 1, e: number = 1, server: string = SERVER_F2CLOUD): Promise<Stream> {
  const resp: string = await (await fetch(`https://${HOST}/tv/${id}/${s}-${e}`)).text();
  const data_id = (/data-id="(.*?)"/g).exec(resp)![1];
  debug(ID, data_id);
  const url = `https://${HOST}/ajax/episode/list/${data_id}?vrf=${encodeURIComponent(enc(data_id))}`;
  debug(ID, url);
  const resp2: EpisodeListJson = await (await fetch(url)).json() as EpisodeListJson;
  const new_data_id: string = (new RegExp(`${s}-${e}" data-id="(.*?)"`, 'g')).exec(resp2.result)![1];
  debug(ID, new_data_id);
  return await episode(new_data_id, server);
}

async function search(query: string): Promise<Array<SearchResult>> {
  const url: string = `https://${HOST}/filter?keyword=${query}`;
  const resp: string = await (await fetch(url)).text();
  const results = resp.match(new RegExp(`<a href=".*?" class="title">.*?</a>`, 'g'))!;
  const ret: Array<SearchResult> = [];
  for (const r of results) {
    const [, type_raw, id, title] = (new RegExp(`href="/(.*?)/(.*?)" .*>(.*?)</a>`)).exec(r)!;
    let type: SearchResultType = 'tv';
    if (type_raw !== 'tv')
      type = 'movie';
    const item: SearchResult = { type, title, id };
    ret.push(item);
  }
  return ret;
}

async function test() {
  try {
    const tests: Array<Promise<Stream>> = [tv("the-big-bang-theory-jyr9n", 1, 1), movie("movie-vika-online-k3n6m")];
    const results = await Promise.all(tests);
    for (const r of results) {
      if (!isJSON(r))
        throw `${JSON.stringify(r)} is not json`;
    }
    const results2: Array<SearchResult> = await search("big bang theory");
    if (results2[0].type == 'tv') {
      const r = (await tv(results2[0].id, 1, 2));
      if (!isJSON(r))
        throw `${JSON.stringify(r)} is not json`;
    }
    else {
      const r = (await movie(results2[0].id));
      if (!isJSON(r))
        throw `${JSON.stringify(r)} is not json`;
    }
    log(ID, `${HOST} passed the tests`);
  } catch (e: unknown) {
    error(ID, `${HOST} failed the tests`, (e as Error));
  }
}

export const Watchseries: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, search, SCRAPE_CONFIG, test };

