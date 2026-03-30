# Session Checkpoint — my-grid-app
**Date**: 2026-03-30

## Decisions Made
- Dev server moved to port 3001 (`next dev -p 3001` in package.json)
- `scripts/chop_grid.py`: auto-detect grid cols/rows per image using character density peaks
- Cut boundaries use valley minimum (argmin of smoothed density between peaks), not midpoints
- Dark separator pixels (R<80,G<80,B<80) excluded from density to avoid false row peaks

## Fixes Applied
- **Root cause — two characters per crop**: hardcoded `--cols 5` failed on 6-col images. Fixed with per-image auto-detection.
- **Root cause — row bleed**: midpoint cut placed boundary past dark separator line. Fixed with valley minimum.
- **Root cause — extra row detection**: dark separator lines spiked density to 1.0, masking valley. Fixed by excluding dark pixels from `is_char`.

## Progress
- `scripts/chop_grid.py` created and working — auto-detects variable grid layouts
- Keebler batch_01: 10 character sheets → 104 images in `chopped/` (9×5-col, 1×6-col correctly handled)

## Tips & Gotchas Discovered
- Keebler batch_01: mixed grid sizes (9 files 5×2, 1 file 6×2) — never assume uniform cols across a batch
- Two separator types in these AI grids: yellow gap (density→0) and dark line (density→1.0)
- Smooth kernel k=150 needed for rows; k=80 caused false sub-character peaks
- `Screenshot` and `yellow only.png` in same dir get processed — not harmful but produce junk output

## Memories Logged
- 5 new memories → my_grid_app_memory

## Next Session Suggested Start
→ Run chop_grid.py on additional Keebler batches as they become available
