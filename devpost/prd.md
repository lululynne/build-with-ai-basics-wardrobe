---
doc: prd
status: approved
---

# Illustrated wardrobe catalog — Product Requirements

Working description, not a learner-chosen public project name: a phone-first personal collection of illustrated cards made from real clothing photographs, with outfit sets, wear records, and a comfortable wardrobe review.

This product plan records the decisions supplied by the project creator and the operating defaults displayed for overall review. After review and art handoff, the project creator explicitly instructed proceeding to the next work. This PRD is approved as the implementation basis. The operating defaults remain identified as assistant-originated rules adopted with the reviewed plan.

## The Core Journey
Source: `scope.md > The Core Loop`, `Daily Wear and Bound Sets`, and `What “Working” Looks Like`.

1. With clothes already in the wardrobe, opening the app shows a random active garment card and asks whether it was worn today. On first use, before clothing has been added, show a welcome and guidance that teaches the clothing-catalog workflow.
2. To add clothing, provide one real garment photograph. AI recognizes the garment and creates an illustrated catalog image in the reference's fashion-illustration direction. View the result alongside the original, choose a garment type such as top or bottom, and confirm before adding it to the wardrobe.
3. If the illustration does not resemble the garment, regenerate it or replace the source with a clearer garment photograph. Confirmed recovery choices come from the project creator; technical failure should explain that generation did not finish and retain retry or replacement actions.
4. Organize confirmed garment cards using self-defined categories and tags or records. Browse by entry date, newest first or oldest first.
5. Select existing single-garment cards and bind them as a personal set. A set refers to these garment records, rather than requiring a separate outfit photo.
6. For today's wear, answer the random-card prompt or choose one or several garments or sets from the wardrobe. An existing set is recorded as a set wear; each constituent garment can show its set-attributed wear count. An unsaved combination first asks whether to save it as a new set; declining records a wear for each selected garment.
7. If the optional day-based wardrobe review is enabled and becomes due, a reminder leads into one-card-at-a-time review. The due reminder appears as a banner at the top inside the app. The review covers all individual garment records in the current wardrobe, excluding archived garments and set cards.
8. The wardrobe icon retains a card. The recycle icon archives it in a separate “Past catalog” (Past Catalog) page. Archived thumbnails are grey; opening their details still reveals the full-color illustration and original photograph. Archived garments leave the current wardrobe and its count and review queue.

## Screens and Layout
These are established interaction surfaces, not a decision about the final navigation structure or the number of full-screen pages.

| Surface | Established content and actions | Still unresolved |
| --- | --- | --- |
| Mobile home | First-use welcome and usage guidance; with clothing present, one random current-wardrobe card, today's wear question, a “No” action, and access to selecting today's clothes | See proposed defaults for the “No” response |
| Garment intake and confirmation | Source photograph, generated illustration, garment type selection, confirmation, regenerate, replace photograph | Final arrangement follows the selected visual direction; recovery copy explains failure |
| Current wardrobe and garment details | Active illustrated cards, custom organization, entry-date sort, single/multiple selection, set binding, wear information | Input details follow the proposed organization defaults; visual layout follows the reference |
| Set selection and creation | Bound existing garment cards; prompt to save an unsaved combination; archive a set when a constituent is archived | See proposed exact-match rule |
| Periodic review | Due reminder at the top inside the app; all active individual garments, one card at a time; wardrobe and recycle icons below, on opposite sides | See proposed cycle anchor and saved-progress rule |
| Past Catalog | Separate entry from the current wardrobe, with two distinct pages: archived sets and archived individual garments; grey thumbnails and full-color details | Whether recovery from archive belongs in this first version |

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- Primary use is on a mobile phone; the reference establishes the illustration direction for the garment cards.
- Garments are shown from the front with clean fine outlines, restrained flat shading, and recognizable construction details such as collars, folds, lace, bows, and knit patterns. Preserve the photographed garment's recognizable form and color.
- Emotional intent: make real clothes feel like a personal two-dimensional clothing collection and make checking the wardrobe comfortable.
- The supplied reference is inspiration, not an asset licensed for public redistribution. Schematics in the review HTML are original explanatory drawings, not generated garment results.
- Interface direction supplied by the project creator: simple Korean-inspired styling, low-saturation freshness, and a cute personal dressing-room feel.
- The palette reference explicitly labels `#f0e0e3`, `#e0cbd2`, `#beafb2`, and `#eee1de`: powder pink, dusty rose, muted grey-mauve, and cream blush. Use them for the interface, with warm dark text for readability. Do not recolor garments into the UI palette.
- The second reference supplies rounded category icons, softly outlined cards, cream backgrounds, and a spacious garment grid. These are visual references for already-defined functions, not a request for the source game's currencies or mechanics.
- The references establish shape, color, and tone. A specific font family was not requested; choose readable typography consistent with this direction during the technical plan. The review HTML now reflects the selected palette while remaining an explanatory document.

## Features and Behavior

### Photograph to Confirmed Garment Card
Source: `scope.md > The Core Loop` and `What “Working” Looks Like`.

Provide one garment photo, generate an illustrated preview, retain the original for comparison, choose a garment type, and confirm the record. When dissatisfied, regenerate or replace the photo with a clearer one.

Observable criteria:
- A demonstrated input garment produces a preview that can be compared with its original photo before confirmation.
- Confirming creates a wardrobe card; a rejected preview is not presented as an accepted garment record.
- Regenerate produces another attempt; replacing the source gives a way forward when photo clarity is the problem.
- A technical failure never appears as a successful generated card. Recovery uses the same retry/replace actions; exact wording is still open.

### Custom Organization and Entry-Date Sorting
Source: `scope.md > The POC Boundary` and `Daily Wear and Bound Sets`.

Define categories freely, whether by activity (camping, swimming) or garment type (skirt, trousers, set). Define tags or records for personal needs such as purchase time or a wish to sell. These examples do not establish an automatic resale workflow or a fixed financial schema. Choose newest-to-oldest or oldest-to-newest based on garment entry time, not purchase time.

Observable criteria:
- A personally entered category and tag/record can be attached to a garment and seen on return to the wardrobe.
- Two garments entered at different times reverse their relative order when the entry-date sort is reversed.

### Bound Sets and Wear Attribution
Source: `scope.md > Daily Wear and Bound Sets`.

Select existing garment cards and bind them as a set. Individual records remain available. For a saved set, record wearing the set and show the constituent garment's “作为 set 已被穿着 xx 次” information (English equivalent: “Worn as part of a set xx times”). For an unsaved combination, first ask whether to save it as a new set; saving follows the set path and declining records the garments individually.

Observable criteria:
- A set can be assembled from at least a top and a bottom already in the wardrobe, without uploading a separate outfit photo.
- Recording a saved set changes that set's wear record and its components' set-attributed wear information.
- Recording a previously unsaved combination displays the save-as-set prompt. Declining adds an individual wear to each selected garment.
- The same wear's set attribution is distinguishable from a separate independent garment-wear event. This is source attribution, not permission to double-count one event.

The set-attributed count is explicitly numeric. Broader lifetime-count versus frequency-label display was discussed; a two-mode display and frequency thresholds have not been approved. Multiple actual outfit changes on the same day each count separately. Submission safety, correction, and exact set matching are addressed by the explicitly proposed defaults below.

### First-Use Welcome and Guidance
Source: `scope.md > The Core Loop` and the first-use clarification during this product interview.

Before any clothes have been added, show a welcome and guidance that helps the project creator learn how to use the catalog. Begin with the established intake journey: upload one garment photograph, generate and inspect the illustrated preview, then confirm it into the wardrobe. Guidance can explain the already-defined organization, set binding, wear records, optional review, and separate archive. This does not establish extra tutorial pages, a mandatory checklist, or a quiz.

Observable criteria:
- With no garments recorded, the home screen displays a welcome and instructions rather than an impossible random garment prompt.
- The instructions explain how to make the first garment card using the actual intake steps.
- With active garments available, the normal daily-wear home behavior applies.

### Multiple Wear Records Per Day
Source: `scope.md > Daily Wear and Bound Sets`, clarified by the project creator during the product interview.

Count each actual wearing or outfit change, rather than limiting a garment to one wear per calendar day. The same garment can contribute to several distinct outfits in a single day. Each record follows the established saved-set or individual-garment attribution rules. An accidental duplicate submission is different from an intentional later outfit record; day-based deduplication must not erase real outfit changes.

Observable criteria:
- A white top worn with a black skirt and later with jeans on the same day accumulates two wears, not one.
- Three or four distinct outfit records can be entered on one day without the later records replacing or blocking earlier ones.
- Selecting an existing set for each separate outfit updates that set's wear record and its components' set-attributed counts for each occurrence.

### Daily Wear Home
Source: `scope.md > Daily Wear and Bound Sets`.

Show a random active garment and ask whether it was worn today. “No” is a wear-response action, not an archive action. Allow selecting one or multiple garments or sets for today's wear. Use the set-attribution rules above. The record accumulates over repeated use. The proposed defaults below make close/reopen retention and wear-record correction explicit for plan review.

Observable criteria:
- With active garments available, the home card comes from the current wardrobe, never the archive.
- Declining a wear prompt does not archive the garment or increment a wear count.
- Both single selection and multiple selection are possible for today's clothes.

### Optional Day-Based Wardrobe Review
Source: `scope.md > The Unique Kernel` and `The POC Boundary`.

The review is optional. Its interval is selectable in whole days from 7 through 365, inclusive. When due, show the reminder at the top inside the app on opening, then allow entering the one-card-at-a-time review. The two primary actions are a wardrobe icon to keep and a recycle icon to archive. Keep this review separate from the daily wear question.

Observable criteria:
- The review can remain disabled; enabling exposes a selectable integer interval of 7–365 days. Values outside this range are rejected with an explanation.
- After the enabled review becomes due, opening the app shows the reminder in a banner at the top; the review can lead to individual active garment cards.
- Keeping retains the garment in the current wardrobe. Recycling moves it to the separate archive.
- The review queue contains every current individual garment once. For example, 20 active individual garments plus 5 saved sets produce 20 review cards, not 25. Neither set cards nor archived garments enter the queue.

Reminder wording supplied by the project creator: “是时候来整理一下衣柜，看看有没有新衣服入柜和旧衣服出柜了？” English meaning: “Is it time to tidy your wardrobe and see whether new clothes should come in or old clothes should move out?” This invites a wardrobe check, including using the existing intake and archive flows. the project creator has selected an in-app top banner for this message. This does not establish an operating-system push-notification feature.

The review scope is confirmed: all current individual garments, not archived garments or saved set cards. Each garment appears once per review regardless of how many sets contain it. The interval anchor and saved review progress are proposed explicitly below for overall plan review. Extra review undo/skip/manual-pause controls are still outside the accepted requirements.

### Garment-to-Set Archival Linkage
Source: `scope.md > The Core Loop` and the archive clarification during this product interview.

Archiving an individual garment also archives existing set records containing it. The garment goes to the individual-garment archive page and the set records go to Past Sets. Their existing information and wear history remain available. Archived set cards leave current-wardrobe outfit selection.

Interpretation made explicit for review: the linked action applies to the set records; other constituent garments are not automatically archived. Each garment still follows its own keep/archive decision. This follows the established one-garment-at-a-time review rather than treating a set as a single physical garment.

Observable criteria:
- For a top-and-skirt set, archiving the skirt puts its single-garment card on the individual archive page and the set on Past Sets.
- That set is no longer offered as a current set to wear. The top stays in the current wardrobe unless separately archived.
- If several sets contain the archived garment, the affected set records follow the same archival rule without duplicating the single-garment archive card.
- Both archive pages retain the grey-list and full-color-detail behavior; set detail can show the constituent illustrations in color.

### Separate Archive With Color-Preserving Detail
Source: `scope.md > The Core Loop` and `The Unique Kernel`.

The archive has its own entry, separate from the current wardrobe, and two distinct pages: “Past sets” (Past Sets), exclusively for archived set records, and a page for archived individual garment cards. This separation avoids uncertainty about the current wardrobe. Grey is the archived thumbnail's presentation; it does not replace the stored original-color illustration. The full-color illustration, original photo, and existing garment information remain accessible in detail.

Observable criteria:
- An archived garment is absent from the current wardrobe, its active count, the random home selection, and subsequent periodic review selection.
- The same archived record appears grey on its appropriate Past Catalog page and in original color when opened.
- Archiving preserves the garment's source photograph and existing information.

## States and Boundaries

- **Existing wardrobe:** random active home card and normal browsing/wear/review flows are established.
- **First use / empty wardrobe:** show a welcome and concise usage guidance, starting with photographing one garment, reviewing its illustrated preview, and confirming its wardrobe card. Explain the existing organization, set/wear, and optional review/archive functions as guidance, without inventing a mandatory tutorial or quiz.
- **Unsatisfactory generated image:** regenerate or suggest a clearer source photo; do not require accepting a bad result.
- **Technical generation failure:** do not claim a generated card exists; retain a recovery route. The proposed recovery wording explains the failure without claiming success.
- **Unsaved outfit combination:** ask whether to store it as a set; allow declining and recording individual garments.
- **Archived record:** grey listing with preserved full-color detail, outside the current wardrobe. Archived individual garments and archived sets have distinct pages; archiving a garment also archives the sets containing it.
- **No active review cards:** explain that there are no current individual garments to review; never substitute archived garments or set cards.
- **Several outfit changes on one day:** each actual wearing is a separate record; allow several records without merging them by calendar date. The submission-safety, correction, and retention proposals below distinguish genuine later changes from accidental duplicate submissions.

## Product Decisions

- Real clothing should become a two-dimensional illustrated collection because the project creator expects this to make managing it feel lighter.
- The app interface uses the supplied pale pink/mauve/cream palette and a simple, fresh, rounded dressing-room style. Garment illustrations retain the garments' actual colors.
- First use should welcome and teach; once clothes are available, the home screen should ask about today's wear using a random current-wardrobe card.
- Sets are combinations bound from existing individual cards, and wear information retains whether a garment was worn as part of a set.
- Ask whether to save a previously unrecorded combination; declining does not prevent recording today's clothes.
- Count each actual outfit change, including several on the same day; a shared garment worn in two outfits counts twice.
- Sort by when clothing was entered, in either direction.
- Periodic review is an optional day-based feature, serving decluttering and fit checks after body changes. Its due reminder appears at the top inside the app, with the wording supplied by the project creator. Each round reviews all current individual garments, excluding set cards and the separate archive.
- Past Catalog has a separate entry from the current wardrobe and two pages, one for sets and one for individual garments. Mixing archived records with the current wardrobe creates uncertainty.
- Archiving a garment also archives set records containing it. This set linkage preserves the former outfit without continuing to present it as an available whole set.
- Archived thumbnail greyness is reversible display styling on preserved color content.
- Avatar and body-measurement try-on are deferred from this first proof of concept.

## What We're Building

The approved scope comprises photo-to-illustration intake and confirmation, an active wardrobe with custom organization, saved bound sets and attributed wear records, a mobile daily-wear home, entry-date sorting, optional day-based review, and the separate color-preserving archive. The observable criteria above define evidence for that scope. This plan and its explicitly identified operating defaults are approved as the product basis; technical choices remain a separate stage.

## Deferred From the POC

The adjustable body avatar, measurement entry, garment placement, and visual length adjustment remain later work. A scaled illustration alone does not establish real-world fit.

## Non-Goals

No claim of accurate garment fit, fabric simulation, or automatic sizing. No outfit recommendation engine is implied by manually bound sets. A frequency-label threshold system and extra count display modes are not approved requirements.

## Operating Defaults Adopted With the Plan

These defaults originated as assistant proposals, displayed separately during product review. They are adopted with the instruction to proceed; they are not retrospectively attributed to the initial product idea.

1. **Review timing:** the confirmed control is 7–365 whole days. On first enabling the cycle, count from the enable date. After completing all individual cards in a round, count the selected interval again from the completion date. For example, choosing 30 days means the next reminder is 30 days after finishing this round. Leaving the round unfinished does not silently mark it complete.
2. **Wear saves and correction:** each deliberate save represents one actual wearing. Ignore accidental duplicate submission of that same save while allowing a separate later outfit record, including on the same day. An accidentally saved wear can be removed; garment and set counts are recomputed from the remaining records.
3. **Saved data and progress:** closing and reopening retains source photos, illustrations, categories, tags/records, bound sets, wear history, archive states, and cycle settings. Keep completed keep/archive decisions and the unreviewed cards for an unfinished round; returning continues from the remaining individual cards. This is saved progress, not an extra manual pause/skip screen.
4. **Set matching:** selecting a saved set explicitly records that set. A selection of single garments matches a saved set only when its constituent garments are exactly the same; a partially overlapping set is not the same outfit. For one outfit record, a shared garment is counted once even if several selected set references contain it; a later distinct wearing still adds another count.
5. **Custom organization:** allow self-entered category names and free-text tags/records, including purchase dates or a wish to sell. Keep garment type separate from these personal labels. Do not require a fixed shopping or resale form.
6. **Daily “No”:** leave counts unchanged and keep access to selecting today's actual clothes visible. This response never archives a garment. For an empty wardrobe, show the confirmed welcome and actual intake instructions instead.

Checks for these proposals, under this approved plan: a 30-day setting restarts from completed review; two intentional same-day outfit saves both count; one accidentally repeated save does not; removing a mistaken wear updates related counts; close/reopen restores saved records and the remaining review cards; partially overlapping combinations do not select the wrong set.

## Open Questions and Stage Boundaries

The product plan is approved. Carry the recorded behavior forward without reopening the established palette, archive separation, review scope, or same-day wear counts.

Technical decisions and a real photo-to-illustration feasibility check belong to `4-spec`; this document does not select a framework, storage implementation, image provider, or deployment. None has been verified yet.

Before external publication, the project creator chooses the public project name and authors the public description and submission answers under the official curriculum's learner-authorship rules.

Still outside this proof of concept unless separately requested: archive restore; extra review undo/skip/manual-pause controls; frequency words or dual count-display modes; body avatar and fit simulation. Saved review progress is included in the adopted operating defaults.
