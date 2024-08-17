import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, general_enc, get_keys } from '../utils.js';

export class F2Cloud {

  // alternative hosts
  static ALT_HOSTS = ["vid2faf.site", "vid2v11.site"];
  static ID = "F2";

  static embed_enc(inp) {
    let keys = get_keys(F2Cloud.ALT_HOSTS);
    let a = mapp(subst(rc4(keys[0], inp)), keys[1], keys[2]);
    a = subst(rc4(keys[5], mapp(reverse(a), keys[3], keys[4])))
    a = subst(rc4(keys[6], reverse(a)))
    a = subst(reverse(mapp(a, keys[7], keys[8])))
    return a;
  }

  static h_enc(inp) {
    let keys = get_keys(F2Cloud.ALT_HOSTS);
    debug(F2Cloud.ID, keys, inp);
    return general_enc(keys[9], inp);
  }

  static embed_dec(inp) {
    let keys = get_keys(F2Cloud.ALT_HOSTS);
    let a = subst_(inp)
    a = rc4(keys[6], subst_(a = mapp(a = reverse(a), keys[8], keys[7])))
    a = mapp(a = rc4(keys[5], subst_(a = reverse(a))), keys[4], keys[3])
    a = rc4(keys[0], subst_(a = mapp(a = reverse(a), keys[2], keys[1])))
    return a;
  }

  static async stream(url) {
    url = new URL(url);
    const embed_id = url.pathname.split("/")[2];
    debug(F2Cloud.ID, embed_id);
    const h = F2Cloud.h_enc(embed_id);
    debug(F2Cloud.ID, h);
    const mediainfo_url = `https://${url.host}/mediainfo/${F2Cloud.embed_enc(embed_id)}${url.search}&ads=0&h=${encodeURIComponent(h)}`;
    const resp = await (await fetch(mediainfo_url)).json();
    debug(F2Cloud.ID, resp);
    const playlist = F2Cloud.embed_dec(resp['result']).replace(/\\\//g, "/");
    return JSON.parse(playlist);
  }
}
