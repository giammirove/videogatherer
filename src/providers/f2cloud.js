import fetch from 'node-fetch';
import { debug, mapp, reverse, subst_, subst, rc4, get_keys, dec_with_order, enc_with_order, get_encrypt_order } from '../utils.js';

export class F2Cloud {

  // alternative hosts
  static HOST = "vid2v11.site";
  static ALT_HOSTS = [this.HOST, "vid2faf.site"];
  static ID = "F2";

  static SCRAPE_CONFIG = {
    ID: this.ID,
    // input of encrypt function
    ENTRY: new RegExp(`https://.*?/e/(.*?)\\?`.replace(/\//g, '/')),
    // output of encrypt function
    OUT: new RegExp(`https://.*?/mediainfo/(.*?)[&\\?]`.replace(/\//g, '/')),
  }

  static enc(inp) {
    let keys = get_keys(this.ALT_HOSTS);
    let order = get_encrypt_order(this.ALT_HOSTS);
    if (order.length > 0)
      return enc_with_order(keys, order, inp);
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
    let order = get_encrypt_order(this.ALT_HOSTS);
    if (order.length > 0)
      return dec_with_order(keys, order, inp);
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
