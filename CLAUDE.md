# CLAUDE.md — my-grid-app

## Project Identity
Moodboard maker — drag images onto a 16:9 canvas, resize/reposition, export as PNG.
Next.js 15, TypeScript, react-grid-layout, Pages Router. **Frontend only. No backend, no auth, no DB.**

## Stack
- `next` (Pages Router), `react-grid-layout` — drag/resize grid
- `dom-to-image-more`, `html2canvas` in package.json but **NOT USED** — export is native Canvas API
- `npm run dev` → http://localhost:3000 (check `lsof -i :3000` first)

## Key Files
| File | Role |
|---|---|
| `components/GridLayout.tsx` | Main component: canvas, drop zone, export controls, gap slider |
| `hooks/useImageUpload.ts` | Drop handling, base64 conversion, grid placement math |
| `hooks/useExport.ts` | Canvas export (native `drawImage`), position labels, resolution scaling |
| `hooks/useImagePan.ts` | Pan/reposition image within cell (drag handle) |
| `hooks/types.ts` | Shared types: `MoodboardImage`, `ExportResolution`, `DragInfo`, constants |
| `styles/globals.css` | Layout, overflow fixes (overflow:hidden on .drop-zone) |
| `pages/index.tsx` | Thin wrapper — just renders `GridLayoutComponent` |

## Architecture Decisions
- **Export**: Native Canvas `drawImage` directly from DOM `<img>` elements. Scale = `targetRes.width / gridRect.width`. No library needed.
- **Image storage**: Base64 data URLs (FileReader), not blob URLs — intentional for cross-tab support.
- **Pan offset**: Stored in pixels in `MoodboardImage.offset`. Converted to CSS `object-position %` for display; converted again to `objectPositionXPercent/Y` for canvas crop on export.
- **Grid constants**: 10 cols, 50px row height. New images: w=2, h from natural aspect ratio. Placement: `x=(i*2)%10`, `y=floor((i*2)/10)`.
- **Canvas sizing**: `maxWidth=min(vw×0.9, 1600)`, `maxHeight=vh×0.7`, constrained to 16:9 via window resize listener.

## Current Features (as of 2026-03)
- ✅ Drag-and-drop upload (30MB limit, multi-file, base64)
- ✅ Grid drag/resize (react-grid-layout, 10 cols)
- ✅ Grid gap slider (0–16px, step 2, default 4px)
- ✅ Image pan/reposition within cells (pan handle, clamped to ±halfMaxOffset)
- ✅ Export: HD (1920×1080) / UHD (3840×2160) / 6K (6144×3456), default UHD
- ✅ Position labels on export only (R{row}P{pos}, canvas-drawn, not in DOM preview)
- ✅ 16:9 dynamic canvas (responsive to viewport)
- ✅ Pan offset resets when cell is resized

## Known Gotchas
- `dom-to-image-more` + `html2canvas` in `package.json` but unused — don't reach for them
- CSS `aspect-ratio` on `.drop-zone` was removed — it conflicted with JS dimensions and hid the export button (overflow fix: `overflow:hidden`, `z-index:100` on `.export-controls`)
- `margin={[gap, gap]}` on `GridLayout` handles spacing — removing CSS padding override prevents double-spacing

---

## 🧠 Project Memory (Chroma)
Use server `chroma`. Collection `my_grid_app_memory`.

Log after any confirmed fix, decision, gotcha, or preference.

**Schema:**
- **documents**: 1–2 sentences. Under 300 chars.
- **metadatas**: `{ "type":"decision|fix|tip|preference", "tags":"comma,separated", "source":"file|PR|spec|issue" }`
- **ids**: stable string if updating the same fact.

### Chroma Calls
```javascript
// Add:
mcp__chroma__chroma_add_documents {
  "collection_name": "my_grid_app_memory",
  "documents": ["<text>"],
  "metadatas": [{"type":"<type>","tags":"a,b,c","source":"<src>"}],
  "ids": ["<stable-id>"]
}

// Query (start with 5; escalate only if <3 strong hits):
mcp__chroma__chroma_query_documents {
  "collection_name": "my_grid_app_memory",
  "query_texts": ["<query>"],
  "n_results": 5
}
```

## 🔍 Retrieval Checklist Before Coding
1. Query Chroma for related memories.
2. Check repo files that match the task.
3. Only then propose changes.

## 📝 Memory Checkpoint Rules
Every 5 interactions or after completing a task: log new decisions, fixes, preferences to Chroma immediately.

## ⚡ Activation
Read this file at session start.
Announce: **Contract loaded. Using Chroma `my_grid_app_memory`.**

## 🧹 Session Hygiene
Save long outputs in `./backups/` and echo paths.

## 🛡️ Safety
No secrets in Chroma or transcripts. Respect rate limits.
