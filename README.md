# Deep Space 2103

The source for [the radio](https://johnnymandious.github.io/radio/): a non-stop deep space music station of space ambient, synthwave and Berlin School albums, all under Creative Commons licences. It is plain static HTML, CSS and JavaScript with no build step. The workflow in `.github/workflows/static.yml` publishes it to GitHub Pages whenever `main` changes.

It lives in its own repository, separate from [johnnymandious.com](https://johnnymandious.com/), so that anything to do with the music only ever affects the radio and never the main site. The main site links to it from its menu.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The radio page |
| `radio.js` | The player: loads the album list, plays tracks, and writes credits and licence into downloaded MP3 tags |
| `radio.css` | Radio styles. The page also loads `journal.css` and the fonts from johnnymandious.com, so it always matches the main site |
| `assets/radio/albums.json` | The album list. This is the only file you need to edit to change what plays |
| `assets/radio/covers/` | Album covers |
| `assets/radio/brand/` | The Deep Space 2103 logo (`logo.svg`), favicon, app icons and the 1200×630 social card used when the link is shared |
| `site.webmanifest` | Name and icons for when someone adds the radio to their phone's home screen |
| `sitemap.xml` | Tells Google the radio page exists. Update its `lastmod` date when the page changes a lot |
| `RADIO-LICENCE-REPORT.md` | Licence check for every album |

No audio is stored here. Every track streams straight from the Internet Archive (archive.org), using the `file` link in `albums.json`.

## Taking an album off air

This works from the GitHub phone app or the website.

1. Open `assets/radio/albums.json` and tap the pencil (edit) button.
2. Find the album's entry. Each one starts with `{` and `"id": ...` and ends with `}` after its `"tracks"` list.
3. Delete the whole entry, from its `{` to its matching `}`, plus the comma between it and its neighbour. Albums are separated by commas, and the last album in the list has no comma after it.
4. Commit the change to `main`. The radio updates within a minute or two.

If the radio shows nothing after an edit, the file probably has a stray or missing comma. Open the last commit and compare, or revert it.

You can also delete the album's cover from `assets/radio/covers/`, but that is optional.

## Adding an album

1. Check the licence allows streaming and redistribution (Creative Commons BY, BY-SA, BY-NC and so on) and note it in `RADIO-LICENCE-REPORT.md`.
2. Copy an existing entry in `albums.json`, paste it where you want it in the play order, and change every field: `id`, `title`, `artist`, `licence`, `source`, `cover` and each track's `title`, `duration` and `file`. `file` must be a direct MP3 link, such as `https://archive.org/download/<item>/<track>.mp3`.
3. Put the cover in `assets/radio/covers/` as a square JPEG, or use a full URL for `cover`.

Optional fields are `year`, `label` and `licenceNote`. A track can override the album's `licence` or `source`.

## Getting found on Google

The page title, description, heading and the "What is Deep Space 2103?" section all use the phrase "deep space music", which is what people search for. Keep that wording if you edit them.

To get Google to index the radio quickly:

1. Go to [Google Search Console](https://search.google.com/search-console) and add a **URL prefix** property for `https://johnnymandious.github.io/radio/`.
2. Choose the **HTML tag** verification method. Copy the `<meta name="google-site-verification" ...>` tag it gives you into the `<head>` of `index.html`, commit to `main`, wait a minute, then press Verify.
3. Under **Sitemaps**, submit `sitemap.xml`.
4. Under **URL inspection**, paste the radio URL and press **Request indexing**.

Links from other sites help the most: share the radio on X, Instagram, Reddit (r/ambientmusic, r/spacemusic, r/synthwave) and anywhere that lists free internet radio stations.

## Takedown requests

The page tells rights holders to message Johnny Mandious on X or Instagram. To remove music, take the album off air as above. If GitHub ever receives a takedown for this repository, only the radio goes offline. The main site is unaffected.
