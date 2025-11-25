'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MoodboardImage, DragInfo } from './types'

interface UseImagePanOptions {
  images: MoodboardImage[]
  setImages: React.Dispatch<React.SetStateAction<MoodboardImage[]>>
}

interface UseImagePanReturn {
  handleImageMouseDown: (e: React.MouseEvent, imageId: string) => void
  calculateObjectPosition: (img: MoodboardImage, container: HTMLElement, imgElement: HTMLImageElement) => string
  checkIfImageNeedsRepositioning: (container: HTMLElement, img: HTMLImageElement) => boolean
}

export function useImagePan({ images, setImages }: UseImagePanOptions): UseImagePanReturn {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)

  const calculateMaxOffset = useCallback((container: HTMLElement, img: HTMLImageElement) => {
    const containerRect = container.getBoundingClientRect()
    const imgRatio = img.naturalWidth / img.naturalHeight
    const containerRatio = containerRect.width / containerRect.height

    if (imgRatio > containerRatio) {
      // Image is wider - scaled by height
      const scaledHeight = containerRect.height
      const scaledWidth = scaledHeight * imgRatio
      const maxOffset = scaledWidth - containerRect.width
      return { x: maxOffset, y: 0 }
    } else {
      // Image is taller - scaled by width
      const scaledWidth = containerRect.width
      const scaledHeight = scaledWidth / imgRatio
      const maxOffset = scaledHeight - containerRect.height
      return { x: 0, y: maxOffset }
    }
  }, [])

  const calculateObjectPosition = useCallback((img: MoodboardImage, container: HTMLElement, imgElement: HTMLImageElement) => {
    if (!img.offset) return '50% 50%'
    const maxOffset = calculateMaxOffset(container, imgElement)
    const x = maxOffset.x ? (img.offset.x / maxOffset.x) * 100 : 50
    const y = maxOffset.y ? (img.offset.y / maxOffset.y) * 100 : 50
    return `${50 + x}% ${50 + y}%`
  }, [calculateMaxOffset])

  const checkIfImageNeedsRepositioning = useCallback((container: HTMLElement, img: HTMLImageElement) => {
    const { x, y } = calculateMaxOffset(container, img)
    return x > 0 || y > 0
  }, [calculateMaxOffset])

  const handleImageMouseDown = useCallback((e: React.MouseEvent, imageId: string) => {
    e.stopPropagation()
    const image = images.find(img => img.i === imageId)
    if (!image) return

    const container = e.currentTarget.closest('.image-container') as HTMLElement
    const imgElement = container?.querySelector('img') as HTMLImageElement
    if (!container || !imgElement || !checkIfImageNeedsRepositioning(container, imgElement)) return

    const maxOffset = calculateMaxOffset(container, imgElement)
    if (maxOffset.x === 0 && maxOffset.y === 0) return

    const currentOffset = image.offset || { x: 0, y: 0 }

    setDragInfo({
      imageId,
      startX: e.clientX,
      startY: e.clientY,
      currentOffset,
      maxOffset
    })
  }, [images, calculateMaxOffset, checkIfImageNeedsRepositioning])

  // Handle mouse move/up for panning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo) return

      const { imageId, startX, startY, currentOffset, maxOffset } = dragInfo
      const deltaX = startX - e.clientX
      const deltaY = startY - e.clientY

      setImages(prev => prev.map(img => {
        if (img.i !== imageId) return img

        // Clamp to half the max offset so object-position stays within 0%-100%
        // This prevents empty space from appearing at image edges
        const halfMaxX = maxOffset.x / 2
        const halfMaxY = maxOffset.y / 2
        const newX = Math.max(-halfMaxX, Math.min(halfMaxX, currentOffset.x + deltaX))
        const newY = Math.max(-halfMaxY, Math.min(halfMaxY, currentOffset.y + deltaY))

        return { ...img, offset: { x: newX, y: newY } }
      }))
    }

    const handleMouseUp = () => {
      setDragInfo(null)
    }

    if (dragInfo) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragInfo, setImages])

  return {
    handleImageMouseDown,
    calculateObjectPosition,
    checkIfImageNeedsRepositioning
  }
}
