import RabbitStream from './rabbitstream.js'

export class MegaCloudRabbitStream {
  static async stream(url) {
    const id = url.split("/").at(-1).split("?").at(0);
    return await RabbitStream.stream(id, 1);
  }
}
