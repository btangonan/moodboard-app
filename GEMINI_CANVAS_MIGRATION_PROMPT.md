# Moodboard Creator - Complete Gemini Canvas Migration Guide

## COPY EVERYTHING BELOW THIS LINE INTO GEMINI CANVAS

---

# BUILD THIS: Moodboard Creator Web Application

Create a **fully functional Moodboard Creator** - a drag-and-drop image arrangement tool that runs entirely in the browser with NO external dependencies.

## What This App Does

Users can:
1. **Drag image files** onto the canvas to upload them
2. **Arrange images** in a flexible grid layout by dragging
3. **Resize images** by dragging corner handles
4. **Pan/reposition** the visible portion of each image within its frame
5. **Delete images** via hover X button
6. **Export** the final composition as a high-quality PNG

---

## Technical Constraints

**CRITICAL: No External Libraries**
- NO npm packages
- NO React, Vue, Angular
- NO react-grid-layout
- NO html2canvas
- Use ONLY vanilla HTML, CSS, and JavaScript
- Single HTML file output

---

## Data Architecture

### Image State Object
Each image in the moodboard is stored with this structure:

```javascript
// Global state array
let images = [];

// Each image object:
{
  id: "img-1234567890-0-0.5678",  // Unique ID: img-{timestamp}-{index}-{random}
  src: "blob:...",                 // Blob URL from File API
  x: 0,                            // Grid column position (0-9)
  y: 0,                            // Grid row position (0+)
  w: 2,                            // Width in grid units (1-10)
  h: 3,                            // Height in grid units (1+)
  offset: { x: 0, y: 0 }           // Pan offset in PIXELS (not percentage)
}
```

### Grid System Constants
```javascript
const COLUMN_COUNT = 10;           // 10-column grid
const ROW_HEIGHT = 50;             // Each row unit = 50px
const MAX_FILE_SIZE_MB = 10;       // Max upload size
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
```

---

## Core Algorithms

### 1. Calculate Grid Dimensions from Image Aspect Ratio

When an image is uploaded, calculate how many grid units it should occupy:

```javascript
function calculateGridDimensions(naturalWidth, naturalHeight, containerWidthPx) {
  const columnWidth = containerWidthPx / COLUMN_COUNT;
  const w = 2; // Default width: 2 columns
  const widthInPx = w * columnWidth;

  // Maintain aspect ratio
  const aspectRatio = naturalHeight / naturalWidth;
  const targetHeightPx = widthInPx * aspectRatio;
  const h = Math.max(1, Math.round(targetHeightPx / ROW_HEIGHT));

  return { w, h };
}
```

### 2. Auto-Position New Images in Grid

Place new images in available grid positions:

```javascript
function calculatePosition(existingImageCount) {
  const index = existingImageCount;
  const x = (index * 2) % COLUMN_COUNT;  // 2 columns per image, wrap at 10
  const y = Math.floor((index * 2) / COLUMN_COUNT);
  return { x, y };
}
```

### 3. Calculate Maximum Pan Offset

Determine how far an image can be panned within its container:

```javascript
function calculateMaxOffset(containerElement, imgElement) {
  const containerRect = containerElement.getBoundingClientRect();
  const imgRatio = imgElement.naturalWidth / imgElement.naturalHeight;
  const containerRatio = containerRect.width / containerRect.height;

  if (imgRatio > containerRatio) {
    // Image is WIDER than container - can pan horizontally
    const scaledHeight = containerRect.height;
    const scaledWidth = scaledHeight * imgRatio;
    const maxOffsetX = scaledWidth - containerRect.width;
    return { x: maxOffsetX, y: 0 };
  } else {
    // Image is TALLER than container - can pan vertically
    const scaledWidth = containerRect.width;
    const scaledHeight = scaledWidth / imgRatio;
    const maxOffsetY = scaledHeight - containerRect.height;
    return { x: 0, y: maxOffsetY };
  }
}
```

### 4. Calculate CSS object-position from Pixel Offset

Convert pixel offset to CSS percentage for `object-position`:

```javascript
function calculateObjectPosition(offset, maxOffset) {
  if (!offset) return '50% 50%'; // Default: centered

  // Convert pixel offset to percentage deviation from center
  // offset.x is in range [-maxOffset.x/2, maxOffset.x/2]
  const x = maxOffset.x > 0 ? (offset.x / maxOffset.x) * 100 : 0;
  const y = maxOffset.y > 0 ? (offset.y / maxOffset.y) * 100 : 0;

  // Add to 50% (center) to get final position
  // Result ranges from 0% to 100%
  return `${50 + x}% ${50 + y}%`;
}
```

### 5. Clamp Pan Offset to Prevent Empty Space

**CRITICAL**: Limit panning so image edges never go inside the container:

```javascript
function clampOffset(newOffset, maxOffset) {
  // Clamp to HALF the max offset to keep object-position in 0%-100% range
  const halfMaxX = maxOffset.x / 2;
  const halfMaxY = maxOffset.y / 2;

  return {
    x: Math.max(-halfMaxX, Math.min(halfMaxX, newOffset.x)),
    y: Math.max(-halfMaxY, Math.min(halfMaxY, newOffset.y))
  };
}
```

### 6. Export with Cover-Crop Calculation

**CRITICAL**: This is the most complex algorithm. It calculates the source rectangle for `ctx.drawImage()` to match CSS `object-fit: cover` behavior:

```javascript
function calculateCoverCrop(imgWidth, imgHeight, containerWidth, containerHeight, objectPositionXPercent, objectPositionYPercent) {
  const imgRatio = imgWidth / imgHeight;
  const containerRatio = containerWidth / containerHeight;

  let sx, sy, sw, sh;

  if (imgRatio > containerRatio) {
    // Image is wider - crop horizontally
    sh = imgHeight;
    sw = imgHeight * containerRatio;
    const maxOffsetX = imgWidth - sw;
    // Convert object-position percentage to source x coordinate
    sx = (objectPositionXPercent / 100) * maxOffsetX;
    sy = 0;
  } else {
    // Image is taller - crop vertically
    sw = imgWidth;
    sh = imgWidth / containerRatio;
    sx = 0;
    const maxOffsetY = imgHeight - sh;
    // Convert object-position percentage to source y coordinate
    sy = (objectPositionYPercent / 100) * maxOffsetY;
  }

  return { sx, sy, sw, sh };
}
```

### 7. Convert Pixel Offset to Object-Position Percentage for Export

```javascript
function getObjectPositionPercent(imageData, containerWidth, containerHeight, imgNaturalWidth, imgNaturalHeight) {
  const imgRatio = imgNaturalWidth / imgNaturalHeight;
  const containerRatio = containerWidth / containerHeight;

  let objectPositionXPercent = 50;
  let objectPositionYPercent = 50;

  if (imageData.offset) {
    if (imgRatio > containerRatio) {
      // Image is wider - calculate horizontal pan
      const displayScaledWidth = containerHeight * imgRatio;
      const displayMaxOffset = displayScaledWidth - containerWidth;
      if (displayMaxOffset > 0) {
        objectPositionXPercent = 50 + (imageData.offset.x / displayMaxOffset) * 100;
      }
    } else {
      // Image is taller - calculate vertical pan
      const displayScaledHeight = containerWidth / imgRatio;
      const displayMaxOffset = displayScaledHeight - containerHeight;
      if (displayMaxOffset > 0) {
        objectPositionYPercent = 50 + (imageData.offset.y / displayMaxOffset) * 100;
      }
    }
  }

  return { objectPositionXPercent, objectPositionYPercent };
}
```

---

## Complete Export Function

```javascript
async function exportMoodboard() {
  const gridContainer = document.getElementById('grid-container');
  const gridRect = gridContainer.getBoundingClientRect();

  // Create canvas at 2x resolution for crisp export
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = gridRect.width * scale;
  canvas.height = gridRect.height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Draw each image
  const gridItems = gridContainer.querySelectorAll('.grid-item');

  for (const gridItem of gridItems) {
    const imageId = gridItem.dataset.id;
    const imgElement = gridItem.querySelector('img');
    const imageData = images.find(img => img.id === imageId);

    if (!imgElement || !imageData) continue;

    const itemRect = gridItem.getBoundingClientRect();
    const dx = itemRect.left - gridRect.left;
    const dy = itemRect.top - gridRect.top;
    const dw = itemRect.width;
    const dh = itemRect.height;

    // Get object-position percentage
    const { objectPositionXPercent, objectPositionYPercent } = getObjectPositionPercent(
      imageData, dw, dh, imgElement.naturalWidth, imgElement.naturalHeight
    );

    // Calculate source crop rectangle
    const { sx, sy, sw, sh } = calculateCoverCrop(
      imgElement.naturalWidth,
      imgElement.naturalHeight,
      dw, dh,
      objectPositionXPercent,
      objectPositionYPercent
    );

    // Draw image with crop
    ctx.drawImage(imgElement, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  // Trigger download
  const link = document.createElement('a');
  link.download = 'moodboard.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

---

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moodboard Creator</title>
  <style>
    /* CSS goes here - see styling section */
  </style>
</head>
<body>
  <!-- Error Banner (hidden by default) -->
  <div id="error-banner" class="error-banner hidden">
    <span id="error-message"></span>
    <button onclick="hideError()" aria-label="Dismiss">&times;</button>
  </div>

  <!-- Main Container -->
  <div class="container">
    <!-- Drop Zone / Grid Container -->
    <div id="grid-container" class="drop-zone">
      <p id="empty-message" class="drop-message">Drag images here to upload</p>
      <!-- Grid items will be dynamically added here -->
    </div>

    <!-- Export Button (hidden when no images) -->
    <button id="export-btn" class="export-button hidden" onclick="exportMoodboard()">
      Export Moodboard
    </button>
  </div>

  <script>
    /* JavaScript goes here - see implementation section */
  </script>
</body>
</html>
```

---

## Complete CSS Styling

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #000;
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.container {
  width: 80vw;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Error Banner */
.error-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(239, 68, 68, 0.95);
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  transition: transform 0.3s ease;
}

.error-banner.hidden {
  transform: translateY(-100%);
}

.error-banner button {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
}

/* Drop Zone / Grid Container */
.drop-zone {
  background: #111;
  border: 2px dashed #444;
  border-radius: 8px;
  min-height: 500px;
  aspect-ratio: 16/9;
  position: relative;
  transition: border-color 0.2s ease;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-auto-rows: 50px;
  gap: 4px;
  padding: 4px;
}

.drop-zone.dragging-over {
  border-color: #2196f3;
}

.drop-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #888;
  font-size: 18px;
  pointer-events: none;
}

/* Grid Item */
.grid-item {
  background: #222;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  cursor: move;
  transition: box-shadow 0.2s ease;
}

.grid-item:hover {
  box-shadow: 0 0 0 2px #2196f3;
}

.grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  user-select: none;
}

/* Delete Button */
.delete-button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.grid-item:hover .delete-button {
  opacity: 1;
}

/* Pan/Reposition Handle */
.pan-handle {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.grid-item:hover .pan-handle,
.grid-item.needs-repositioning .pan-handle {
  opacity: 1;
}

.pan-handle:active {
  cursor: grabbing;
}

.pan-handle svg {
  width: 16px;
  height: 16px;
  fill: white;
}

/* Resize Handle */
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-right: 2px solid white;
  border-bottom: 2px solid white;
}

.grid-item:hover .resize-handle {
  opacity: 1;
}

/* Export Button */
.export-button {
  background: #2196f3;
  color: white;
  border: none;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.export-button:hover {
  background: #1976d2;
  transform: translateY(-1px);
}

.export-button:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
}

.hidden {
  display: none !important;
}

/* Drag Placeholder */
.drag-placeholder {
  background: rgba(33, 150, 243, 0.2);
  border: 2px dashed #2196f3;
  border-radius: 4px;
}
```

---

## Complete JavaScript Implementation

```javascript
// ==================== STATE ====================
let images = [];
let dragState = null;   // For grid item dragging
let resizeState = null; // For resizing
let panState = null;    // For image panning

const COLUMN_COUNT = 10;
const ROW_HEIGHT = 50;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ==================== DOM REFERENCES ====================
const gridContainer = document.getElementById('grid-container');
const emptyMessage = document.getElementById('empty-message');
const exportBtn = document.getElementById('export-btn');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');

// ==================== ERROR HANDLING ====================
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
  setTimeout(hideError, 5000);
}

function hideError() {
  errorBanner.classList.add('hidden');
}

// ==================== FILE UPLOAD ====================
gridContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  gridContainer.classList.add('dragging-over');
});

gridContainer.addEventListener('dragleave', (e) => {
  e.preventDefault();
  gridContainer.classList.remove('dragging-over');
});

gridContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  gridContainer.classList.remove('dragging-over');

  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;

  // Validate file sizes
  const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
  const valid = files.filter(f => f.size <= MAX_FILE_SIZE_BYTES);

  if (oversized.length > 0) {
    showError(`Files too large (max ${MAX_FILE_SIZE_MB}MB): ${oversized.map(f => f.name).join(', ')}`);
  }

  if (!valid.length) return;

  // Process each valid file
  valid.forEach((file, index) => {
    const src = URL.createObjectURL(file);
    const id = `img-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const containerWidth = gridContainer.clientWidth;
      const { w, h } = calculateGridDimensions(img.naturalWidth, img.naturalHeight, containerWidth);
      const { x, y } = calculatePosition(images.length);

      const imageData = { id, src, x, y, w, h, offset: { x: 0, y: 0 } };
      images.push(imageData);

      renderGrid();
    };
  });
});

// ==================== GRID CALCULATIONS ====================
function calculateGridDimensions(naturalWidth, naturalHeight, containerWidth) {
  const columnWidth = containerWidth / COLUMN_COUNT;
  const w = 2;
  const widthInPx = w * columnWidth;
  const aspectRatio = naturalHeight / naturalWidth;
  const h = Math.max(1, Math.round(widthInPx * aspectRatio / ROW_HEIGHT));
  return { w, h };
}

function calculatePosition(existingCount) {
  const x = (existingCount * 2) % COLUMN_COUNT;
  const y = Math.floor((existingCount * 2) / COLUMN_COUNT);
  return { x, y };
}

function calculateMaxOffset(container, img) {
  const containerRect = container.getBoundingClientRect();
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const containerRatio = containerRect.width / containerRect.height;

  if (imgRatio > containerRatio) {
    const scaledWidth = containerRect.height * imgRatio;
    return { x: scaledWidth - containerRect.width, y: 0 };
  } else {
    const scaledHeight = containerRect.width / imgRatio;
    return { x: 0, y: scaledHeight - containerRect.height };
  }
}

function calculateObjectPosition(offset, maxOffset) {
  if (!offset) return '50% 50%';
  const x = maxOffset.x > 0 ? (offset.x / maxOffset.x) * 100 : 0;
  const y = maxOffset.y > 0 ? (offset.y / maxOffset.y) * 100 : 0;
  return `${50 + x}% ${50 + y}%`;
}

// ==================== RENDER ====================
function renderGrid() {
  // Clear existing items (keep empty message)
  const existingItems = gridContainer.querySelectorAll('.grid-item');
  existingItems.forEach(item => item.remove());

  // Toggle empty state
  emptyMessage.classList.toggle('hidden', images.length > 0);
  exportBtn.classList.toggle('hidden', images.length === 0);

  // Render each image
  images.forEach(imageData => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.dataset.id = imageData.id;
    item.style.gridColumn = `${imageData.x + 1} / span ${imageData.w}`;
    item.style.gridRow = `${imageData.y + 1} / span ${imageData.h}`;

    // Image
    const img = document.createElement('img');
    img.src = imageData.src;
    img.alt = '';
    img.draggable = false;

    // Apply object-position after load
    img.onload = () => {
      const maxOffset = calculateMaxOffset(item, img);
      img.style.objectPosition = calculateObjectPosition(imageData.offset, maxOffset);

      // Show pan handle if image needs repositioning
      if (maxOffset.x > 0 || maxOffset.y > 0) {
        item.classList.add('needs-repositioning');
      }
    };

    // Delete button
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'delete-button';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteImage(imageData.id);
    };

    // Pan handle
    const panHandle = document.createElement('div');
    panHandle.className = 'pan-handle';
    panHandle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M13,6V11H18V7.75L22.25,12L18,16.25V13H13V18H16.25L12,22.25L7.75,18H11V13H6V16.25L1.75,12L6,7.75V11H11V6H7.75L12,1.75L16.25,6H13Z"/></svg>';
    panHandle.onmousedown = (e) => startPan(e, imageData.id);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.onmousedown = (e) => startResize(e, imageData.id);

    // Drag to move (on item itself, not handles)
    item.onmousedown = (e) => {
      if (e.target === item || e.target === img) {
        startDrag(e, imageData.id);
      }
    };

    item.appendChild(img);
    item.appendChild(deleteBtn);
    item.appendChild(panHandle);
    item.appendChild(resizeHandle);
    gridContainer.appendChild(item);
  });
}

// ==================== DELETE ====================
function deleteImage(id) {
  const image = images.find(img => img.id === id);
  if (image) {
    URL.revokeObjectURL(image.src);
  }
  images = images.filter(img => img.id !== id);
  renderGrid();
}

// ==================== DRAG TO MOVE ====================
function startDrag(e, id) {
  e.preventDefault();
  const item = gridContainer.querySelector(`[data-id="${id}"]`);
  const rect = item.getBoundingClientRect();
  const containerRect = gridContainer.getBoundingClientRect();

  dragState = {
    id,
    startMouseX: e.clientX,
    startMouseY: e.clientY,
    startX: images.find(img => img.id === id).x,
    startY: images.find(img => img.id === id).y,
    columnWidth: containerRect.width / COLUMN_COUNT
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
  if (!dragState) return;

  const deltaX = e.clientX - dragState.startMouseX;
  const deltaY = e.clientY - dragState.startMouseY;

  const deltaColumns = Math.round(deltaX / dragState.columnWidth);
  const deltaRows = Math.round(deltaY / ROW_HEIGHT);

  const image = images.find(img => img.id === dragState.id);
  if (image) {
    image.x = Math.max(0, Math.min(COLUMN_COUNT - image.w, dragState.startX + deltaColumns));
    image.y = Math.max(0, dragState.startY + deltaRows);
    renderGrid();
  }
}

function endDrag() {
  dragState = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
}

// ==================== RESIZE ====================
function startResize(e, id) {
  e.preventDefault();
  e.stopPropagation();

  const image = images.find(img => img.id === id);
  const containerRect = gridContainer.getBoundingClientRect();

  resizeState = {
    id,
    startMouseX: e.clientX,
    startMouseY: e.clientY,
    startW: image.w,
    startH: image.h,
    columnWidth: containerRect.width / COLUMN_COUNT
  };

  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', endResize);
}

function onResize(e) {
  if (!resizeState) return;

  const deltaX = e.clientX - resizeState.startMouseX;
  const deltaY = e.clientY - resizeState.startMouseY;

  const deltaColumns = Math.round(deltaX / resizeState.columnWidth);
  const deltaRows = Math.round(deltaY / ROW_HEIGHT);

  const image = images.find(img => img.id === resizeState.id);
  if (image) {
    const newW = Math.max(1, Math.min(COLUMN_COUNT - image.x, resizeState.startW + deltaColumns));
    const newH = Math.max(1, resizeState.startH + deltaRows);

    // Reset offset if size changed
    if (newW !== image.w || newH !== image.h) {
      image.offset = { x: 0, y: 0 };
    }

    image.w = newW;
    image.h = newH;
    renderGrid();
  }
}

function endResize() {
  resizeState = null;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', endResize);
}

// ==================== PAN/REPOSITION ====================
function startPan(e, id) {
  e.preventDefault();
  e.stopPropagation();

  const item = gridContainer.querySelector(`[data-id="${id}"]`);
  const img = item.querySelector('img');
  const image = images.find(i => i.id === id);
  const maxOffset = calculateMaxOffset(item, img);

  if (maxOffset.x === 0 && maxOffset.y === 0) return;

  panState = {
    id,
    startMouseX: e.clientX,
    startMouseY: e.clientY,
    startOffset: { ...image.offset },
    maxOffset
  };

  document.addEventListener('mousemove', onPan);
  document.addEventListener('mouseup', endPan);
}

function onPan(e) {
  if (!panState) return;

  const deltaX = panState.startMouseX - e.clientX;
  const deltaY = panState.startMouseY - e.clientY;

  const image = images.find(img => img.id === panState.id);
  if (image) {
    // Clamp to half the max offset to prevent empty space
    const halfMaxX = panState.maxOffset.x / 2;
    const halfMaxY = panState.maxOffset.y / 2;

    image.offset = {
      x: Math.max(-halfMaxX, Math.min(halfMaxX, panState.startOffset.x + deltaX)),
      y: Math.max(-halfMaxY, Math.min(halfMaxY, panState.startOffset.y + deltaY))
    };

    // Update object-position
    const item = gridContainer.querySelector(`[data-id="${panState.id}"]`);
    const img = item.querySelector('img');
    img.style.objectPosition = calculateObjectPosition(image.offset, panState.maxOffset);
  }
}

function endPan() {
  panState = null;
  document.removeEventListener('mousemove', onPan);
  document.removeEventListener('mouseup', endPan);
}

// ==================== EXPORT ====================
function exportMoodboard() {
  if (images.length === 0) return;

  exportBtn.disabled = true;
  exportBtn.textContent = 'Exporting...';

  try {
    const gridRect = gridContainer.getBoundingClientRect();
    const scale = 2;

    const canvas = document.createElement('canvas');
    canvas.width = gridRect.width * scale;
    canvas.height = gridRect.height * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const gridItems = gridContainer.querySelectorAll('.grid-item');

    gridItems.forEach(gridItem => {
      const imageId = gridItem.dataset.id;
      const imgElement = gridItem.querySelector('img');
      const imageData = images.find(img => img.id === imageId);

      if (!imgElement || !imageData) return;

      const itemRect = gridItem.getBoundingClientRect();
      const dx = itemRect.left - gridRect.left;
      const dy = itemRect.top - gridRect.top;
      const dw = itemRect.width;
      const dh = itemRect.height;

      // Calculate object-position percentage
      const imgRatio = imgElement.naturalWidth / imgElement.naturalHeight;
      const containerRatio = dw / dh;

      let objectPositionXPercent = 50;
      let objectPositionYPercent = 50;

      if (imageData.offset) {
        if (imgRatio > containerRatio) {
          const displayScaledWidth = dh * imgRatio;
          const displayMaxOffset = displayScaledWidth - dw;
          if (displayMaxOffset > 0) {
            objectPositionXPercent = 50 + (imageData.offset.x / displayMaxOffset) * 100;
          }
        } else {
          const displayScaledHeight = dw / imgRatio;
          const displayMaxOffset = displayScaledHeight - dh;
          if (displayMaxOffset > 0) {
            objectPositionYPercent = 50 + (imageData.offset.y / displayMaxOffset) * 100;
          }
        }
      }

      // Calculate source crop
      let sx, sy, sw, sh;

      if (imgRatio > containerRatio) {
        sh = imgElement.naturalHeight;
        sw = sh * containerRatio;
        const maxOffsetX = imgElement.naturalWidth - sw;
        sx = (objectPositionXPercent / 100) * maxOffsetX;
        sy = 0;
      } else {
        sw = imgElement.naturalWidth;
        sh = sw / containerRatio;
        sx = 0;
        const maxOffsetY = imgElement.naturalHeight - sh;
        sy = (objectPositionYPercent / 100) * maxOffsetY;
      }

      ctx.drawImage(imgElement, sx, sy, sw, sh, dx, dy, dw, dh);
    });

    const link = document.createElement('a');
    link.download = 'moodboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

  } catch (error) {
    showError('Export failed. Please try again.');
    console.error('Export error:', error);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = 'Export Moodboard';
  }
}

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', () => {
  renderGrid();
});

// Initial render
renderGrid();
```

---

## User Interaction Flow

1. **Page Load**: Empty grid with "Drag images here to upload" message
2. **Drag Files**: Drop zone border turns blue, files validate, images appear in grid
3. **Move Images**: Click and drag an image to move it to a new grid position
4. **Resize Images**: Drag the bottom-right corner handle to resize
5. **Pan Images**: Drag the 4-arrow icon (top-left) to reposition image within frame
6. **Delete Images**: Hover to reveal X button (top-right), click to remove
7. **Export**: Click "Export Moodboard" button, PNG downloads automatically

---

## Error Handling

| Scenario | Response |
|----------|----------|
| File > 10MB | Red banner: "Files too large (max 10MB): [names]" |
| Non-image file | Silently ignored |
| Export failure | Red banner: "Export failed. Please try again." |
| No images | Export button hidden |

---

## Critical Implementation Notes

1. **Blob URLs**: Use `URL.createObjectURL()` for images, NOT base64. Revoke on delete.

2. **Pan Boundaries**: Always clamp offset to half the max offset to prevent empty space showing.

3. **Export Uses Existing DOM Elements**: Do NOT try to reload images from blob URLs into new Image() objects - use the existing `<img>` elements directly with `ctx.drawImage()`.

4. **Grid Positioning**: Use CSS Grid with `grid-column` and `grid-row` for positioning, NOT absolute positioning.

5. **Object-Position Math**: The offset stored is in PIXELS. Convert to percentage using `50 + (offset / maxOffset) * 100` formula.

6. **2x Resolution Export**: Always create canvas at 2x dimensions and scale context for crisp PNG output.

---

Create this as a single, complete HTML file that runs entirely in the browser with zero server dependencies. The app should be fully functional the moment the page loads.
