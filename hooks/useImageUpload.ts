'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MoodboardImage } from './types'

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const COLUMN_NUMBER = 10
const BASE_ROW_HEIGHT = 50

interface UseImageUploadOptions {
  containerWidthPx: number
}

interface UseImageUploadReturn {
  images: MoodboardImage[]
  setImages: React.Dispatch<React.SetStateAction<MoodboardImage[]>>
  isDraggingOver: boolean
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  handleDelete: (imageId: string) => void
}

export function useImageUpload({ containerWidthPx }: UseImageUploadOptions): UseImageUploadReturn {
  const [images, setImages] = useState<MoodboardImage[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.src))
    }
  }, [images])

  const calculateGridDimensions = useCallback((naturalWidth: number, naturalHeight: number) => {
    const columnWidth = containerWidthPx / COLUMN_NUMBER
    const w = 2
    const widthInPx = w * columnWidth

    const naturalRatio = naturalHeight / naturalWidth
    const targetHeightPx = widthInPx * naturalRatio
    const h = Math.max(1, Math.round(targetHeightPx / BASE_ROW_HEIGHT))

    return { w, h }
  }, [containerWidthPx])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }, [])

  const handleDelete = useCallback((imageId: string) => {
    setImages(prevImages => {
      const imageToDelete = prevImages.find(img => img.i === imageId)
      if (imageToDelete) {
        URL.revokeObjectURL(imageToDelete.src)
      }
      return prevImages.filter(img => img.i !== imageId)
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDraggingOver(false)
      setError(null)

      const allFiles = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('image/')
      )

      if (!allFiles.length) return

      // Validate file sizes
      const oversizedFiles = allFiles.filter(f => f.size > MAX_FILE_SIZE_BYTES)
      const validFiles = allFiles.filter(f => f.size <= MAX_FILE_SIZE_BYTES)

      if (oversizedFiles.length > 0) {
        const names = oversizedFiles.map(f => f.name).join(', ')
        setError(`Files too large (max ${MAX_FILE_SIZE_MB}MB): ${names}`)
        setTimeout(() => setError(null), 5000)
      }

      if (!validFiles.length) return

      // Process all files and collect their data
      const imagePromises = validFiles.map((file, index) => {
        return new Promise<MoodboardImage>((resolve) => {
          const src = URL.createObjectURL(file)
          const id = `img-${Date.now()}-${index}-${Math.random()}`

          const img = new Image()
          img.src = src

          img.onload = () => {
            const { w, h } = calculateGridDimensions(img.naturalWidth, img.naturalHeight)
            resolve({ src, i: id, x: 0, y: 0, w, h })
          }

          img.onerror = () => {
            URL.revokeObjectURL(src)
            resolve(null as unknown as MoodboardImage)
          }
        })
      })

      // Wait for all images to load, then add them with correct positions
      Promise.all(imagePromises).then((newImages) => {
        const validImages = newImages.filter(Boolean)
        if (validImages.length === 0) return

        setImages(prev => {
          const startIndex = prev.length
          const positioned = validImages.map((img, i) => ({
            ...img,
            x: ((startIndex + i) * 2) % COLUMN_NUMBER,
            y: Math.floor(((startIndex + i) * 2) / COLUMN_NUMBER)
          }))
          return [...prev, ...positioned]
        })
      })
    },
    [calculateGridDimensions]
  )

  return {
    images,
    setImages,
    isDraggingOver,
    error,
    setError,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleDelete
  }
}
