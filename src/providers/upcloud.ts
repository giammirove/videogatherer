import { Provider, Stream } from '../utils';
import RabbitStream from './rabbitstream.js'

export const UpCloud: Provider = {
  ALT_HOSTS: [],
  async stream(url: string): Promise<Stream> {
    const id = url.split("/").at(-1)!.split("?").at(0);
    return (await RabbitStream.stream(id)) as Stream;
  }
}

