import { Aniwave } from './sources/aniwave.js';
import { Vidsrc } from './sources/vidsrc.js';
import { Watchseries } from './sources/watchseries.js';
import { FlixHQ } from './sources/flixhq.js';
import { Myflixerz } from './sources/myflixerz.js';
import { VidsrcPro } from './sources/vidsrc.pro.js';
import { VidStream } from './sources/vidstream.to.js';
import { VidsrcMe } from './sources/vidsrc.me.js';
import { VidsrcCC } from './sources/vidsrc.cc.js';
import { EmbedSu } from './sources/embed.su.js';

async function main() {

  // Last Edit 28/01/2025
  EmbedSu.test()

  // Not Maintained since 30/09/2024
  //FlixHQ.test();
  //Myflixerz.test();
  //VidsrcPro.test();
  // sometimes fails due to cloudflare
  //VidsrcMe.test();
  //VidStream.test();
  //VidsrcCC.test();

  // Dead since 26/08/2024
  //Watchseries.test();
  //Vidsrc.test();
  //Aniwave.test();
}

main();

