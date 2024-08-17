import fetch from 'node-fetch';
import { try_stream } from '../utils.js';
import { UpCloud } from '../providers/upcloud.js';

export class FlixHQ {

  static HOST = 'flixhq.to';
  static SERVER_UPCLOUD = 'UpCloud';
  static SERVER_VIDCLOUD = 'Vidcloud';
  static SERVER_UPSTREAM = 'Upstream';
  static SERVERS = [
    { id: FlixHQ.SERVER_UPCLOUD, handler: UpCloud },
    { id: FlixHQ.SERVER_VIDCLOUD, handler: UpCloud },
    { id: FlixHQ.SERVER_UPSTREAM, handler: UpCloud },
  ]

  static async episode(data_id, server = FlixHQ.SERVER_UPCLOUD) {
    let url = `https://${FlixHQ.HOST}/ajax/episode/servers/${data_id}`;
    let resp = (await (await fetch(url)).text()).replace(/\n/g, '');
    data_id = (new RegExp(`data-id="(.*?)".*title=".*?${server}"`, 'g')).exec(resp)[1];
    url = `https://${FlixHQ.HOST}/ajax/episode/sources/${data_id}`;
    resp = await (await fetch(url)).json();
    return await try_stream(FlixHQ.SERVERS, server, resp.link);
  }

  static async movie(id, server = FlixHQ.SERVER_UPCLOUD) {
    let movie_id = id.split("-").at(-1);
    let url = `https://${FlixHQ.HOST}/ajax/episode/list/${movie_id}`;
    let resp = (await (await fetch(url)).text()).replace(/\n/g, '');
    movie_id = (new RegExp(`data-linkid="(.*?)".*title="${server}"`, 'gs')).exec(resp)[1];
    url = `https://${FlixHQ.HOST}/ajax/episode/sources/${movie_id}`;
    resp = await (await fetch(url)).json();
    return await try_stream(FlixHQ.SERVERS, server, resp.link);
  }

  static async tv(id, s = 1, e = 1, server = FlixHQ.SERVER_UPCLOUD) {
    const tv_id = id.split("-").at(-1);
    let resp = await (await fetch(`https://${FlixHQ.HOST}/ajax/season/list/${tv_id}`)).text();
    let data_id = (/data-id="(.*?)"/gms).exec(resp)[s];
    resp = await (await fetch(`https://${FlixHQ.HOST}/ajax/season/episodes/${data_id}`)).text();
    data_id = (/data-id="(.*?)"/gms).exec(resp)[e];
    return await FlixHQ.episode(data_id, server);
  }

  static async test() {
    console.log(await FlixHQ.movie("watch-the-pastor-111166"));
    console.log(await FlixHQ.tv("watch-the-big-bang-theory-39508", 1, 1));
  }
}

class Superembed {
  static USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

  static async stream(url, args = { Referer: "" }) {
    let res = {};
    do {
      res = await fetch(url, {
        headers: {
          'User-Agent': Superembed.USER_AGENT,
          'Referer': args['Referer']
        },
        redirect: 'manual'
      });
      url = res.headers.get('location');
    } while (url != null);
    let body = await res.text();
    const script = (/<script>(.*?eval.*?)<\/script>/gms).exec(body)[1]?.replace("eval(", "(");
    const evalScript = eval(script).replace("var player = new Playerjs(", "").slice(0, -2);
    const data = eval(`let d = ${evalScript}; d`);
    return data;
  }
}
