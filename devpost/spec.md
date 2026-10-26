---
doc: spec
status: approved
---

# Illustrated wardrobe catalog — Technical Spec

This technical plan is approved after display and review. the project creator accepted it with an explicit approval while handing over artwork and requesting implementation handoff. The public project name remains a learner choice. Gemini/Nano Banana, mobile-web delivery, the local Mac service, and storage design below are the accepted implementation basis.

## How This Works, In Plain Language

Open a phone-sized webpage to use the wardrobe. A small program running on the Mac serves that page, saves the wardrobe, and talks to Gemini. When a clothing photograph is submitted for generation, that photograph is sent to Gemini; its illustrated result comes back to the Mac. Confirming the preview creates a garment card.

The original photo, illustration, categories, sets, wear records, archive states, and review settings live in the Mac project's private data directory. Closing the page does not erase them. A phone on the same trusted network can use the Mac's LAN address while the Mac service is running. This first proof of concept is not an independently installed native phone app.

The API credential stays in the Mac's ignored `.env` file. It is never sent to the browser, stored in a garment record, copied to art handoffs, or included in the public repository. HostDzire currently carries only the separate art-reference handoff; it is not the wardrobe's storage or deployment.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. The browser loads saved wardrobe data. Empty data shows the welcome and upload guidance; otherwise it picks an active garment for the daily question.
2. A selected photograph is uploaded to the local service, which validates its type/size and stores it with a generated filename.
3. Generating starts a job. The service submits the photo and fixed garment-preserving style instructions to Gemini. The page shows progress and polls the job; it never presents a placeholder as an AI result.
4. A returned image is stored as a preview. The page compares source and illustration. Regenerate makes a new explicit attempt; replace-photo changes the input. Confirming saves the named/typed garment and personal labels.
5. Selecting cards binds an exact garment combination as a set. Recording wear creates an event that references garments and, when applicable, sets. Multiple events on the same day remain separate.
6. A due enabled review appears in the app's top banner. Its queue contains current individual garments only. Keeping records progress; archiving changes the garment and its containing sets together.
7. Archived garments and sets render on separate Past Catalog pages. Grey is a presentation filter; detail uses the preserved color source. Saved review progress survives closing the page.

## Stack

Approved small-stack implementation:
- **Node.js 24** — local version verified as `v24.13.0`. Built-in HTTP, fetch, file-system, UUID, and test APIs; no package-install/build pipeline required for the proof of concept. [HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html), [file system](https://nodejs.org/docs/latest-v24.x/api/fs.html).
- **Browser HTML, CSS, and JavaScript modules** — mobile-first interface with semantic controls and custom styling. This keeps the selected palette and illustration/card treatment under direct control.
- **One local JSON state file plus image files** — proportional to one person's wardrobe, with serialized transactions and atomic file replacement. No hosted account/database service is added.
- **Gemini REST API, `gemini-nano-banana-2.1`** — the learner-selected provider; model availability and a real source-photo conversion have been verified. [Model](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1), [image API guide](https://ai.google.dev/gemini-api/docs/generate-content/image-generation).

These choices trade native installation and always-available remote access for a small, directly runnable local demo. The Mac must remain on for phone access. No paid hosting, public deployment, or new subscription is selected.

## Where It Runs and How Someone Tries It

Planned environment: Node.js 24, a modern desktop/mobile browser, and a valid Gemini key with image generation enabled.

Planned commands after implementation:
1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`; the current local project already has its supplied key in `.env` with mode 0600.
2. Run `npm start` and open `http://127.0.0.1:4317` on the Mac.
3. For a phone on the same trusted network, run `npm run start:lan`, then open `http://<Mac-LAN-address>:4317`. LAN mode is explicit; default serving stays on loopback.
4. Use an actual photograph or the clearly labeled public sample. Generate, inspect, confirm, record wear, bind a set, and review/archive.

The implementation must verify startup, actual browser interactions, refresh/reopen, and failure behavior. These commands are planned, not yet tested against an app. A video and public source repository remain required; public hosting is optional and requires a separate decision.

## Look and Feel
PRD refs: `Look and Feel`, `Screens and Layout`.

Use the supplied interface palette `#f0e0e3`, `#e0cbd2`, `#beafb2`, `#eee1de`, with cream backgrounds and warm dark text. Rounded cards and category icons, restrained outlines, generous spacing, and calm mobile layouts follow the reference. Keep each garment's true colors independent of the UI palette. The initial garment grid is three columns where readable, reducing columns on narrow widths. Controls remain comfortably tappable.

The welcome illustration and six icons have arrived and passed static transparency/bounds inspection. Use `public/art/wardrobe-welcome.png` and `public/art/icons/*.png`; the source-to-target map is in the private local verification receipt. Preserve their supplied style and verify optical size in the actual interface. Preserve text as real interface text. Archived greyness is CSS filtering on thumbnails, never destructive image processing. Chinese is the primary interface; an English presentation option provides English demo/testing material without changing wardrobe data. The working title is descriptive, not an AI-authored final public project name.

## Components

### Mobile Interface and Intake
Implements `prd.md > First-Use Welcome and Guidance`, `Daily Wear Home`, `Photograph to Confirmed Garment Card`, and `Custom Organization and Entry-Date Sorting`.

Render the home, active wardrobe, intake/preview, garment detail, set picker, review, and two archive surfaces. Keep daily wear separate from review. Use escaped text for personal names/tags, image elements for generated media, and clear loading/error/saved states. An empty collection gives the established guidance, not a broken random card. Category names and tags/records remain self-entered text, separate from garment type.

### Local HTTP Service and Media
Handles browser requests, limits bodies, validates media, serves only `public/` and registered image files, and delegates state changes. No route exposes `.env`, `.local/`, arbitrary paths, or raw provider responses. Initial supported photographs are JPEG, PNG, and WebP, up to 8 MB. Other formats receive an understandable replacement-photo message. Source bytes are retained separately from generated results.

### Gemini Garment Conversion
Implements `prd.md > Photograph to Confirmed Garment Card`.

Use one fixed, versioned style prompt plus the source photograph. Preserve real color, shape, neckline, sleeve/hem construction, and visible details while producing a front-facing clothing illustration on a clean light background. Ask for one garment and no captions, body, extra objects, or invented embellishments. Non-garment/unclear results may fail or require replacement; no guaranteed perfect reconstruction is claimed.

Create a generation job, send the image only when generation is requested, and store only final non-thought image parts. A retry is explicit; do not automatically repeat a potentially charged generation after a timeout. A no-image response or provider failure becomes a recoverable job error. Store credential-free evidence and image provenance. The original and preview stay separate until confirmation.

### Wardrobe, Set, Wear, and Archive Rules
Implements `prd.md > Bound Sets and Wear Attribution`, `Multiple Wear Records Per Day`, `Garment-to-Set Archival Linkage`, and `Separate Archive With Color-Preserving Detail`.

Use one domain module for all mutations and derived counts. A wear event snapshots unique garment IDs and chosen set IDs. Garment totals, individual wears, set-attributed wears, and set counts derive from events rather than separate incrementing counters. A repeated submission of the same request ID returns its existing result; a later intentional outfit uses a new request ID. Removing a mistaken event updates all derived counts.

Exact garment-ID combinations match sets; partial overlap does not. Binding an already-existing combination reuses the saved set. Current selections reject archived constituents. Archiving one garment archives all sets containing it in the same transaction, preserving other garments and all historical wear events. Grey-list/full-color-detail is presentation only.

### Review Clock and Saved Progress
Implements `prd.md > Optional Day-Based Wardrobe Review` and `Operating Defaults Adopted With the Plan`.

Review starts disabled. The interval accepts integers from 7 through 365. Enabling first anchors to the current local date; completing a round anchors again to its completion date. Compare calendar dates, not hours worn. Opening the app checks whether the interval is due; no system push/cron service is required.

Starting a round snapshots all active individual garment IDs once, in entry-date order. Saved decisions remove one ID from the remaining queue. Never queue set cards or archive records. Store progress after each decision; refresh continues remaining cards. The next interval starts only on completion. A queue with no active garments explains that nothing needs review. No extra skip/undo/manual-pause controls are added.

### Durable Store
Implements the approved close/reopen behavior.

Keep `data/wardrobe.json` and `data/images/` outside public source control. Serialize mutations; compute a new snapshot, write a temporary file, then replace the state file. Publish new in-memory state only after successful persistence. A failed write must leave the last saved wardrobe intact and show a retryable error. Validate loaded state; never silently replace a damaged existing file with an empty wardrobe.

## Data Model

One versioned JSON document contains:
- **garments:** ID, name, type, source-image ID, generated-image ID, custom categories/tags or records, active/archive status, entry time, archival time.
- **sets:** ID, name, constituent garment IDs, active/archive status, creation/archival times.
- **wearEvents:** event ID, unique request ID, garment IDs, set IDs, occurrence time. These remain historical when clothing is archived.
- **reviewSettings:** enabled flag, integer interval, local-date anchor.
- **reviewSession:** session ID, ordered garment snapshot, remaining IDs, recorded decisions, start/completion dates.
- **generationJobs:** job ID/request ID, source-image ID, status, generated-image ID or safe error, creation time. Jobs do not contain credentials.

Images are files addressed by generated IDs, not arbitrary browser-supplied paths. Data survives page closure and service restart. Interrupted in-flight generation after a service restart becomes a clear failed job requiring an explicit retry; saved garment records remain intact.

## File Structure

```text
project/
├── server.mjs                 # local HTTP routing and generation jobs
├── src/
│   ├── domain.mjs             # wardrobe/set/wear/review rules and counts
│   ├── store.mjs              # serialized durable JSON transactions
│   └── gemini.mjs             # fixed prompt and credential-safe provider call
├── public/
│   ├── index.html            # mobile app shell
│   ├── app.js                # rendering, actions, uploads, and polling
│   ├── styles.css            # chosen palette and responsive layouts
│   ├── icons.js              # original icons, replaceable by accepted artwork
│   ├── i18n.js               # Chinese/English presentation strings
│   ├── art/                  # accepted welcome image and six icons
│   └── samples/              # labeled CC0 source and actual generated sample
├── test/
│   ├── domain.test.mjs       # counts, linkage, review scope, date boundaries
│   ├── store.test.mjs        # persistence and failed-write behavior
│   └── http.test.mjs         # upload/job/mutation contracts and private paths
├── data/                     # ignored private wardrobe and images
├── devpost/                  # planning, checklist, and app map
├── .env                      # ignored local credential; never committed
├── .env.example              # names/placeholders only
├── package.json              # start, LAN, test, and check commands
├── README.md                 # exact local/phone/demo setup
└── ASSETS.md                 # sample/artwork sources and rights
```

This tree describes planned application files. Only sample assets and provenance currently exist outside planning files; app implementation has not started.

## External Services and Dependencies

Gemini is the only runtime external service. Verified endpoint contract:
- `GET https://generativelanguage.googleapis.com/v1beta/models` authenticated by `x-goog-api-key`: used for capability verification; HTTP 200 observed.
- `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent`: one user content with text and inline image bytes, requesting text/image modalities and a square 1K output. Parse final candidate image parts and ignore thought images. HTTP 200 and a real JPEG output observed in the spike.
- Secrets stay server-side. Provider usage is charged according to the supplied account/model; no new subscription or hosting purchase is part of this plan. [Pricing](https://ai.google.dev/gemini-api/docs/pricing).

The real source-to-image test took 14.29 seconds for one public sample and was visually inspected. This is evidence for one request, not a latency guarantee or a completed in-app workflow. Prompt and redacted receipt live in ignored research files; distributable demo image provenance is in `ASSETS.md`.

## Important Failure Modes

- **Unsupported/too-large photo, or unusable generation:** explain the issue, keep the intake recoverable, and allow retry/replacement. Do not silently create a garment.
- **Gemini timeout, quota/auth failure, or no returned image:** show a safe job failure; preserve source and existing wardrobe. Retry requires a deliberate action.
- **Failed disk save or damaged saved data:** leave last good data intact, explain the failure, and avoid reporting an unsaved action as complete.

## Verification

Use meaningful domain and persistence tests for multiple same-day wears, idempotent requests, exact-set matching, removal of mistaken events, garment-to-set archival linkage, active-single review scope, 7/365 bounds, and date-anchor transitions. Check API private-path rejection and error states. Run the actual app in a browser at phone and desktop sizes, generate from a real uploaded sample, confirm, refresh, record wear, create a set, review/archive, and open both archive pages. Record which checks are automated, browser-observed, and actually tried on a physical phone.

## What Was Simplified and Why

A mobile webpage backed by one local Node process avoids native packaging and extra hosted services while proving the full wardrobe loop. A single-person JSON store avoids accounts and a hosted database. In-app due calculation meets the selected reminder behavior without system notifications. The avatar remains deferred as already agreed. These technical delivery/storage simplifications were accepted with the displayed technical plan.

## Decisions and Open Issues

- **Learner choices:** phone-first experience, the product rules and visual references, and Gemini/Nano Banana rather than a GPT image API.
- **Verified uncertainty:** the project creator distinguished Codex's built-in image feature from an app-callable image API. A supplied Gemini credential was checked without printing it; model discovery and one real image-to-image generation succeeded. This establishes an actual provider path rather than assuming coding-agent access is an app credential.
- **Approved implementation choices:** mobile-web delivery, Mac-hosted private storage, the local/LAN run mode, and the Node/browser implementation above. The accepted tradeoff is that phone access depends on the Mac service being available.
- **Not yet verified:** the actual Node app, browser/phone behavior, all wardrobe workflows, and artwork at in-app sizes. Seven delivered artwork files passed static checks; Node-native provider connectivity returned HTTP 200 and confirmed the selected model.
- **Later shipping work:** learner-written project name/description/submission fields, video, repository publication, and the actual Devpost submission receipt. No deployment or submission has occurred.
