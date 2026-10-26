# Illustrated wardrobe catalog

A local proof of concept: turn a real garment photograph into an illustrated card, compare it with the original, and confirm it into a private wardrobe. This is technical setup documentation; the creator supplies the public project title and submission description.

## Run

Requires Node.js 24 or later. There are no dependencies to install.

```sh
cp .env.example .env
# Set GEMINI_API_KEY in .env on your own computer. Keep it private.
npm start
```

Open **http://127.0.0.1:4317**. The first wardrobe is empty. Select a JPEG, PNG or WebP photograph up to 8 MB, explicitly generate an illustration, compare, name/type it and confirm. Generation sends the chosen photograph to Google's Gemini API and may incur the configured account's usage charges. Retry/regenerate is explicit. A labeled CC0 sample is available for a demonstration; it is not personal clothing and does not prepopulate the wardrobe.

For a phone on the same trusted network, first stop the loopback service (Ctrl+C in its Terminal), then start explicit LAN mode:

```sh
npm run start:lan
```

Open the printed `Phone` address on the phone. The Mac and this service must stay on. LAN mode shares this single wardrobe with devices on that network and has no login. Default mode listens only on this computer. Do not expose its port to the internet.

Close the page and reopen it to retrieve saved garments. `data/wardrobe.json` and `data/images/` hold private state and separate original/generated images. They are excluded from Git. Back up the entire `data/` directory while the service is stopped. If saved JSON cannot be read, the service fails with an explanation rather than resetting it.

## Organize and record wear

Edit a garment card to change its type, personal categories, tags or notes. Sort the wardrobe by entry date or filter a personal category. Bind at least two existing garments under **Outfit sets**; an identical combination reuses the existing set.

Under **Today's outfit**, select garments, one or several saved sets, or both. An exact existing combination records a set wear. A new combination asks whether to save a set or record the garments individually. Each deliberate save records an actual outfit change, including several on the same day; a shared garment is counted once within that outfit. Garment details separate individual and set-attributed wears. Remove a mistaken journal record to recalculate its related counts. A disconnected save retains its request ID for safe retry.

## Review and archive

Regular review starts disabled. Enable it under **Wardrobe review** and choose 7–365 whole days. The first enable date anchors the first cycle. A due reminder appears at the top of the app; a round snapshots current single garments, visits each once, and saves every decision. Returning continues remaining cards. Finishing the round starts the next interval from its completion date.

Keep a garment in the wardrobe or move it to **Past catalog**. Archiving one garment also archives every containing set in one save; other constituent garments remain active. **Past singles** and **Past sets** are separate pages. Their thumbnails are grey through CSS; opening details shows the preserved color illustration and original photograph. Existing wear history remains. Archive restore is outside this version.

For phone/LAN mode, use the explicit command under Run.

## Check

```sh
npm run check
npm test
```

Tests use isolated temporary storage and stubbed generation; they do not spend Gemini quota. A live generation through the app is a separate verification step.

Runtime source: `server.mjs` handles HTTP and generation jobs; `src/gemini.mjs` contains the fixed garment-preserving prompt/provider call; `src/store.mjs` serializes atomic saves; `src/domain.mjs` validates actions; `public/` holds the browser interface. Only that public directory and registered image IDs are served.

`devpost/checklist.md` records implementation and verification separately from learner review and physical-phone testing. Artwork and sample provenance is in `ASSETS.md`; contributor notes are in `design/provenance/`.

## License

The source code and technical documentation are offered under the MIT license in `LICENSE`. Artwork and sample-image terms are listed separately in `ASSETS.md`. The public repository starts with no private wardrobe data or API credential.
