# Moodboard - Gemini Canvas Specification

## What This App Does

A drag-and-drop moodboard creator that allows users to:
- Upload images via drag-and-drop
- Arrange images in a responsive grid layout
- Resize and reposition images within their frames
- Export the final moodboard as a PNG image

---

## Current Architecture Analysis

### Current Stack
| Layer | Technology |
|-------|------------|
| **Backend** | None (static Next.js) |
| **Frontend** | Next.js 15 + React 18 + TypeScript |
| **Database** | None (in-memory state only) |
| **APIs** | None (all client-side) |
| **Auth** | None |
| **Storage** | Browser memory (blob URLs) |

### Key Dependencies
- `react-grid-layout` - Draggable/resizable grid system
- `html2canvas` - DOM-to-image export

### Canvas Migration Viability: **EXCELLENT**

This app is an ideal Canvas candidate because:
- No backend required
- No database/persistence needed
- No external API calls
- Pure client-side functionality
- All features work in browser

---

## Key Features

| Feature | Description | Canvas Compatible |
|---------|-------------|-------------------|
| Image Upload | Drag-and-drop file upload | Yes - File API |
| Grid Layout | Draggable/resizable grid | Yes - CSS Grid + JS |
| Image Panning | Reposition image within frame | Yes - CSS object-position |
| Export to PNG | Convert DOM to downloadable image | Yes - Canvas API |
| File Validation | Max 10MB file size check | Yes - File API |

---

## Architecture Decisions for Canvas

### What We Keep (Same Approach)
- **Drag-and-drop upload**: HTML5 File API works identically
- **Image validation**: Client-side file size/type checks
- **In-memory state**: React state management
- **Export functionality**: Canvas API for image export

### What We Change
| Original | Canvas Version | Reason |
|----------|----------------|--------|
| `react-grid-layout` library | Custom CSS Grid + Drag API | Canvas doesn't bundle npm packages |
| `html2canvas` library | Native Canvas API | Direct DOM-to-canvas implementation |
| TypeScript | JavaScript | Canvas generates plain JS |
| Multiple files/hooks | Single HTML file | Canvas produces single-file apps |

### What We Remove
- Next.js framework (not needed)
- TypeScript type definitions
- Build tooling

---

## Technical Implementation for Canvas

### Core State Structure
```javascript
// Image data stored in state
const images = [
  {
    id: 'img-123',
    src: 'data:image/...', // Base64 data URL
    x: 0,      // Grid column position
    y: 0,      // Grid row position
    w: 2,      // Width in grid units
    h: 3,      // Height in grid units
    offsetX: 0, // Pan offset within frame
    offsetY: 0
  }
]
```

### Grid System (Pure CSS/JS)
```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-auto-rows: 50px;
  gap: 4px;
}

.grid-item {
  cursor: move;
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  background: #222;
}
```

### Drag-and-Drop Implementation
```javascript
// Native HTML5 Drag API
function handleDrop(e) {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files)
    .filter(f => f.type.startsWith('image/'))
    .filter(f => f.size <= 10 * 1024 * 1024); // 10MB max

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      addImage(e.target.result); // Base64 data URL
    };
    reader.readAsDataURL(file);
  });
}
```

### Grid Item Dragging (Custom)
```javascript
// Custom grid drag implementation
let draggedItem = null;

function startDrag(e, imageId) {
  draggedItem = imageId;
  e.dataTransfer.setData('text/plain', imageId);
}

function onGridDrop(e, targetX, targetY) {
  if (draggedItem) {
    updateImagePosition(draggedItem, targetX, targetY);
    draggedItem = null;
  }
}
```

### Resize Handles
```javascript
// Resize by dragging corners
function startResize(e, imageId, corner) {
  const startX = e.clientX;
  const startY = e.clientY;
  const image = images.find(i => i.id === imageId);
  const startW = image.w;
  const startH = image.h;

  function onMove(e) {
    const deltaX = Math.round((e.clientX - startX) / gridCellWidth);
    const deltaY = Math.round((e.clientY - startY) / gridCellHeight);
    updateImageSize(imageId,
      Math.max(1, startW + deltaX),
      Math.max(1, startH + deltaY)
    );
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', onMove);
  }, { once: true });
}
```

### Export Implementation (Native Canvas)
```javascript
async function exportMoodboard() {
  const container = document.querySelector('.grid-container');
  const rect = container.getBoundingClientRect();

  // Create canvas at 2x resolution
  const canvas = document.createElement('canvas');
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Draw each image
  for (const img of images) {
    const imgEl = document.querySelector(`[data-id="${img.id}"] img`);
    const itemRect = imgEl.parentElement.getBoundingClientRect();

    ctx.drawImage(imgEl,
      itemRect.left - rect.left,
      itemRect.top - rect.top,
      itemRect.width,
      itemRect.height
    );
  }

  // Trigger download
  const link = document.createElement('a');
  link.download = 'moodboard.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

---

## UI/UX Implementation

### Main Interface Components

```
┌────────────────────────────────────────────┐
│            ERROR BANNER (if error)          │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────┐ ┌──────────┐ ┌──────┐          │
│  │  ×   │ │    ×     │ │  ×   │          │
│  │ IMG1 │ │   IMG2   │ │ IMG3 │          │
│  │  ⊞   │ │    ⊞     │ │  ⊞   │          │
│  └──────┘ │          │ └──────┘          │
│           │          │                    │
│           └──────────┘                    │
│                                            │
│         "Drag images here to upload"       │
│              (when empty)                  │
│                                            │
├────────────────────────────────────────────┤
│         [ EXPORT MOODBOARD ]               │
└────────────────────────────────────────────┘
```

### Styling
- Dark theme: `#000` background, `#111` grid cells
- Accent color: `#2196f3` (blue) for buttons, hover states
- Font: System font stack
- Rounded corners: 4px
- Shadows for depth

---

## User Workflow

1. **Open App** → See empty grid with "Drag images here" message
2. **Drag Files** → Drop zone highlights, files validate and load
3. **Images Appear** → Auto-positioned in grid, 2 columns wide
4. **Arrange** → Drag images to reorder, drag corners to resize
5. **Pan Images** → Use move icon to reposition image within frame
6. **Delete** → Hover to see X button, click to remove
7. **Export** → Click button, PNG downloads automatically

---

## Error Handling

| Scenario | User Sees | Action |
|----------|-----------|--------|
| File too large (>10MB) | Red banner: "Files too large: [names]" | Auto-dismiss after 5s |
| Invalid file type | Files silently ignored | Only process images |
| Export fails | Red banner: "Export failed" | Retry available |
| No images to export | Export button hidden | N/A |

---

## Cost Structure

| Operation | Cost |
|-----------|------|
| App Generation | Free (Gemini Canvas) |
| Runtime | Free (browser-only) |
| Storage | None (client memory) |
| Total | **$0** |

---

## Migration Gotchas

### Challenge 1: No NPM Packages
**Problem**: Canvas can't import `react-grid-layout`
**Solution**: Implement custom grid with CSS Grid + native Drag API

### Challenge 2: Image Export
**Problem**: Can't use `html2canvas` library
**Solution**: Use native Canvas API to draw images directly

### Challenge 3: TypeScript
**Problem**: Canvas generates JavaScript only
**Solution**: Remove types, rely on runtime behavior

### Challenge 4: Multi-file Structure
**Problem**: Canvas produces single HTML file
**Solution**: Inline all CSS, combine all JS logic

---

## Known Limitations

1. **No persistence**: Refreshing page clears all images
2. **Browser memory**: Large images may cause performance issues
3. **Mobile support**: Drag-and-drop limited on touch devices
4. **No undo**: Deleted images cannot be recovered

---

## Potential Enhancements (Post-MVP)

- **localStorage persistence**: Save/restore moodboard state
- **Cloud storage**: Google Drive integration for images
- **Touch support**: Mobile-friendly drag gestures
- **Templates**: Pre-built layout templates
- **Backgrounds**: Custom background colors/images
