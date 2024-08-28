import fetch from 'node-fetch';
import { Source, Stream, ServerListItem, try_stream, isJSON, log, error, debug } from '../utils.js';

type EpisodeJson = {
  link: string;
}

type MovieJson = {
  link: string;
}

const HOST = 'viewvault.org';
const ALT_HOSTS = [HOST];
const SERVERS: Array<ServerListItem> = [
];
const ID = "FH";

async function episode(data_id: string, _server?: string): Promise<Stream> {
  let url = `https://${HOST}/ajax/episode/servers/${data_id}`;
  const resp: string = (await (await fetch(url)).text()).replace(/\n/g, '');
  const new_data_id = (new RegExp(`data-id="(.*?)".*title=".*?${_server}"`, 'g')).exec(resp)![1];
  url = `https://${HOST}/ajax/episode/sources/${new_data_id}`;
  const json_data: EpisodeJson = await (await fetch(url)).json() as EpisodeJson;
  return await try_stream(SERVERS, _server, json_data.link);
};

async function movie(id: string, _server?: string) {
  let movie_id = id.split("-").at(-1);
  let url = `https://${HOST}/ajax/episode/list/${movie_id}`;
  const resp = (await (await fetch(url)).text()).replace(/\n/g, '');
  movie_id = (new RegExp(`data-linkid="(.*?)".*title="${_server}"`, 'gs')).exec(resp)![1];
  url = `https://${HOST}/ajax/episode/sources/${movie_id}`;
  const json_data = await (await fetch(url)).json() as MovieJson;
  return await try_stream(SERVERS, _server, json_data.link);
}

async function tv(id: string, s: number = 1, e: number = 1, _server?: string) {
  const url = `https://${HOST}/episode/${id}/${s}-${e}`;
  const resp = await (await fetch(url)).text();
  let data_id = (/data-id="(.*?)"/gm).exec(resp)![s];
  const resp2 = await (await fetch(`https://${HOST}/ajax/season/episodes/${data_id}`)).text();
  data_id = (/data-id="(.*?)"/gm).exec(resp2)![e];
  return await episode(data_id, _server);
}

async function test() {
  try {
    const tests = [movie("watch-the-pastor-111166"), tv("watch-the-big-bang-theory-39508", 1, 1)];
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

export const FlixHQ: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, test };

