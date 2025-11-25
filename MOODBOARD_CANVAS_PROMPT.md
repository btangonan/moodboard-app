# Moodboard - Gemini Canvas Prompt

**Copy and paste the content below into Gemini Canvas:**

---

## GEMINI CANVAS PROMPT

Create a fully functional **Moodboard Creator** web application with the following specifications:

### App Overview
A drag-and-drop moodboard tool where users can upload images, arrange them in a flexible grid, resize them, reposition the image within its frame, and export the final composition as a PNG.

### Core Features

**1. Image Upload via Drag-and-Drop**
- Drop zone covering the main grid area
- Accept only image files (image/*)
- Validate file size (max 10MB per image)
- Show error banner for rejected files
- Convert uploaded files to base64 data URLs immediately
- Auto-position new images in the grid (2 columns wide, height based on aspect ratio)

**2. Responsive Grid Layout**
- 10-column grid system
- Row height: 50px per unit
- Images can span multiple columns and rows
- Smooth drag-to-rearrange functionality
- Resize by dragging corner handles
- Prevent items from overlapping (items push each other)
- 4px gap between grid items

**3. Image Manipulation**
- **Move**: Drag entire image to new grid position
- **Resize**: Drag corner to change width/height in grid units
- **Pan**: Drag within the image to adjust crop/position (object-position)
- **Delete**: X button appears on hover, click to remove

**4. Export to PNG**
- "Export Moodboard" button below the grid
- Capture grid at 2x resolution for quality
- Transparent background (no grid chrome)
- Hide delete buttons and pan handles during capture
- Auto-download as "moodboard.png"

### Technical Requirements

**No External Libraries** - Use only vanilla HTML, CSS, and JavaScript:
- CSS Grid for layout
- HTML5 Drag and Drop API for file upload
- Custom drag implementation for grid repositioning
- Native Canvas API for export
- FileReader API for image loading

**State Management**:
```javascript
// Each image stored as:
{
  id: string,        // Unique identifier
  src: string,       // Base64 data URL
  x: number,         // Grid column (0-9)
  y: number,         // Grid row
  w: number,         // Width in grid units (1-10)
  h: number,         // Height in grid units (1+)
  panX: number,      // Pan offset X (0-100%)
  panY: number       // Pan offset Y (0-100%)
}
```

**UI Components**:

1. **Error Banner** (conditional):
   - Red background (#ef4444 at 90% opacity)
   - White text with dismiss button
   - Slides in from top, auto-dismisses after 5 seconds

2. **Drop Zone / Grid Container**:
   - Black background (#111)
   - Dashed border (#444), turns blue (#2196f3) on drag-over
   - 16:9 aspect ratio
   - 80% viewport width, centered
   - Shows "Drag images here to upload" when empty

3. **Grid Item**:
   - Dark background (#222)
   - 4px border-radius
   - Subtle shadow
   - Blue glow on hover
   - Cursor: move

4. **Delete Button** (per item):
   - Red circular button (22px)
   - Top-right corner
   - Hidden by default, shows on hover
   - × symbol

5. **Pan Handle** (per item):
   - Move icon (4-directional arrows)
   - Top-left corner, dark semi-transparent background
   - Shows on hover or when image is larger than container

6. **Resize Handle** (per item):
   - Bottom-right corner
   - Diagonal resize cursor
   - Shows on hover

7. **Export Button**:
   - Blue background (#2196f3)
   - White uppercase text
   - Full-width below grid
   - Disabled state while exporting

**User Flow**:
1. User opens page → empty grid with placeholder message
2. User drags image files onto grid → files validate, convert to base64, appear in grid
3. User drags images → items rearrange in grid
4. User drags corners → items resize
5. User drags pan handle → image repositions within frame
6. User hovers item → delete button appears
7. User clicks delete → item removed
8. User clicks Export → PNG downloads

**Error Handling**:
- Files over 10MB: Show banner "Files too large (max 10MB): [filename1], [filename2]"
- Non-image files: Silently ignore
- Export failure: Show banner "Export failed. Please try again."

**Styling**:
- Dark theme throughout
- Background: #000000
- Grid background: #111111
- Grid items: #222222
- Accent: #2196f3 (blue)
- Error: #ef4444 (red)
- Text: white and #888888 (muted)
- Font: system-ui, -apple-system, sans-serif
- All interactive elements should have smooth transitions (0.2s)

**Grid Behavior**:
- New images default to 2 columns wide
- Height calculated from aspect ratio: `Math.round((width * (naturalHeight/naturalWidth)) / 50)`
- Minimum size: 1x1 grid units
- Items cannot overlap - use collision detection to push items down
- Auto-arrange: new items fill next available position left-to-right, top-to-bottom

**Export Logic**:
1. Get bounding rect of grid container
2. Create canvas at 2x dimensions
3. Iterate through each image in state
4. For each image:
   - Get its position/size from its DOM element
   - Draw onto canvas at correct position with correct object-fit/position
5. Convert canvas to PNG data URL
6. Create download link and click it

Create this as a single-page web application that runs entirely in the browser with no server dependencies. The app should be immediately functional when the page loads.
