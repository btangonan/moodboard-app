'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { useImageUpload, useExport, useImagePan } from '../hooks'

const COLUMN_NUMBER = 10
const BASE_ROW_HEIGHT = 50

const GridLayoutComponent = () => {
  const [containerWidthPx, setContainerWidthPx] = useState(1000)
  const gridRef = useRef<HTMLDivElement>(null)

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
    handleDelete
  } = useImageUpload({ containerWidthPx })

  const { isExporting, handleExport } = useExport({
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
    checkIfImageNeedsRepositioning
  } = useImagePan({ images, setImages })

  // Handle window resize
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth || 1024
      setContainerWidthPx(Math.max(800, vw * 0.8))
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
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
        style={{ width: containerWidthPx }}
      >
        {images.length === 0 && (
          <p className="drop-message">Drag images here to upload</p>
        )}
        {images.length > 0 && (
          <GridLayout
            className="layout"
            layout={images}
            cols={COLUMN_NUMBER}
            rowHeight={BASE_ROW_HEIGHT}
            width={containerWidthPx}
            isDraggable
            isResizable
            preventCollision={false}
            onLayoutChange={onLayoutChange}
          >
            {images.map(img => (
              <div key={img.i} className="grid-item" data-grid-id={img.i}>
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
                  ×
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
        <button
          className="export-button"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Moodboard'}
        </button>
      )}
    </div>
  )
}

export default GridLayoutComponent
