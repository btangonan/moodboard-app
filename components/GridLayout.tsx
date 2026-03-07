'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { ImagePlus } from 'lucide-react'
import { useImageUpload, useExport, useImagePan, useUndoHistory } from '../hooks'
import { CANVAS_ASPECT_RATIO, EXPORT_RESOLUTIONS, ExportResolutionKey } from '../hooks/types'
import type { MoodboardImage } from '../hooks/types'

type UndoSnapshot = { images: MoodboardImage[], gridGap: number }

const COLUMN_NUMBER = 10
const BASE_ROW_HEIGHT = 50

const GridLayoutComponent = () => {
  const [containerWidthPx, setContainerWidthPx] = useState(960)
  const [containerHeightPx, setContainerHeightPx] = useState(540)
  const [gridGap, setGridGap] = useState(4)
  const maxRows = Math.floor((containerHeightPx - gridGap - 20) / (BASE_ROW_HEIGHT + gridGap))
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gapSnapshotTakenRef = useRef(false)

  const undoHistory = useUndoHistory<UndoSnapshot>()

  // Snapshot ref lets pushSnapshot be called before images/gridGap state is
  // updated — hooks call it synchronously before their setState calls.
  const snapshotRef = useRef<{ images: MoodboardImage[], gridGap: number }>({ images: [], gridGap: 4 })
  const pushSnapshot = useCallback(() => {
    undoHistory.push({ ...snapshotRef.current })
  }, [undoHistory.push])

  // Initialize hooks
  const {
    images,
    setImages,
    isDraggingOver,
    error,
    setError,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleDelete,
    handleFileSelect
  } = useImageUpload({ containerWidthPx, onBeforeChange: pushSnapshot })

  const { isExporting, selectedResolution, setSelectedResolution, showLabels, setShowLabels, handleExport } = useExport({
    gridRef: gridRef as React.RefObject<HTMLDivElement>,
    imageCount: images.length,
    images,
    onError: (msg) => {
      setError(msg)
      setTimeout(() => setError(null), 5000)
    }
  })

  const {
    handleImageMouseDown,
    calculateObjectPosition,
    checkIfImageNeedsRepositioning,
    panningImageId
  } = useImagePan({ images, setImages, onBeforeChange: pushSnapshot })

  // Handle window resize - maintain 16:9 aspect ratio
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth || 1024
      const vh = window.innerHeight || 768

      // Calculate max dimensions while maintaining 16:9
      const maxWidth = Math.min(vw * 0.9, 1600)
      const maxHeight = vh * 0.7

      // Determine which dimension is the constraint
      let width = maxWidth
      let height = width / CANVAS_ASPECT_RATIO

      // If height exceeds max, constrain by height instead
      if (height > maxHeight) {
        height = maxHeight
        width = height * CANVAS_ASPECT_RATIO
      }

      setContainerWidthPx(Math.round(width))
      setContainerHeightPx(Math.round(height))
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Keep snapshot ref current so pushSnapshot always captures latest state
  useEffect(() => {
    snapshotRef.current = { images, gridGap }
  }, [images, gridGap])

  // Clamp images that extend below maxRows (on mount, window resize, gap change)
  useEffect(() => {
    setImages(prev => {
      const clamped = prev.map(img => {
        if (img.y + img.h > maxRows) {
          const y = Math.min(img.y, maxRows - 1)
          const h = Math.max(1, maxRows - y)
          return { ...img, y, h, ...(h !== img.h ? { offset: undefined } : {}) }
        }
        return img
      })
      return clamped.some((img, i) => img !== prev[i]) ? clamped : prev
    })
  }, [maxRows])

  // Undo handler
  const handleUndo = useCallback(() => {
    const snapshot = undoHistory.undo()
    if (snapshot) {
      setImages(snapshot.images)
      setGridGap(snapshot.gridGap)
    }
  }, [undoHistory.undo, setImages, setGridGap])

  // Cmd+Z / Ctrl+Z listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo])

  // Drag/resize start — snapshot before layout changes propagate
  const onDragStart = useCallback(() => {
    pushSnapshot()
  }, [pushSnapshot])

  const onResizeStart = useCallback(() => {
    pushSnapshot()
  }, [pushSnapshot])

  // Gap slider — one snapshot per gesture
  const handleGapMouseDown = useCallback(() => {
    if (!gapSnapshotTakenRef.current) {
      pushSnapshot()
      gapSnapshotTakenRef.current = true
    }
  }, [pushSnapshot])

  const handleGapMouseUp = useCallback(() => {
    gapSnapshotTakenRef.current = false
  }, [])

  // Handle layout changes from grid
  const onLayoutChange = useCallback((layout: Layout[]) => {
    setImages(prev =>
      prev.map(img => {
        const match = layout.find(l => l.i === img.i)
        if (!match) return img

        // Reset offset when size changes
        if (match.w !== img.w || match.h !== img.h) {
          return { ...img, ...match, offset: undefined }
        }
        return { ...img, ...match }
      })
    )

    // Check all images for repositioning needs after layout change
    requestAnimationFrame(() => {
      const containers = document.querySelectorAll('.image-container')
      containers.forEach(container => {
        const img = container.querySelector('img')
        if (img && img.complete) {
          if (checkIfImageNeedsRepositioning(container as HTMLElement, img as HTMLImageElement)) {
            container.classList.add('needs-repositioning')
          } else {
            container.classList.remove('needs-repositioning')
            const imageId = container.closest('.grid-item')?.getAttribute('data-grid-id')
            if (imageId) {
              setImages(prev => prev.map(img =>
                img.i === imageId ? { ...img, offset: undefined } : img
              ))
            }
          }
        }
      })
    })
  }, [setImages, checkIfImageNeedsRepositioning])

  return (
    <div className="outer-drop-wrapper">
      <h1 style={{ width: containerWidthPx }}>MOODBOARDER</h1>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="error-dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div
        ref={gridRef}
        className={`drop-zone ${isDraggingOver ? 'dragging-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ width: containerWidthPx, height: containerHeightPx }}
      >
        {images.length === 0 && (
          <div className="drop-message" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={52} strokeWidth={1.5}/>
            <span>Drop images to make a moodboard</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        {images.length > 0 && (
          <GridLayout
            className="layout"
            layout={images}
            cols={COLUMN_NUMBER}
            rowHeight={BASE_ROW_HEIGHT}
            width={containerWidthPx}
            margin={[gridGap, gridGap]}
            maxRows={maxRows}
            isDraggable
            isResizable
            preventCollision={false}
            onLayoutChange={onLayoutChange}
            onDragStart={onDragStart}
            onResizeStart={onResizeStart}
          >
            {images.map(img => (
              <div key={img.i} className={`grid-item${panningImageId === img.i ? ' is-panning' : ''}`} data-grid-id={img.i}>
                <div
                  className="delete-button"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleDelete(img.i)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Delete image"
                >
                  <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2.5" y1="2.5" x2="11.5" y2="11.5"/>
                    <line x1="11.5" y1="2.5" x2="2.5" y2="11.5"/>
                  </svg>
                </div>
                <div
                  className="image-container"
                  ref={(el) => {
                    if (el) {
                      const imgEl = el.querySelector('img')
                      if (imgEl && checkIfImageNeedsRepositioning(el, imgEl)) {
                        el.classList.add('needs-repositioning')
                      } else {
                        el.classList.remove('needs-repositioning')
                      }
                    }
                  }}
                >
                  <img
                    src={img.src}
                    alt=""
                    ref={(imgEl) => {
                      if (imgEl) {
                        const container = imgEl.parentElement
                        if (container) {
                          imgEl.style.objectPosition = calculateObjectPosition(img, container, imgEl)
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'none'
                    }}
                  />
                  <div
                    className="reposition-handle"
                    onMouseDown={(e) => handleImageMouseDown(e, img.i)}
                    title="Drag to reposition image"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M13,6V11H18V7.75L22.25,12L18,16.25V13H13V18H16.25L12,22.25L7.75,18H11V13H6V16.25L1.75,12L6,7.75V11H11V6H7.75L12,1.75L16.25,6H13Z" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
      {images.length > 0 && (
        <div className="export-controls">
          <div className="gap-control">
            <span className="gap-label">Gap</span>
            <input
              type="range"
              min="0"
              max="16"
              step="2"
              value={gridGap}
              onChange={(e) => setGridGap(Number(e.target.value))}
              onMouseDown={handleGapMouseDown}
              onMouseUp={handleGapMouseUp}
              disabled={isExporting}
              className="gap-slider"
            />
            <span className="gap-value">{gridGap}px</span>
          </div>
          <label className="labels-checkbox">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              disabled={isExporting}
            />
            <span>Position Labels</span>
          </label>
          <select
            className="resolution-select"
            value={selectedResolution}
            onChange={(e) => setSelectedResolution(e.target.value as ExportResolutionKey)}
            disabled={isExporting}
          >
            {Object.values(EXPORT_RESOLUTIONS).map((res) => (
              <option key={res.key} value={res.key}>
                {res.label}
              </option>
            ))}
          </select>
          <button
            className="export-button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      )}
    </div>
  )
}

export default GridLayoutComponent
