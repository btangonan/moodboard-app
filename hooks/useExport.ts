'use client'

import { useState, useCallback, RefObject } from 'react'
import domtoimage from 'dom-to-image-more'

interface UseExportOptions {
  gridRef: RefObject<HTMLDivElement>
  imageCount: number
  onError: (message: string) => void
}

interface UseExportReturn {
  isExporting: boolean
  handleExport: () => Promise<void>
}

export function useExport({ gridRef, imageCount, onError }: UseExportOptions): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!gridRef.current || imageCount === 0) return

    setIsExporting(true)

    try {
      const dropZone = gridRef.current
      const gridContainer = dropZone.querySelector('.layout') as HTMLElement

      if (!gridContainer) {
        console.error('Grid container not found')
        return
      }

      // Calculate dimensions
      const gridRect = gridContainer.getBoundingClientRect()
      const dropZoneRect = dropZone.getBoundingClientRect()
      const extraPadding = 40

      const totalWidth = Math.max(gridRect.width, dropZoneRect.width) + (extraPadding * 2)
      const totalHeight = Math.max(gridRect.height, dropZoneRect.height) + (extraPadding * 2)

      // Save original styles
      const originalStyles = {
        width: dropZone.style.width,
        height: dropZone.style.height,
        padding: dropZone.style.padding,
        margin: dropZone.style.margin,
        position: dropZone.style.position,
        background: dropZone.style.background,
        border: dropZone.style.border
      }

      // Apply temporary styles for export
      Object.assign(dropZone.style, {
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
        padding: `${extraPadding}px`,
        margin: '0',
        position: 'relative',
        background: 'transparent',
        border: 'none'
      })

      // Save and modify grid item backgrounds
      const gridItems = dropZone.querySelectorAll('.grid-item') as NodeListOf<HTMLElement>
      const originalGridItemStyles = Array.from(gridItems).map(item => ({
        element: item,
        background: item.style.background
      }))

      gridItems.forEach(item => {
        item.style.background = 'transparent'
      })

      // Generate image
      const dataUrl = await domtoimage.toPng(dropZone, {
        quality: 1.0,
        bgcolor: 'transparent',
        width: totalWidth,
        height: totalHeight,
        style: {
          width: `${totalWidth}px`,
          height: `${totalHeight}px`
        }
      })

      // Restore styles
      Object.assign(dropZone.style, originalStyles)
      originalGridItemStyles.forEach(({ element, background }) => {
        element.style.background = background
      })

      // Download
      const link = document.createElement('a')
      link.download = 'moodboard.png'
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Export failed:', error)
      onError('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [gridRef, imageCount, onError])

  return { isExporting, handleExport }
}
