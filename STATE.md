# STATE.md — Working State (re-read after compaction)
## Updated: 2026-03-30 14:00

### Active Work
- `scripts/chop_grid.py` — grid image splitter for Keebler AI character sheets
- Keebler batch_01 chopped: 104 images in `/Volumes/Tihany_Shoestation/Keebler/ai_output/batch_01_yellow bkg/chopped/`
- Dev server running on port 3001

### Key IDs
- Input: `/Volumes/Tihany_Shoestation/Keebler/ai_output/batch_01_yellow bkg/`
- Script: `scripts/chop_grid.py`

### Decisions This Session
- Dev server moved to port 3001 (package.json updated)
- chop_grid.py: auto-detect cols/rows per image (character density peaks, k=150)
- chop_grid.py: exclude dark separator pixels from density (fixes row detection)
- chop_grid.py: cut at valley minimum between peaks (not midpoint)

### Blockers
- None

### Last Session Snapshot
Date: 2026-03-30
Open actions:
Decisions: 4 | Fixes: 2 | Progress: 1
Next: → Run chop_grid.py on additional Keebler batches as they become available
