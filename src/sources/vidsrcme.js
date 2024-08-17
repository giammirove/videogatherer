import fetch from 'node-fetch';
import { try_stream } from '../utils.js';
import { Superembed } from '../providers/superembed.js';

export class VidsrcMe {

  static HOST = 'vidsrc.net';
  static ALT_HOSTS = [VidsrcMe.HOST, 'vidsrc.stream', 'vidsrc.xyz'];
  static REFERER = 'https://vidsrc.stream';
  static SERVER_SUPEREMBED = 'Superembed';
  static SERVERS = [
    { id: VidsrcMe.SERVER_SUPEREMBED, handler: Superembed },
  ]
  static ID = "VM";

  static SCRAPE_CONFIG = {
    ID: VidsrcMe.ID,
    // PlayStation bypasses dev tools detection
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36; PlayStation',
    EXPECTED_KEYS: 5,
    INJECT_URLS: [
      "all.js",
      "embed.js"
    ],
    INIT_URL: "https://vidsrc.me/embed/tv?imdb=tt1190634&season=1&episode=1",
    BTN_ID: "#player_iframe",
    MAX_TIMEOUT: 2500
  }

  static async fetchReferer(url, args = {}) {
    if (args.headers == undefined)
      args.headers = {};
    if (args.headers['Referer'] == undefined && args.headers['Referer'] != "")
      args.headers['Referer'] = VidsrcMe.REFERER;
    return fetch(url, args);
  }

  static async episode(data_id, server = VidsrcMe.SERVER_SUPEREMBED) {
    let url = `https://${VidsrcMe.HOST}/embed/${data_id}`;
    let res = await (await VidsrcMe.fetchReferer(url)).text();
    let hash = (/data-hash="(.*?)".*Superembed.*?<\/div>/gm).exec(res)[1];
    url = `${VidsrcMe.REFERER}/rcp/${hash}`;
    res = await (await VidsrcMe.fetchReferer(url)).text();
    const srcrcpLink = /src:\s*'(.*)'/.exec(res)?.[1];
    url = `https:${srcrcpLink}`;
    return await try_stream(VidsrcMe.SERVERS, server, url, { 'Referer': VidsrcMe.REFERER });
  }

  static async tv(data_id, s = 1, e = 1, server = VidsrcMe.SERVER_SUPEREMBED) {
    return VidsrcMe.episode(`${data_id}/${s}-${e}`, server);
  }

  static async movie(data_id, server = VidsrcMe.SERVER_SUPEREMBED) {
    return VidsrcMe.episode(data_id, server);
  }

  static async test() {
    console.log(await VidsrcMe.tv('tt1312171', 2, 3));
    console.log(await VidsrcMe.movie('tt1300854'));
  }
}
