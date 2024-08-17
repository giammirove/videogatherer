import fetch from 'node-fetch';

export class FMCloud {
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
