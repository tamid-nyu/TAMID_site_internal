import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMediaVariants,
  getJsonByteSize,
  getThumbnailPath,
  makeStoragePath,
  versionUrl,
} from './adminMedia'

describe('admin media helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses the public-site thumbnail naming convention for nested media paths', () => {
    expect(getThumbnailPath('flyer.png')).toBe('thumbnails/flyer.jpg')
    expect(getThumbnailPath('events/Spring Panel.PNG')).toBe('events/thumbnails/Spring Panel.jpg')
    expect(getThumbnailPath('members/ada.webp')).toBe('members/thumbnails/ada.jpg')
    expect(getThumbnailPath('legacy-headshot.jpg')).toBe('thumbnails/legacy-headshot.jpg')
  })

  it('creates deterministic full-size paths while preserving the source format', () => {
    expect(
      makeStoragePath('event-123', new File(['image'], 'Flyer.PNG', { type: 'image/png' }))
    ).toBe('event-123.png')
  })

  it('rejects non-image uploads before attempting thumbnail generation', async () => {
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' })

    await expect(createMediaVariants(file)).rejects.toThrow(/select an image file/i)
  })

  it('keeps the original full-size file and generates a bounded JPEG thumbnail', async () => {
    const drawImage = vi.fn()
    const close = vi.fn()
    const fillRect = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, fillRect, fillStyle: '' }),
      toBlob: (callback: BlobCallback) => callback(new Blob(['thumbnail'], { type: 'image/jpeg' })),
    } as unknown as HTMLCanvasElement
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 1440, height: 720, close })
    )
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    const source = new File(['image'], 'event-flyer.png', { type: 'image/png' })
    const variants = await createMediaVariants(source)

    expect(canvas.width).toBe(720)
    expect(canvas.height).toBe(360)
    expect(drawImage).toHaveBeenCalled()
    expect(fillRect).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
    expect(variants.fullSize).toBe(source)
    expect(variants.thumbnail.name).toBe('event-flyer.jpg')
    expect(variants.thumbnail.type).toBe('image/jpeg')
  })

  it('measures the complete encoded JSON request body', () => {
    const body = {
      fullSize: { path: '1.png', contentBase64: '1234', contentType: 'image/png' },
      thumbnail: {
        path: 'thumbnails/1.jpg',
        contentBase64: '5678',
        contentType: 'image/jpeg',
      },
    }
    expect(getJsonByteSize(body)).toBe(new Blob([JSON.stringify(body)]).size)
  })

  it('uses the owning row timestamp as the cache version', () => {
    expect(
      versionUrl('https://cdn.example.com/events/event-1.webp?download=1', '2026-07-22T16:00:00Z')
    ).toBe('https://cdn.example.com/events/event-1.webp?download=1&v=2026-07-22T16%3A00%3A00Z')
  })
})
