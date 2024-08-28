/*
 * So yes it is JS and not Typescript ... bite me 
 */

import { Aniwave } from './sources/aniwave.js';
import { Vidsrc } from './sources/vidsrc.js';
import { Watchseries } from './sources/watchseries.js';
import { FlixHQ } from './sources/flixhq.js';
import { Myflixerz } from './sources/myflixerz.js';
import { VidsrcPro } from './sources/vidsrc.pro.js';
import { MegaCloudRabbitStream } from './providers/megacloudrabbitstream.js';
import { VidStream } from './sources/vidstream.to.js';

async function main() {
  //FlixHQ.test();
  //Myflixerz.test();
  //VidsrcPro.test();

  const url = "https://rabbitstream.net/v2/embed-4/9BOfJx2o6JXl";
  VidStream.test();

  // Dead since 26/08/2024
  //Watchseries.test();
  //Vidsrc.test();
  //Aniwave.test();
}

main();

