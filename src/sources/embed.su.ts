import fetch from 'node-fetch';
import fs from 'fs';
import vm from 'node:vm';
// YOU SHOULD NEVER USE THIS ... anyway
import browserEnv from "browser-env";
browserEnv();
let js_context = vm.createContext(globalThis)


import { mapp, reverse, rc4, subst, subst_, debug, get_keys, error, log, isJSON, get_encrypt_order, enc_with_order, dec_with_order, ScrapeConfig, Stream, Source, ServerListItem, TransformText } from '../utils.js';

const HOST: string = 'embed.su';
const ALT_HOSTS: Array<string> = [HOST];
const ID: string = 'EMS';

type EpisodeJson = {
  source: string,
  format: string,
  subtitles: [
    { label: string, file: string }
  ]
}
type VConfig = {
  title: string,
  server: string,
  hash: string,
  referer: string,
  xid: string,
  episodeId: string,
  captchaKey: string,
  v: string,
  uwuId: string,
}
type EmbedSuSrc = {
  name: string,
  hash: string
}

const SCRAPE_CONFIG: ScrapeConfig = {
  ID: ID,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36;',
  EXPECTED_KEYS: 0,
  INJECT_URLS: [
  ],
  // input of encrypt function
  ENTRY: new RegExp(''),
  // output of encrypt function
  OUT: new RegExp(''),
  INIT_URL: `https://${HOST}/embed/movie/385687`,
  BTN_ID: "",
  MAX_TIMEOUT: 2500
}

const SERVERS: Array<ServerListItem> = [
];

const HEADERS = {
  Referer: `https://${HOST}`
}

function dec(inp: string): any {
  let b: any = atob(inp).split(".").map(a => {
    return a.split("").reverse().join("");
  });
  b = JSON.parse(atob(b.join("").split("").reverse().join("")));
  //let c = {
  //  servers: b.map(a: any => {
  //    return { ...a, default: a.name === window.vConfig.server };
  //  }), title: window.vConfig.title, id: window.vConfig.episodeId, poster: window.vConfig.poster
  //};
  return b;
  //if (location.pathname.includes("/tv/") && a.season && a.episode) {
  //  c = { ...c, currentSeason: a.season, currentEpisode: a.episode, seasons: vConfig.seasons };
  //}

}

async function episode(hash: string): Promise<Stream> {
  const servers: Array<EmbedSuSrc> = dec(hash);
  const server: EmbedSuSrc = servers[0];
  const url: string = `https://${HOST}/api/e/${server.hash}`;
  debug(ID, url);
  const resp = await (await fetch(url, { headers: HEADERS })).json() as EpisodeJson;
  return { stream: resp.source, subtitles: resp.subtitles } as Stream;
}

// movie and tv
async function item(url: string): Promise<Stream> {
  const resp = (await (await fetch(url, { headers: HEADERS })).text()).replaceAll('\n', '').replaceAll('\r', '');
  const script = (/<script>(.*?)<\/script>/gm).exec(resp)![1];
  try {
    vm.runInContext(script, js_context);
  } catch (e) {
  }
  const config: VConfig = js_context['window']['vConfig'];
  debug(ID, config.hash);
  return await episode(config.hash);
}

async function movie(id: string): Promise<Stream> {
  const url = `https://${HOST}/embed/movie/${id}`;
  return item(url);
}

async function tv(id: string, s: number = 1, e: number = 1): Promise<Stream> {
  const url = `https://${HOST}/embed/tv/${id}/${s}/${e}`;
  return item(url);
}

async function test() {
  try {
    const tests: Array<Promise<Stream>> = [movie("385687"), tv("tt0944947", 1, 1), tv("tt1190634", 1, 1)];
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

export const EmbedSu: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, test, SCRAPE_CONFIG };
