---
doc: scope
status: approved
---

# Illustrated wardrobe catalog — working scope

The public project name will be chosen by the project creator. This is a planning document, not submission copy.

A personal wardrobe catalog that turns photographs of real garments into illustrated collectible cards, then supports a comfortable, one-card-at-a-time wardrobe review.

## The Unique Kernel
Real clothes become a consistent illustrated collection. Periodic review feels like browsing that collection: keep a garment in the wardrobe or archive its card in the “Past catalog” collection. Archived thumbnails are grey, while the detail still shows the original color image.

## Who It's For
the project creator wants to manage a real personal wardrobe with less effort and a lighter emotional experience. The optional review also serves someone with many clothes, a wish to declutter, or a reason to check fit after a body change. The current method of cataloging clothes has not been described.

## The Core Loop
Add one garment photo, generate and confirm an illustrated card, and organize it with self-defined categories and tags or records. Return to browse the wardrobe or, when an enabled day-based review is due, examine cards one by one. A wardrobe action retains a garment; a recycle action archives its record in “Past catalog”. The archive has its own entry, separate from the current wardrobe, with two distinct pages: archived sets (“Past sets”) and archived individual garments. Archiving a garment also archives its containing set records; the other garments retain their individual keep/archive state. Archived garments leave the active wardrobe and are excluded from its counts and review queue. Opening an archived record reveals the full-color illustration and original photo.

## Daily Wear and Bound Sets
the project creator has further defined the mobile home screen: show a random card from the current wardrobe and ask whether it was worn today. The wearer can also select one or several garments or saved sets for today's wear. The app records wear counts. Wearing an existing set records a wear for that set, and constituent garment details show how many times the garment was worn as part of a set. For a combination that is not yet saved as a set, ask whether to save it first; declining records one wear for each selected garment. Each actual outfit change counts separately, including multiple changes on one day. Accidental repeated submissions and editing remain PRD questions.

A set is created by selecting existing individual garment cards and binding them together. Each garment can first be assigned a type such as top or bottom. This is not a second upload of a whole outfit. The wardrobe can be sorted by garment entry time, newest-first or oldest-first. These additions were explicitly requested by the project creator during the product interview; they do not imply an outfit recommendation engine.

## Inspiration & Identity
The supplied fashion illustration reference shows front-facing garments, clean outlines, restrained flat shading, and recognizable lace, folds, bows, and construction details. It is a style reference, not a licensed asset to redistribute. The emotional direction is the project creator's phrase: “舒服地检查自己衣橱的过程” — a comfortable process of checking one's own wardrobe.

For the app interface, the project creator supplied a pale pink/mauve/cream color card (`#f0e0e3`, `#e0cbd2`, `#beafb2`, `#eee1de`) and a rounded wardrobe-grid reference. The desired feel is simple, Korean-inspired, low-saturation, fresh, and cute. This interface palette does not replace the photographed clothes' real colors.

## Why This Matters to the Learner
The creator said that managing real clothes like illustrated game clothes would feel easier. The intent is to make real clothes feel easier to see, organize, and make decisions about. No separate learning outcome has yet been stated.

## What “Working” Looks Like
A demonstration can show a real single-garment upload becoming an illustrated wardrobe record, a custom category and record being saved, and a review card being retained or archived. The archived card appears grey in “Past catalog”; opening it shows its original colors. The decision changes the record's state without destroying the stored image.

## The POC Boundary
- A single person's wardrobe with photo-to-illustration garment cards and access to the original photo.
- Self-defined categories, tags, and useful garment records; exact record types belong in the PRD.
- Saved sets bound from existing individual garment cards, a daily-wear home screen with single/multiple selection, wear counts, and sorting by garment entry time. Set wear is attributed to the set and its constituent garments; an unsaved combination prompts for saving as a set before recording individual wears if declined. Each outfit change counts separately even on the same day; accidental-duplicate and editing behavior remains a PRD question.
- Optional wardrobe review with a configurable 7–365-day interval, covering all current individual garment records, with the one-card-at-a-time keep/archive interaction. Saved set cards and archived garments do not enter this queue.
- A separate “Past catalog” entry with distinct pages for archived set cards and archived individual garment cards, using grey list presentation and full-color details. Archiving an individual garment also archives its containing sets. Archived records leave current selection; archived garments do not appear in the current wardrobe, its counts, or its periodic review queue.

The scope was approved after visual review. the project creator clarified that “Past catalog” must be a separate place and page, like an archive, so it cannot be confused with the current wardrobe. The primary usage device is a mobile phone, as confirmed by the project creator. The mobile home experience is being refined in the PRD; the project creator has selected an in-app top banner for due review reminders. Suggested undo/skip/pause behavior remains unconfirmed. Browser versus native delivery remains a later technical choice. This approved scope is not a completed PRD or technical specification.

## Later
An adjustable two-dimensional body avatar, garment placement, and visual length adjustment. Meaningful body-versus-clothing comparisons require garment measurements as well as body measurements; changing an illustration's scale alone does not establish real-world fit.

## Explicitly Cut
The body avatar and measurement-based try-on are deferred from this proof of concept. Accurate fit, fabric behavior, and automatic sizing are not claimed. The approved first-version scope is the complete illustrated-wardrobe and review/archive loop.
