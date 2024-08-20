/*
 * So yes it is JS and not Typescript ... bite me 
 */

import { Watchseries } from './sources/watchseriesx.js';
import { Vidsrc } from './sources/vidsrc.js';
import { Aniwave } from './sources/aniwave.js';
import { Myflixerz } from './sources/myflixerz.js';
import { FlixHQ } from './sources/flixhq.js';
import { VidsrcMe } from './sources/vidsrcme.js';

async function main() {
  Vidsrc.test();
  Watchseries.test();
  FlixHQ.test();
  Myflixerz.test();
  Aniwave.test();
  // it has captcha
  //VidsrcMe.test();
}

main();
