# VideoGatherer
Scraping movies and tv series from vidsrc.to, flixhq.to, watchseriesx.to, myflixerz.to, vidsrc.net.

At the moment the purpose of this repository is to expose methods used 
to scrape websites.

In the future it could be developed a user interface to allow regular users
to easily watch movies/tv series.

### How to install it

```sh
git clone git@github.com:giammirove/videogatherer.git
cd videogatherer
npm i
npm run keys
npm run start
```

### How to run it

```sh
npm run start
```

Examples of how to request an episode/movie can be found in the `test` function
of each class (`Vidsrc`, `FlixHQ`, `Watchseries`, `Myflixerz`, `VidsrcMe`).

### What if it does not work

Those website are not 100% stable, it is normal if they have downtime.

What you can do is to manually open the browser and check whether the website 
is working correctly.
If it is working, maybe the keys (see `src/keys.json`) are changed.
To fix that you can run
```sh
npm run keys
```
Then retry ... :)

If it still does not work .. well we tried folks.

### TODO

Fallback to other sources when the chosen one fails.

### Note

This project is intended as proof of concept, 
the distribution of program is intended for educational purposes ONLY.
