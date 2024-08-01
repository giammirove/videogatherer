/*
 * So yes it is JS and not Typescript ... bite me 
 */

import fetch from 'node-fetch';
import RabbitStream from './rabbitstream.js'
import { general_enc, general_dec, try_stream, get_keys } from './utils.js';

class F2Cloud {

  // alternative hosts
  static ALT_HOSTS = ["vid2faf.site"];

  static embed_enc(inp) {
    return general_enc(get_keys(F2Cloud.ALT_HOSTS)[0], inp);
  }

  static h_enc(inp) {
    return general_enc(get_keys(F2Cloud.ALT_HOSTS)[1], inp);
  }

  static embed_dec(inp) {
    return general_dec(get_keys(F2Cloud.ALT_HOSTS)[2], inp);
  }

  static async stream(url) {
    url = new URL(url);
    const embed_id = url.pathname.split("/")[2];
    const h = F2Cloud.h_enc(embed_id);
    const mediainfo_url = `https://${url.host}/mediainfo/${F2Cloud.embed_enc(embed_id)}${url.search}&ads=0&h=${encodeURIComponent(h)}`;
    const resp = await (await fetch(mediainfo_url)).json();
    const playlist = F2Cloud.embed_dec(resp['result']).replace(/\\\//g, "/");
    return JSON.parse(playlist);
  }
}

class FMCloud {
  static async stream(url) {
    const resp = (await (await fetch(url)).text());
    const reg = new RegExp(/<script.*?>(.*?)<\/script>/gms);
    let script = reg.exec(resp.match(reg).at(-1))[1];
    script = eval(script.replace('eval', ''));
    const sources = "{" + (/videop.setup\(\{(.*?)\}\);/gms).exec(script)[1] + "}";
    const data = eval(`let s = ${sources}; s`);
    return data;
  }
}

class UpCloud {
  static async stream(url) {
    const id = url.split("/").at(-1).split("?").at(0);
    return await RabbitStream.stream(id);
  }
}


class Vidsrc {

  static HOST = 'vidsrc.to';
  static ALT_HOSTS = [Vidsrc.HOST];

  static enc(inp) {
    return general_enc(get_keys(Vidsrc.ALT_HOSTS)[0], inp);
  }

  static dec(inp) {
    return general_dec(get_keys(Vidsrc.ALT_HOSTS)[0], inp);
  }

  static async episode(data_id) {
    let url = `https://${Vidsrc.HOST}/ajax/embed/episode/${data_id}/sources?token=${encodeURIComponent(Vidsrc.enc(data_id))}`;
    let resp = await (await fetch(url)).json();
    // 0 is F2Cloud
    let f2cloud_id = resp['result'][0]['id'];
    url = `https://${Vidsrc.HOST}/ajax/embed/source/${f2cloud_id}?token=${encodeURIComponent(Vidsrc.enc(f2cloud_id))}`;
    resp = await (await fetch(url)).json();
    let f2cloud_url = resp['result']['url'];
    let f2cloud_url_dec = Vidsrc.dec(f2cloud_url);
    return await F2Cloud.stream(f2cloud_url_dec);
  }

  static async movie(id) {
    let resp = await (await fetch(`https://${Vidsrc.HOST}/embed/movie/${id}`)).text();
    let data_id = (/data-id="(.*?)"/g).exec(resp)[1];
    return await Vidsrc.episode(data_id);
  }

  static async tv(id, s, e) {
    let resp = await (await fetch(`https://${Vidsrc.HOST}/embed/tv/${id}/${s}/${e}`)).text();
    let data_id = (/data-id="(.*?)"/g).exec(resp)[1];
    return await Vidsrc.episode(data_id);
  }

  static async test() {
    console.log(await Vidsrc.movie("385687"));
    console.log(await Vidsrc.tv("tt0944947", 1, 1));
    console.log(await Vidsrc.tv("tt1190634", 1, 1));
    console.log(await Vidsrc.tv("60059", 1, 1));
  }
}

class Watchseries {

  static HOST = 'watchseriesx.to';
  static ALT_HOSTS = [Watchseries.HOST];
  static SERVER_F2CLOUD = 41;
  static SERVER_MEGACLOUD = 28;
  static SERVER_FMCLOUD = 45;
  static SERVERS = [
    { id: Watchseries.SERVER_F2CLOUD, handler: F2Cloud },
    { id: Watchseries.SERVER_MEGACLOUD, handler: F2Cloud },
    { id: Watchseries.SERVER_FMCLOUD, handler: FMCloud },
  ]

  static enc(inp) {
    return general_enc(get_keys(Watchseries.ALT_HOSTS)[0], inp);
  }

  static dec(inp) {
    return general_dec(get_keys(Watchseries.ALT_HOSTS)[1], inp);
  }

  static async episode(data_id, server = Watchseries.SERVER_F2CLOUD) {
    let url = `https://${Watchseries.HOST}/ajax/server/list/${data_id}?vrf=${encodeURIComponent(Watchseries.enc(data_id))}`;
    let resp = await (await fetch(url)).json();
    data_id = (new RegExp(`data-id="${server}" data-link-id="(.*?)"`)).exec(resp["result"])[1];
    url = `https://${Watchseries.HOST}/ajax/server/${data_id}?vrf=${encodeURIComponent(Watchseries.enc(data_id))}`;
    resp = await (await fetch(url)).json();
    let url_dec = Watchseries.dec(resp["result"]["url"]);
    return await try_stream(Watchseries.SERVERS, server, url_dec);
  }

  static async movie(id) {
    return await Watchseries.tv(id, 1, 1);
  }

  static async tv(id, s = 1, e = 1) {
    let resp = await (await fetch(`https://${Watchseries.HOST}/tv/${id}/${s}-${e}`)).text();
    let data_id = (/data-id="(.*?)"/g).exec(resp)[1];
    resp = await (await fetch(`https://${Watchseries.HOST}/ajax/episode/list/${data_id}?vrf=${encodeURIComponent(Watchseries.enc(data_id))}`)).json();
    data_id = (new RegExp(`${s}-${e}" data-id="(.*?)"`, 'g')).exec(resp["result"])[1];
    return await Watchseries.episode(data_id);
  }

  static async search(query) {
    let url = `https://${Watchseries.HOST}/filter?keyword=${query}`;
    let resp = await (await fetch(url)).text();
    let results = resp.match(new RegExp(`<a href=".*?" class="title">.*?</a>`, 'g'));
    let ret = [];
    for (let r of results) {
      let [, type, id, title] = (new RegExp(`href="/(.*?)/(.*?)" .*>(.*?)</a>`)).exec(r);
      ret.push({ type, title, id });
    }
    return ret;
  }

  static async test() {
    console.log(await Watchseries.movie("vika-k3n6m"));
    console.log(await Watchseries.tv("the-big-bang-theory-jyr9n", 1, 2));
    let results = (await Watchseries.search("The big bang theory"));
    if (results[0].type == 'tv')
      console.log(await Watchseries.tv(results[0].id, 1, 2));
    console.log(await Watchseries.movie(results[0].id));
  }
}


class FlixHQ {

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

async function main() {
  /* not working in date 01-08-2024 */
  //Vidsrc.test();
  Watchseries.test();
  FlixHQ.test();
}

main();
