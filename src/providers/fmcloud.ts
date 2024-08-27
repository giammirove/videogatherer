import fetch from 'node-fetch';
import { Provider, Stream } from '../utils';

const ALT_HOSTS: Array<string> = [];
async function stream(url: string): Promise<Stream> {
  const resp: string = (await (await fetch(url)).text());
  const reg: RegExp = new RegExp(/<script.*?>(.*?)<\/script>/gm);
  let script: string = reg.exec(resp.match(reg)!.at(-1)!)![1];
  script = eval(script.replace('eval', ''));
  const sources: string = "{" + (/videop.setup\(\{(.*?)\}\);/gm).exec(script)![1] + "}";
  const data: Stream = eval(`let s = ${sources}; s`);
  return data;
}

export const FMCloud: Provider = { stream, ALT_HOSTS };
