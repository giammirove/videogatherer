import fetch from 'node-fetch';

import { Source, Stream, ServerListItem, isJSON, log, error, debug, rc4, NO_STREAM_ERROR, Subtitle } from '../utils.js';
import { UpCloud } from '../providers/upcloud.js';

type ServerJson = {
  name: string,
  hash: string
}
type ServersJson = {
  data: Array<ServerJson>,
  success: boolean
}
type SourceJson = {
  data: {
    source: string,
    subtitles: Array<Subtitle>,
    format: string
  },
  success: boolean
}

const HOST = 'vidsrc.cc';
const ALT_HOSTS = [HOST];
const SERVER_UPCLOUD: string = 'UpCloud';
const SERVERS: Array<ServerListItem> = [
  { id: SERVER_UPCLOUD, handler: UpCloud },
];
const ID = "VSC";

function enc(input: string): string {
  return encodeURIComponent(btoa(rc4("NGWOrkeQxUHlD4wIGp4l", input)));
}

async function episode(postfix: string, id: string, _server = SERVER_UPCLOUD): Promise<Stream> {
  const url: string = `https://${HOST}/v2/embed/${postfix}`;
  debug(ID, url);
  const res = await (await fetch(url)).text();
  const new_data_id = (new RegExp(`data-id="(.*?)" data-number=`, 'g')).exec(res)![1];
  const v_value = (new RegExp(`var v = "(.*?)"`, 'g')).exec(res)![1];
  debug(ID, new_data_id);
  const api_url = `https://${HOST}/api/episodes/${new_data_id}/servers?id=${id}&isMobile=false&v=${encodeURIComponent(v_value)}&vrf=${encodeURIComponent(enc(id))}`;
  debug(ID, api_url);
  const res2: ServersJson = await (await fetch(api_url)).json() as ServersJson;
  const server_hash: ServerJson | undefined = res2.data.find(v => v.name == _server);
  debug(ID, server_hash.hash);
  if (server_hash == undefined)
    throw NO_STREAM_ERROR;
  const embed_url = `https://${HOST}/api/source/${server_hash.hash}?init=true`;
  debug(ID, embed_url);
  const res3: SourceJson = await (await fetch(embed_url)).json() as SourceJson;
  if (res3.success == false)
    throw NO_STREAM_ERROR;
  debug(ID, res3.data.source)
  return { stream: res3.data.source, subtitles: res3.data.subtitles } as Stream;
};

async function movie(id: string, _server?: string): Promise<Stream> {
  debug(ID, id);
  return episode(`movie/${id}`, id, _server);
}

async function tv(id: string, s: number = 1, e: number = 1, _server?: string): Promise<Stream> {
  debug(ID, id);
  return episode(`tv/${id}/${s}/${e}`, id, _server);
}

async function test() {
  try {
    const tests = [movie("385687"), tv('tt0944947', 1, 1)];
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

export const VidsrcCC: Source = { HOST, ALT_HOSTS, SERVERS, ID, movie, tv, test };

