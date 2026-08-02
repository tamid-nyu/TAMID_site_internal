const THUMBNAIL_MAX_DIMENSION = 720
const THUMBNAIL_QUALITY = 0.82
const JPEG_CONTENT_TYPE = 'image/jpeg'

const fileExtension = (file: File) => {
  const extension = file.name.match(/(\.[A-Za-z0-9]+)$/)?.[1]?.toLowerCase()
  if (extension) return extension
  if (file.type === 'image/jpeg') return '.jpg'
  const subtype = file.type.split('/')[1]?.replace('svg+xml', 'svg')
  return subtype ? `.${subtype}` : ''
}

export const makeStoragePath = (resourceId: string, file: File) =>
  `${resourceId}${fileExtension(file)}`

export const getThumbnailPath = (path: string) => {
  const index = path.lastIndexOf('/')
  const directory = index === -1 ? '' : `${path.slice(0, index)}/`
  const filename = path.slice(index + 1)
  const baseName = filename.replace(/\.[^/.]+$/, '')
  return `${directory}thumbnails/${baseName}.jpg`
}

export const getStoragePublicUrl = (bucketId: string, path: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
  if (!supabaseUrl || !path) return ''

  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucketId)}/${encodedPath}`
}

export const versionUrl = (publicUrl: string, version: string) => {
  if (!publicUrl || !version) return publicUrl
  const url = new URL(publicUrl, window.location.origin)
  url.searchParams.set('v', version)
  return url.toString()
}

const loadImage = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  if ('createImageBitmap' in window) {
    return window.createImageBitmap(file)
  }

  return await new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('The selected image could not be decoded.'))
    }
    image.src = objectUrl
  })
}

export const getJsonByteSize = (body: unknown) => new Blob([JSON.stringify(body)]).size

export const createJpegThumbnail = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Select an image file to upload.')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('This browser cannot process image uploads.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  if ('close' in image && typeof image.close === 'function') image.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Thumbnail generation failed.'))),
      JPEG_CONTENT_TYPE,
      THUMBNAIL_QUALITY
    )
  })
  if (blob.type !== JPEG_CONTENT_TYPE) {
    throw new Error('This browser cannot create JPEG thumbnails.')
  }
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'thumbnail'
  return new File([blob], `${baseName}.jpg`, { type: JPEG_CONTENT_TYPE })
}

export const createMediaVariants = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Select an image file to upload.')
  }
  return {
    fullSize: file,
    thumbnail: await createJpegThumbnail(file),
  }
}
