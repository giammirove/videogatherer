import fetch from 'node-fetch';
import { mapp, reverse, rc4, subst, subst_, debug, get_keys, error, log, isJSON, get_encrypt_order, enc_with_order, dec_with_order, ScrapeConfig, Stream, Source, ServerListItem, TransformText } from '../utils.js';
import { F2Cloud } from '../providers/f2cloud.js';

const HOST: string = 'vidsrc2.to';
const ALT_HOSTS: Array<string> = [HOST];
const ID: string = 'VS';

type EpisodeJson = {
  result: [
    { id: string }
  ]
}
type SourceJson = {
  result: { url: string }
}

const SCRAPE_CONFIG: ScrapeConfig = {
  ID: ID,
  // PlayStation bypasses dev tools detection
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation',
  EXPECTED_KEYS: 19,
  INJECT_URLS: [
    "all.js",
    "embed.js",
    "web.js"
  ],
  // input of encrypt function
  ENTRY: new RegExp(`https://.*?/ajax/embed/episode/(.*?)/sources\\?.*`.replace(/\//g, '/')),
  // output of encrypt function
  OUT: new RegExp(`https://.*?/ajax/embed/episode/.*?/sources\\?.*token=(.*?)$`.replace(/\//g, '/')),
  INIT_URL: `https://${HOST}/embed/movie/385687`,
  BTN_ID: "#btn-play",
  MAX_TIMEOUT: 2500
}

const SERVERS: Array<ServerListItem> = [
];

function enc(inp: string): string {
  const keys: Array<string> = get_keys(ALT_HOSTS);
  const order: Array<TransformText> = get_encrypt_order(ALT_HOSTS);
  if (order.length > 0)
    return enc_with_order(keys, order, inp);

  let a: string = mapp(subst(rc4(keys[0], reverse(inp))), keys[1], keys[2]);
  a = mapp(reverse(subst(rc4(keys[3], a))), keys[4], keys[5]);
  a = rc4(keys[8], reverse(mapp(a, keys[6], keys[7])));
  return subst(subst(a));
}

function dec(inp: string): string {
  const keys: Array<string> = get_keys(ALT_HOSTS);
  const order: Array<TransformText> = get_encrypt_order(ALT_HOSTS);
  if (order.length > 0)
    return dec_with_order(keys, order, inp);

  let a: string = subst_(inp);
  a = mapp(reverse(rc4(keys[8], subst_(a))), keys[7], keys[6]);
  a = rc4(keys[3], subst_(reverse(mapp(a, keys[5], keys[4]))));
  a = reverse(rc4(keys[0], subst_(mapp(a, keys[2], keys[1]))));
  return a;
}

async function episode(data_id: string): Promise<Stream> {
  const t: string = new Date().getTime().toString(16);
  const time_params: string = `t=${encodeURIComponent(t)}&h=${encodeURIComponent(enc(t))}`
  debug(ID, time_params);
  let url: string = `https://${HOST}/ajax/embed/episode/${data_id}/sources?token=${encodeURIComponent(enc(data_id))}&${time_params}`;
  debug(ID, url);
  const resp = await (await fetch(url)).json() as EpisodeJson;
  // 0 is F2Cloud
  const f2cloud_id = resp.result[0].id;
  debug(ID, f2cloud_id);
  url = `https://${HOST}/ajax/embed/source/${f2cloud_id}?token=${encodeURIComponent(enc(f2cloud_id))}&${time_params}`;
  debug(ID, url);
  const resp2 = await (await fetch(url)).json() as SourceJson;
  const f2cloud_url = resp2.result.url;
  debug(ID, f2cloud_url);
  const f2cloud_url_dec: string = dec(f2cloud_url);
  return await F2Cloud.stream(f2cloud_url_dec);
}

async function movie(id: string): Promise<Stream> {
  const resp: string = await (await fetch(`https://${HOST}/embed/movie/${id}`)).text();
  const data_id: string = (/data-id="(.*?)"/g).exec(resp)![1];
  debug(ID, data_id);
  debug(ID, enc(id));
  return await episode(data_id);
}

async function tv(id: string, s: number = 1, e: number = 1): Promise<Stream> {
  const resp = await (await fetch(`https://${HOST}/embed/tv/${id}/${s}/${e}`)).text();
  const data_id = (/data-id="(.*?)"/g).exec(resp)![1];
  return await episode(data_id);
}

async function test() {
  try {
    const tests: Array<Promise<Stream>> = [movie("385687"), tv("tt0944947", 1, 1), tv("tt1190634", 1, 1)];
    const results = await Promise.all(tests);
    for (const r of results) {
      if (!isJSON(r))
        throw `${JSON.stringify(r)} is not json`;
    }
    log(ID, `${HOST} passed the tests`);
  } catch (e: unknown) {
    error(ID, `${HOST} failed the tests`, (e as Error));
  }
}

export const Vidsrc: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, test, SCRAPE_CONFIG };
