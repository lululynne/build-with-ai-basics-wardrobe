# Asset provenance

## Public demo clothing

- `public/samples/blue-shirt-source.jpg`: **Blue-tshirt.jpg**, by Paulinaela. Source: https://commons.wikimedia.org/wiki/File:Blue-tshirt.jpg . License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/ . This is a public demonstration sample, not a photograph of the project creator's personal clothing.
- `public/samples/blue-shirt-catalog.jpg`: generated from that CC0 source during this project using Google's `gemini-nano-banana-2.1` model, through the official Gemini API. The source and generated illustration remain separate. The prompt preserves the photographed garment's color, cut, neckline, shoulder seams, sleeves, and hem while converting it to a fashion-catalog illustration.

## Interface references

The color card, wardrobe-game screenshot, and fashion illustration supplied during planning are private visual references, not bundled redistributable assets. The UI palette and original drawings carry forward the design direction.

## Original UI artwork received for this project

The seven files below were supplied by Meibao for this project. Originals remain unchanged in the ignored local source folder. All images were inspected, have real alpha transparency and transparent corners, and retain safe margins. The accepted assets have been used in the running mobile and desktop layouts; physical-phone testing is still separate.

| File | Contributor | Dimensions | Use |
| --- | --- | --- | --- |
| `public/art/wardrobe-welcome.png` | Shark | 1024×1024 | Welcome and empty wardrobe decoration |
| `public/art/icons/wardrobe-keep.png` | Nana | 256×256 | Wardrobe / keep |
| `public/art/icons/archive-box.png` | Nana | 256×256 | Archive / storage |
| `public/art/icons/garment-single.png` | Nana | 256×256 | Individual garment |
| `public/art/icons/outfit-set.png` | Nana | 256×256 | Bound outfit set |
| `public/art/icons/photo-add.png` | Nana | 256×256 | Add garment photo |
| `public/art/icons/review-cycle.png` | Nana | 256×256 | Day-based wardrobe review |

Shark's delivered illustration matches the HostDzire return byte-for-byte. The received provenance reports the Muse media generation pipeline and local exterior-background extraction; see `design/provenance/shark-welcome.md`. It explicitly supersedes the earlier brown-wood draft, which must not be used. The illustration's pictured clothes are decoration, not saved wardrobe records.

Nana's source note reports original hand-written SVG geometry, rendered to PNG with CairoSVG, without third-party icons, fonts, stock art, or an image-generation model. The six delivered 256px PNGs match the accepted in-app icon files byte-for-byte. The note explicitly permits use, modification and redistribution for this project, including under an open-source license; see `design/provenance/nana-icons.md`. The private visual references are excluded from distribution.

## Local garment reference batch

Additional garment photographs supplied for local evaluation and their generated wardrobe cards remain in ignored local directories. They are not distributed with the public sample assets or code. Their original bytes and generation/confirmation receipts are preserved locally; no publication license or personal ownership is inferred.
