import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, try_stream, get_keys, error } from '../utils.js';
import { F2Cloud } from '../providers/f2cloud.js';
import { FMCloud } from '../providers/fmcloud.js';

export class Watchseries {

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
  static ID = 'WA';

  // watchseries sometimes crashes ... just retry
  static SCRAPE_CONFIG = {
    ID: Watchseries.ID,
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    EXPECTED_KEYS: 19,
    INJECT_URLS: [
      "all.js",
      "scripts.js",
      "embed.js"
    ],
    INIT_URL: "https://watchseriesx.to/tv/the-big-bang-theory-jyr9n",
    BTN_ID: ".movie-btn",
    MAX_TIMEOUT: 3500
  }

  static enc(inp) {
    let keys = get_keys(Watchseries.ALT_HOSTS);
    let a = subst(rc4(keys[2], reverse(mapp(inp, keys[0], keys[1]))));
    a = subst(rc4(keys[5], reverse(mapp(a, keys[3], keys[4]))));
    a = subst(rc4(keys[8], reverse(mapp(a, keys[6], keys[7]))));
    a = subst(a);
    return a;
  }

  static dec(inp) {
    let keys = get_keys(Watchseries.ALT_HOSTS);
    let c = subst_(inp);
    c = mapp(reverse(rc4(keys[8], subst_(c))), keys[7], keys[6])
    c = mapp(reverse(rc4(keys[5], subst_(c))), keys[4], keys[3])
    c = mapp(reverse(rc4(keys[2], subst_(c))), keys[1], keys[0])
    return c;
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

  static async movie(id, server = Watchseries.SERVER_F2CLOUD) {
    return await Watchseries.tv(id, 1, 1, server);
  }

  static async tv(id, s = 1, e = 1, server = Watchseries.SERVER_F2CLOUD) {
    let resp = await (await fetch(`https://${Watchseries.HOST}/tv/${id}/${s}-${e}`)).text();
    let data_id = (/data-id="(.*?)"/g).exec(resp)[1];
    debug(Watchseries.ID, data_id);
    let url = `https://${Watchseries.HOST}/ajax/episode/list/${data_id}?vrf=${encodeURIComponent(Watchseries.enc(data_id))}`;
    debug(Watchseries.ID, url);
    resp = await (await fetch(url)).json();
    data_id = (new RegExp(`${s}-${e}" data-id="(.*?)"`, 'g')).exec(resp["result"])[1];
    return await Watchseries.episode(data_id, server);
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
    try {
      console.log(await Watchseries.tv("the-big-bang-theory-jyr9n", 1, 1));
      let results = (await Watchseries.search("The big bang theory"));
      if (results[0].type == 'tv')
        console.log(await Watchseries.tv(results[0].id, 1, 2));
      else
        console.log(await Watchseries.movie(results[0].id));
      console.log(await Watchseries.movie("movie-vika-online-k3n6m"));
    } catch (e) {
      error(Watchseries.ID, `${Watchseries.HOST} failed`, e);
    }
  }
}
