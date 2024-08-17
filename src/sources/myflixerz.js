import fetch from 'node-fetch';
import { try_stream } from '../utils.js';
import { MegaCloudRabbitStream } from '../providers/megacloudrabbitstream.js';
import { UpCloud } from '../providers/upcloud.js';

export class Myflixerz {

  static HOST = 'myflixerz.to';
  static SERVER_UPCLOUD = 'UpCloud';
  static SERVER_MEGACLOUD = 'MegaCloud';
  static SERVER_UPSTREAM = 'Upstream';
  static SERVERS = [
    { id: Myflixerz.SERVER_UPCLOUD, handler: MegaCloudRabbitStream },
    { id: Myflixerz.SERVER_MEGACLOUD, handler: MegaCloudRabbitStream },
    { id: Myflixerz.SERVER_UPSTREAM, handler: UpCloud },
  ]

  static async episode(data_id, server = Myflixerz.SERVER_UPCLOUD) {
    let url = `https://${Myflixerz.HOST}/ajax/episode/servers/${data_id}`;
    let resp = (await (await fetch(url)).text()).replace(/\n/g, '');
    data_id = (new RegExp(`data-id="(.*?)".*title=".*?${server}"`, 'gms')).exec(resp)[1];
    url = `https://${Myflixerz.HOST}/ajax/episode/sources/${data_id}`;
    resp = await (await fetch(url)).json();
    return await try_stream(Myflixerz.SERVERS, server, resp.link);
  }

  static async movie(id, server = Myflixerz.SERVER_UPCLOUD) {
    let movie_id = id.split("-").at(-1);
    let url = `https://${Myflixerz.HOST}/ajax/episode/list/${movie_id}`;
    let resp = (await (await fetch(url)).text()).replace(/\n/g, '');
    movie_id = (new RegExp(`data-linkid="(.*?)".*title="${server}"`, 'gs')).exec(resp)[1];
    url = `https://${Myflixerz.HOST}/ajax/episode/sources/${movie_id}`;
    resp = await (await fetch(url)).json();
    return await try_stream(Myflixerz.SERVERS, server, resp.link);
  }

  static async tv(id, s = 1, e = 1, server = Myflixerz.SERVER_UPCLOUD) {
    const tv_id = id.split("-").at(-1).split(".").at(0);
    let resp = await (await fetch(`https://${Myflixerz.HOST}/ajax/season/list/${tv_id}`)).text();
    let data_id = (/data-id="(.*?)"/gms).exec(resp)[s];
    resp = await (await fetch(`https://${Myflixerz.HOST}/ajax/season/episodes/${data_id}`)).text();
    data_id = (/data-id="(.*?)"/gms).exec(resp)[e];
    return await Myflixerz.episode(data_id, server);
  }

  static async test() {
    console.log(await Myflixerz.movie("watch-the-pastor-111166"));
    console.log(await Myflixerz.tv("the-big-bang-theory-39508.4857451", 1, 1, Myflixerz.SERVER_UPSTREAM));
  }
}
