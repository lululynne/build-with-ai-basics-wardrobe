---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast. The creator approved continuing the established three-slice implementation and local Git checkpoints.

Git: This project has its own repository and verified checkpoints. Only intended files are staged after privacy checks; automated verification and learner feedback are recorded separately.

## Slices

- [x] **1. A real garment photograph becomes a saved illustrated card**
  Becomes usable: A running mobile webpage welcomes an empty wardrobe, accepts a photo, requests an actual Gemini illustration, compares source/result, and saves a confirmed card that survives refresh and service restart.
  Why now: Delivers the unique kernel first. The provider has already been verified; the next risk is integrating upload, generation jobs, confirmation, and persistence rather than spending time on disconnected scaffolding.
  PRD ref: `prd.md > Photograph to Confirmed Garment Card`, `First-Use Welcome and Guidance`, `Daily Wear Home`, `Look and Feel`
  Spec ref: `spec.md > Mobile Interface and Intake`, `Local HTTP Service and Media`, `Gemini Garment Conversion`, `Durable Store`, `File Structure`, `Where It Runs and How Someone Tries It`
  Build: Bootstrap Node/browser app within this slice; load credential only server-side; implement photo validation/upload, explicit generation job and progress, compare/regenerate/replace/confirm, source and illustration persistence, empty welcome and active card, and accepted artwork/style. Use the actual tested Gemini model/payload. Produce `.env.example` with placeholders and startup instructions. The example wardrobe is empty unless a clearly labeled sample is deliberately added.
  Verify (mechanical): Run syntax/Node tests and start the actual app; upload the public sample through the UI, generate a new real illustration, confirm it, refresh and restart, and check the same card/source remain. Test unsupported input and simulated provider failure without losing saved clothes. Confirm no credential in static output or public responses.
  Learner check: Open the running app, make or inspect a real illustrated card, compare it with the original, and report anything unlike the intended drawing style or intake flow. Keep the first usable UI available for this early feedback.
  Commit: `Build real photo-to-illustration wardrobe intake`

- [x] **2. Clothes can be organized, bound into sets, and worn several times a day**
  Becomes usable: Personal category/tag records and entry-date sorting work; existing garment cards bind into sets; deliberate outfit saves update correct individual/set counts, with correction of mistaken records.
  Why now: Builds the daily use around real saved cards and resolves count attribution before archive changes can affect availability.
  PRD ref: `prd.md > Custom Organization and Entry-Date Sorting`, `Bound Sets and Wear Attribution`, `Multiple Wear Records Per Day`, `Daily Wear Home`, `Operating Defaults Adopted With the Plan`
  Spec ref: `spec.md > Wardrobe, Set, Wear, and Archive Rules`, `Data Model`, `Durable Store`
  Build: Add self-entered labels/records and newest/oldest entry-time ordering. Bind exact existing garment combinations as sets. Existing sets record set wears; unsaved combinations offer save-as-set or individual recording. Preserve unique wear events and their sources; allow multiple actual outfit changes on a day, prevent accidental duplicate submissions, and remove mistaken wear events with recomputed counts. Show component set-wear information.
  Verify (mechanical): Test exact/partial set matching, saved/new/declined-set paths, one repeated request versus two intentional same-day records, shared garments in several set references, removal of a mistaken event, entry-time sorting, and close/reopen persistence. In the UI, the same top in two separate outfit records counts twice.
  Learner check: Choose today's garments, bind a set, record another outfit on the same day, and check whether both the set count and single-garment set-attributed count express the intended use.
  Commit: `Add personal organization sets and attributed wear records`

- [x] **3. The current wardrobe can be reviewed and archived with linked sets**
  Becomes usable: Optional 7–365-day review shows an in-app top reminder, reviews only current individual garments, saves progress, and moves a garment plus its sets into two separate archive pages with grey-list/full-color-detail behavior.
  Why now: Completes the already-defined review/archive loop using the working garment/set/wear model and preserves the difference between current clothes and historical combinations.
  PRD ref: `prd.md > Optional Day-Based Wardrobe Review`, `Garment-to-Set Archival Linkage`, `Separate Archive With Color-Preserving Detail`, `States and Boundaries`
  Spec ref: `spec.md > Review Clock and Saved Progress`, `Wardrobe, Set, Wear, and Archive Rules`, `Durable Store`, `Verification`
  Build: Add disabled-by-default cycle settings, integer bounds, first-enable/completion anchors, due top banner with the project creator's supplied wording, a once-per-garment current-only queue, retain/archive decisions, and saved remaining progress. Archive containing set records atomically with the garment while retaining other garments/history. Provide distinct Past Singles and Past Sets pages; grey only thumbnails. Finish English presentation/testing labels and integrate the accepted hero/icons in actual mobile layouts.
  Verify (mechanical): Test 7/365 bounds, due calendar-date transitions, finish/reset timing, refresh/resume, no archive or set cards in review, one card despite several containing sets, linked archival across multiple sets, retained other components, unchanged history, and failed-write behavior. Walk the whole app in mobile/desktop browser sizes; inspect both archive pages and full-color detail. Physical-phone testing is a separate reported state.
  Learner check: Review current single garments, archive a component of a saved set, and confirm the single and set appear on their correct old pages while remaining clothes stay in the wardrobe. Explore the complete app and report remaining issues.
  Commit: `Complete day-based review and separate linked archives`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, learner compares the actual photo/illustration and intake UI; record real feedback before marking done.
- [ ] Final kick-the-tires exploration and feedback completed — after slice 3 and full core-journey checks.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — follow one real save or wear action through 2–3 actual code locations, or connect a useful practice already completed; do not claim mastery from explanation alone.
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and linked for opening, including a project-grounded practice to reuse

Activity and evidence: Implementation and mechanical/browser checks are recorded above; actual the project creator feedback and a joint learning activity remain pending. The app map is a reference route only, not a completed walkthrough.
Route and stops: Reference route prepared from actual code: public/app.js prepareWear/mutate → src/domain.mjs applyAction → src/store.mjs transaction/persist plus viewState. Not yet toured together.
Edit outcome: Not started.
Reflection: Not requested or answered.
Activity mode: Prepared reference map and evidence recap; no hands-on learning completion claimed. Map checked statically for source anchors/local links/offline dependencies; browser opening of planning files was previously denied and was not retried or worked around.

## Revisions

- Slice 1 mechanical evidence: 12 Node tests pass; browser uploaded the CC0 source, real Gemini returned a new JPEG in 13.79 seconds, source/result compared, card confirmed, service restarted and same card reopened. Desktop and 390px browser view inspected; physical-phone and the project creator feedback remain pending. Private receipt/screenshots: the private local verification receipt.

- Slice 2 mechanical evidence: 22 tests pass. Isolated synthetic browser fixture verified saved/new/declined set paths, repeated same-day outfits, correction, category/tag edits, reverse entry sorting, filtering, English, and service-restart retention. No personal clothes used; main wardrobe remains the explicitly confirmed public example. Early feedback requested asynchronously and remains pending; the project creator explicitly requested continuing the package, so independent implementation continued.
- Internal startup correction: reserve the HTTP port before opening saved state, so accidentally launching a second service cannot mark a live generation interrupted. Duplicate launch was checked and exits with the existing-service message.

- Slice 3 mechanical evidence: 34 tests pass. Isolated synthetic browser round anchored on 11-05, became due11-12, archived one shared component and both containing sets, resumed remaining cards after service restart, completed11-13 and next due11-20. Separate archive pages and CSS grey-list/color-detail were observed. 66 route/language/viewport layout samples had no page overflow at320/390/1280. These are agent-observed and synthetic checks; physical-phone and the project creator final review remain pending. Evidence: the private local verification receipt.

- Additional learner-supplied material check: the project creator provided11 real garment references; all11 generated, visually compared and confirmed through App actions (one through the browser file-input/confirmation form), then all retained after service restart. A deliberate second attempt for the striped dress removed detached jewelry. Prompt v2 now explicitly excludes mannequins/detached jewelry and invented construction; source waist details were verified present, not removed. Originals and saved source bytes hash-match. There are12 total wardrobe cards including the earlier labeled CC0 sample, and0 wear events. This is agent verification, not the project creator final acceptance.

- Shipping preparation: fixed the initial public-document navigation being rejected when opened from an external link. The exception is limited to top-level GET `/` navigation; private state, image reads, Host validation and all writes retain same-origin checks. A regression verifies both entry access and cross-site denial. Node tests now pass35/35. A separate empty demo server on4318 verifies the corrected entry without restarting or changing the main wardrobe on4317. Nana's local provenance was located and all6 delivered icon PNGs match the accepted files by SHA-256.
