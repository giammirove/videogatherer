import fetch from 'node-fetch';
import { error, debug, isJSON, log, Source, try_stream } from '../utils.js';
import { MegaCloudRabbitStream } from '../providers/megacloudrabbitstream.js';
import { UpCloud } from '../providers/upcloud.js';

type EpisodeJson = {
  link: string;
}

type MovieJson = {
  link: string;
}

const HOST = 'myflixerz.to';
const ALT_HOSTS = [HOST];
const SERVER_UPCLOUD = 'UpCloud';
const SERVER_MEGACLOUD = 'MegaCloud';
const SERVER_UPSTREAM = 'Upstream';
const SERVERS = [
  { id: SERVER_UPCLOUD, handler: MegaCloudRabbitStream },
  { id: SERVER_MEGACLOUD, handler: MegaCloudRabbitStream },
  { id: SERVER_UPSTREAM, handler: UpCloud },
]
const ID = "FE";

async function episode(data_id: string, server: string = SERVER_UPCLOUD) {
  let url = `https://${HOST}/ajax/episode/servers/${data_id}`;
  const resp = (await (await fetch(url)).text()).replace(/\n/g, '');
  const new_data_id = (new RegExp(`data-id="(.*?)".*title=".*?${server}"`, 'gms')).exec(resp)![1];
  url = `https://${HOST}/ajax/episode/sources/${new_data_id}`;
  const json_data = await (await fetch(url)).json() as EpisodeJson;
  return await try_stream(SERVERS, server, json_data.link);
}

async function movie(id: string, server: string = SERVER_UPCLOUD) {
  let movie_id = id.split("-").at(-1);
  let url = `https://${HOST}/ajax/episode/list/${movie_id}`;
  const resp = (await (await fetch(url)).text()).replace(/\n/g, '');
  movie_id = (new RegExp(`data-linkid="(.*?)".*title="${server}"`, 'gs')).exec(resp)![1];
  url = `https://${HOST}/ajax/episode/sources/${movie_id}`;
  const json_data = await (await fetch(url)).json() as MovieJson;
  return await try_stream(SERVERS, server, json_data.link);
}

async function tv(id: string, s: number = 1, e: number = 1, server: string = SERVER_UPCLOUD) {
  const tv_id = id.split("-").at(-1)!.split(".").at(0);
  let resp = await (await fetch(`https://${HOST}/ajax/season/list/${tv_id}`)).text();
  let data_id = (/data-id="(.*?)"/gm).exec(resp)![s];
  resp = await (await fetch(`https://${HOST}/ajax/season/episodes/${data_id}`)).text();
  data_id = (/data-id="(.*?)"/gm).exec(resp)![e];
  return await episode(data_id, server);
}

async function test() {
  try {
    const tests = [movie("watch-the-pastor-111166"), tv("the-big-bang-theory-39508.4857451", 1, 1, SERVER_UPSTREAM)];
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

export const Myflixerz: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, test };

