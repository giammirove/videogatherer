import fetch from 'node-fetch';
import { Source, Stream, ServerListItem, try_stream, isJSON, log, error, debug } from '../utils.js';
import { UpCloud } from '../providers/upcloud.js';

type EpisodeJson = {
  link: string;
}

type MovieJson = {
  link: string;
}

const HOST = 'flixhq.to';
const ALT_HOSTS = [HOST];
const SERVER_UPCLOUD: string = 'UpCloud';
const SERVER_VIDCLOUD: string = 'Vidcloud';
const SERVER_UPSTREAM: string = 'Upstream';
const SERVERS: Array<ServerListItem> = [
  { id: SERVER_UPCLOUD, handler: UpCloud },
  { id: SERVER_VIDCLOUD, handler: UpCloud },
  { id: SERVER_UPSTREAM, handler: UpCloud },
];
const ID = "FH";

async function episode(data_id: string, server = SERVER_UPCLOUD): Promise<Stream> {
  let url = `https://${HOST}/ajax/episode/servers/${data_id}`;
  const resp: string = (await (await fetch(url)).text()).replace(/\n/g, '');
  const new_data_id = (new RegExp(`data-id="(.*?)".*title=".*?${server}"`, 'g')).exec(resp)![1];
  url = `https://${HOST}/ajax/episode/sources/${new_data_id}`;
  const json_data: EpisodeJson = await (await fetch(url)).json() as EpisodeJson;
  return await try_stream(SERVERS, server, json_data.link);
};

async function movie(id: string, server = SERVER_UPCLOUD) {
  let movie_id = id.split("-").at(-1);
  let url = `https://${HOST}/ajax/episode/list/${movie_id}`;
  const resp = (await (await fetch(url)).text()).replace(/\n/g, '');
  movie_id = (new RegExp(`data-linkid="(.*?)".*title="${server}"`, 'gs')).exec(resp)![1];
  url = `https://${HOST}/ajax/episode/sources/${movie_id}`;
  const json_data = await (await fetch(url)).json() as MovieJson;
  return await try_stream(SERVERS, server, json_data.link);
}

async function tv(id: string, s: number = 1, e: number = 1, server = SERVER_UPCLOUD) {
  const tv_id = id.split("-").at(-1);
  let resp = await (await fetch(`https://${HOST}/ajax/season/list/${tv_id}`)).text();
  let data_id = (/data-id="(.*?)"/gm).exec(resp)![s];
  resp = await (await fetch(`https://${HOST}/ajax/season/episodes/${data_id}`)).text();
  data_id = (/data-id="(.*?)"/gm).exec(resp)![e];
  return await episode(data_id, server);
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

