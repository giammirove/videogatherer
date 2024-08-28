import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, try_stream, get_keys, error, isJSON, log, enc_with_order, dec_with_order, get_encrypt_order, ServerListItem, ScrapeConfig, Stream, SearchResult, SearchResultType, Source, TransformText } from '../utils.js';
import { UpCloud } from '../providers/upcloud.js';

type EpisodeListJson = {
  result: string
}
type EpisodeJson = {
  data: {
    link: string
  };
}

const HOST: string = 'vidstream.to';
const ALT_HOSTS: Array<string> = [HOST];
const SERVER_UPCLOUD: string = 'UpCloud';
const SERVERS: Array<ServerListItem> = [
  { id: SERVER_UPCLOUD, handler: UpCloud },
];
const ID: string = 'VDT';

// watchseries sometimes crashes ... just retry
const SCRAPE_CONFIG: ScrapeConfig = {
  ID: ID,
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36, Playstation',
  EXPECTED_KEYS: 0,
  INJECT_URLS: [
  ],
  // input of encrypt function
  ENTRY: new RegExp(''),
  // output of encrypt function
  OUT: new RegExp(''),
  INIT_URL: ``,
  BTN_ID: "",
  MAX_TIMEOUT: 3500
}

async function episode(data_id: string, server: string = SERVER_UPCLOUD): Promise<Stream> {
  const url: string = `https://${HOST}/ajax/movie/episode/servers/${data_id}`;
  const resp = await (await fetch(url)).text();
  const new_data_id = (new RegExp(`data-id="(.*?)".*${server}.*?<\/a>`)).exec(resp)![1];
  debug(ID, new_data_id);
  const url2 = `https://${HOST}/ajax/movie/episode/server/sources/${new_data_id}`;
  const resp2 = await (await fetch(url2)).json() as EpisodeJson;
  debug(ID, resp2.data.link);
  return await try_stream(SERVERS, server, resp2.data.link);
}

async function movie(id: string, server: string = SERVER_UPCLOUD): Promise<Stream> {
  const url = `https://${HOST}/watch-movie/${id}`;
  const redirect = await fetch(url, { redirect: 'manual' });
  debug(ID, redirect.headers.get("location"));
  const new_url = redirect.headers.get("location");
  const new_id = new_url.split("/").at(-1);
  return await episode(new_id, server);
}

async function tv(id: string, s: number = 1, e: number = 1, server: string = SERVER_UPCLOUD): Promise<Stream> {
  debug(ID, id);
  const real_id = id.split("-").at(-1);
  const seasons_url = `https://${HOST}/ajax/movie/seasons/${real_id}`;
  const resp_seasons = await (await fetch(seasons_url)).text();
  const season_id = (/data-id="(.*?)"/g).exec(resp_seasons)![s];
  debug(ID, season_id);

  const episodes_url = `https://${HOST}/ajax/movie/season/episodes/${season_id}`;
  const resp_episodes = await (await fetch(episodes_url)).text();
  const episode_id = (/data-id="(.*?)"/g).exec(resp_episodes)![e];
  debug(ID, episode_id);
  return await episode(episode_id, server);
}

async function search(query: string): Promise<Array<SearchResult>> {
  const url: string = `https://${HOST}/search?keyword=${encodeURIComponent(query)}`;
  const resp: string = await (await fetch(url)).text();
  const results = resp.match(new RegExp(`<a href=".*?" title=".*?">`, 'gm'))!;
  const ret: Array<SearchResult> = [];
  for (const r of results) {
    const [, type_raw, id, title] = (new RegExp(`href="/(.*?)/(.*?)" title="(.*?)"`)).exec(r)!;
    let type: SearchResultType = 'tv';
    if (type_raw !== 'watch-series')
      type = 'movie';
    const item: SearchResult = { type, title, id };
    ret.push(item);
  }
  return ret;
}

async function test() {
  try {
    const tests: Array<Promise<Stream>> = [tv("watch-the-big-bang-theory-39508", 1, 1), movie("watch-the-lord-of-the-rings-16510")];
    const results = await Promise.all(tests);
    for (const r of results) {
      if (!isJSON(r))
        throw `${JSON.stringify(r)} is not json`;
    }
    const results2: Array<SearchResult> = await search("the big bang theory tv series");
    if (results2[0].type == 'tv') {
      const r = (await tv(results2[0].id, 1, 1));
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

export const VidStream: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, search, SCRAPE_CONFIG, test };

