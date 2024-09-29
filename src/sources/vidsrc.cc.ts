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
type ItemType = 'tv' | 'movie';

const HOST = 'vidsrc.cc';
const ALT_HOSTS = [HOST];
const SERVER_UPCLOUD: string = 'UpCloud';
const SERVER_VIDCLOUD: string = 'VidCloud';
const SERVERS: Array<ServerListItem> = [
  { id: SERVER_UPCLOUD, handler: UpCloud },
];
const ID = "VSC";
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';

function enc(input: string): string {
  let key = "78B22E5E862BC";
  return encodeURIComponent(btoa(btoa(rc4(key, input))));
}

async function episode(id: string, type: ItemType = 'tv', s: number = 1, e: number = 1, _server = SERVER_VIDCLOUD): Promise<Stream> {
  const postfix: string = type == 'tv' ? `tv/${id}/${s}/${e}` : `movie/${id}`;
  const url: string = `https://${HOST}/v2/embed/${postfix}`;
  debug(ID, url);
  const res = await (await fetch(url, {
    headers: {
      'Host': HOST,
      'User-Agent': USER_AGENT,
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'iframe',
      'Referer': HOST,
    }
  })).text();
  const new_data_id = (new RegExp(`data-id="(.*?)" data-number=`, 'g')).exec(res)![1];
  debug(ID, new_data_id);
  const v_value = (new RegExp(`var v = "(.*?)"`, 'g')).exec(res)![1];
  debug(ID, `v value: ${v_value}`);
  const vrf = encodeURIComponent(enc(id));
  debug(ID, `vrf: ${vrf}`);
  const api_url = `https://${HOST}/api/episodes/${new_data_id}/servers?id=${id}&season=${s}&episode=${e}&type=${type}&isMobile=false&v=${encodeURIComponent(v_value)}&vrf=${vrf}`;
  debug(ID, api_url);
  const res2: ServersJson = await (await fetch(api_url, {
    headers: {
      'Host': HOST,
      'User-Agent': USER_AGENT,
      'Referer': HOST,
    }
  }
  )).json() as ServersJson;
  const server_hash: ServerJson | undefined = res2.data.find(v => v.name == _server);
  debug(ID, `server hash: ${server_hash.hash}`);
  if (server_hash == undefined)
    throw NO_STREAM_ERROR;
  // not used at the moment ... it could be useful in the future
  const key = encodeURIComponent(btoa(id + "-" + new_data_id));
  debug(ID, `key: ${key}`);
  const embed_url = `https://${HOST}/api/source/${server_hash.hash}`;
  debug(ID, `embed url: ${embed_url}`);
  const res3: SourceJson = await (await
    fetch(embed_url, {
      headers: {
        'Host': HOST,
        'User-Agent': USER_AGENT,
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
      }
    })
  ).json() as SourceJson;
  if (res3.success == false)
    throw NO_STREAM_ERROR;
  debug(ID, res3.data.source)
  return { stream: res3.data.source, subtitles: res3.data.subtitles } as Stream;
};

async function movie(id: string, _server?: string): Promise<Stream> {
  debug(ID, id);
  return episode(id, 'movie', 1, 1, _server);
}

async function tv(id: string, s: number = 1, e: number = 1, _server?: string): Promise<Stream> {
  debug(ID, id);
  return episode(id, 'tv', s, e, _server);
}

async function test() {
  try {
    //const tests = [movie("385687"), tv('tt0944947', 2, 3)];
    const tests = [tv('tt0944947', 2, 3)];
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

