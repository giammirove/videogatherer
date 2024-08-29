# VideoGatherer 

Scraping movies and tv series from:
- flixhq.to 
- myflixerz.to
- vidsrc.net
- vidsrc.pro
- vidsrc.cc
- vidstream.to
- vidsrc.to (dead)
- aniwave.to (dead)
- watchseriesx.to (dead)

At the moment the purpose of this repository is to expose methods used 
to scrape websites.

In the future it could be developed a user interface to allow regular users
to easily watch movies/tv series.

### Read read read

vidsrc.to, watchseriesx.to, aniwave.to are DOWN (26/08/2024, DD-MM-YYYY)
The project keeps their scrapers as learning material, please do not open an ISSUE about this.

### How to install it

```sh
git clone git@github.com:giammirove/videogatherer.git
cd videogatherer
npm i
npm run build # to build
npm run keys # to get the keys
npm run start # to execute
```

### How to run it

```sh
npm run build # if not done yet
npm run start
```

Examples of how to request an episode/movie can be found in the `test` function
of each module in `src/sources`.

### What if it does not work

Those website are not 100% stable, it is normal if they have downtime.

What you can do is to manually open the browser and check whether the website 
is working correctly.
If it is working, maybe the keys (see `dist/keys.json`) are changed.
To fix that you can run
```sh
npm run keys
```
Then retry ... :)

If it still does not work .. well we tried folks.

### Note

This project is intended as proof of concept, 
the distribution of program is intended for educational purposes ONLY.
