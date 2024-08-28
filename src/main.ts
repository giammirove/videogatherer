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
import { VidsrcMe } from './sources/vidsrc.me.js';

async function main() {
  FlixHQ.test();
  Myflixerz.test();
  VidsrcPro.test();
  VidsrcMe.test();
  VidStream.test();

  // Dead since 26/08/2024
  //Watchseries.test();
  //Vidsrc.test();
  //Aniwave.test();
}

main();

