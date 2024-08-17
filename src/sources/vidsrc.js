import fetch from 'node-fetch';
import { mapp, reverse, rc4, subst, subst_, debug, get_keys, error } from '../utils.js';
import { F2Cloud } from '../providers/f2cloud.js';

export class Vidsrc {

  static HOST = 'vidsrc2.to';
  static ALT_HOSTS = [Vidsrc.HOST, 'vid2v11.site'];
  static ID = 'VIDSRC';

  static SCRAPE_CONFIG = {
    ID: Vidsrc.ID,
    // PlayStation bypasses dev tools detection
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation',
    EXPECTED_KEYS: 19,
    INJECT_URLS: [
      "all.js",
      "embed.js",
      "web.js"
    ],
    INIT_URL: "https://vidsrc2.to/embed/movie/385687",
    BTN_ID: "#btn-play",
    MAX_TIMEOUT: 2500
  }

  static enc(inp) {
    let keys = get_keys(Vidsrc.ALT_HOSTS);
    let a = mapp(subst(rc4(keys[0], reverse(inp))), keys[1], keys[2]);
    a = mapp(reverse(subst(rc4(keys[3], a))), keys[4], keys[5]);
    a = subst(rc4(keys[8], reverse(mapp(a, keys[6], keys[7]))));
    return subst(a);
  }

  static dec(inp) {
    let keys = get_keys(Vidsrc.ALT_HOSTS);
    let a = subst_(inp);
    a = mapp(reverse(rc4(keys[8], subst_(a))), keys[7], keys[6]);
    a = rc4(keys[3], subst_(reverse(mapp(a, keys[5], keys[4]))));
    a = reverse(rc4(keys[0], subst_(mapp(a, keys[2], keys[1]))));
    return a;
  }

  static async episode(data_id) {
    let t = new Date().getTime().toString(16);
    let time_params = `t=${encodeURIComponent(t)}&h=${encodeURIComponent(Vidsrc.enc(t))}`
    debug(Vidsrc.ID, time_params);
    let url = `https://${Vidsrc.HOST}/ajax/embed/episode/${data_id}/sources?token=${encodeURIComponent(Vidsrc.enc(data_id))}&${time_params}`;
    debug(Vidsrc.ID, url);
    let resp = await (await fetch(url)).json();
    // 0 is F2Cloud
    let f2cloud_id = resp['result'][0]['id'];
    debug(Vidsrc.ID, f2cloud_id);
    url = `https://${Vidsrc.HOST}/ajax/embed/source/${f2cloud_id}?token=${encodeURIComponent(Vidsrc.enc(f2cloud_id))}&${time_params}`;
    debug(Vidsrc.ID, url);
    resp = await (await fetch(url)).json();
    let f2cloud_url = resp['result']['url'];
    debug(Vidsrc.ID, f2cloud_url);
    let f2cloud_url_dec = Vidsrc.dec(f2cloud_url);
    debug(Vidsrc.ID, Vidsrc.dec("LTA3S1JhakdoOGJBUFBEVjBUdFZua2tRaEcyQzF0N1ZXU0JreXVuRzJTNWtDbFJJeXV2a1hpeXRQMzVWQjQyUkJrYTJ4NkNxUi1aSEhKM29OMkZ2Y1NWS3NxRXVZUGxaS0JTRXM2OVpzWnZtaVBONDJuM2t5YWhXaXJ5NzMtc05BOG1zNEdGVk5oQmtJVEU5Q2s0eU1Bbm5OUDJBUjFOM1BSZUFmRlppNDlVdko2elJkcEhaaGNpZUJVbTN5amc3djF5V0hqWDZXNHBTVklVX1hjQ3hmbWxINWFHQ3VqSHpoU0JwMnpNOG51bXVxTjU2VDlHcFczaU8xeHlZN0NjQVJxOXJ0azByaDFFYkF6MV8zNEROTlNMaF9iUVRJdFJSY094TW9BTU5ZVWlSOEJKUTJwQTlsZz09"));
    return await F2Cloud.stream(f2cloud_url_dec);
  }

  static async movie(id) {
    let resp = await (await fetch(`https://${Vidsrc.HOST}/embed/movie/${id}`)).text();
    let data_id = (/data-id="(.*?)"/g).exec(resp)[1];
    debug(Vidsrc.ID, data_id);
    debug(Vidsrc.ID, Vidsrc.enc(id));
    return await Vidsrc.episode(data_id);
  }

  static async tv(id, s, e) {
    let resp = await (await fetch(`https://${Vidsrc.HOST}/embed/tv/${id}/${s}/${e}`)).text();
    let data_id = (/data-id="(.*?)"/g).exec(resp)[1];
    return await Vidsrc.episode(data_id);
  }

  static async test() {
    try {
      console.log(await Vidsrc.movie("385687"));
      console.log(await Vidsrc.tv("tt0944947", 1, 1));
      console.log(await Vidsrc.tv("tt1190634", 1, 1));
      console.log(await Vidsrc.tv("60059", 1, 1));
    } catch (e) {
      error(Vidsrc.ID, `Vidsrc failed`, e);
    }
  }
}
