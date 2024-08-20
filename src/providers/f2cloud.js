import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, get_keys } from '../utils.js';

export class F2Cloud {

  // alternative hosts
  static ALT_HOSTS = ["vid2faf.site", "vid2v11.site"];
  static ID = "F2";

  static enc(inp) {
    let keys = get_keys(this.ALT_HOSTS);
    let a = mapp(inp, keys[0], keys[1]);
    a = reverse(a);
    a = rc4(keys[2], a);
    a = subst(a);
    a = reverse(a);
    a = mapp(a, keys[3], keys[4]);
    a = rc4(keys[5], a);
    a = subst(a);
    a = rc4(keys[6], a);
    a = subst(a);
    a = reverse(a);
    a = mapp(a, keys[7], keys[8]);
    a = subst(a);
    return a;
  }

  static dec(inp) {
    let keys = get_keys(this.ALT_HOSTS);
    let a = subst_(inp);
    a = mapp(a, keys[8], keys[7]);
    a = reverse(a);
    a = subst_(a);
    a = rc4(keys[6], a);
    a = subst_(a);
    a = rc4(keys[5], a);
    a = mapp(a, keys[4], keys[3]);
    a = reverse(a);
    a = subst_(a);
    a = rc4(keys[2], a);
    a = reverse(a);
    a = mapp(a, keys[1], keys[0]);
    return a;
  }

  static async stream(url) {
    url = new URL(url);
    const embed_id = url.pathname.split("/")[2];
    debug(this.ID, embed_id);
    const mediainfo_url = `https://${url.host}/mediainfo/${this.enc(embed_id)}${url.search}&ads=0`;
    debug(this.ID, mediainfo_url);
    const resp = await (await fetch(mediainfo_url)).json();
    debug(this.ID, JSON.stringify(resp));
    const playlist = this.dec(resp['result'])?.replace(/\\\//g, "/");
    debug(this.ID, playlist);
    return JSON.parse(playlist);
  }
}
