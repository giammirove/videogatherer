import fetch from 'node-fetch';

export class Superembed {
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

