export const resolveCloudinaryCloudName = (): string | undefined => {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""
  const trimmed = cloudName.trim()
  return trimmed ? trimmed : undefined
}

export const buildCloudinaryImageUrl = (publicId?: string | null): string | undefined => {
  const trimmedId = typeof publicId === "string" ? publicId.trim() : ""
  const cloudName = resolveCloudinaryCloudName()
  if (!cloudName || !trimmedId) {
    return undefined
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/${trimmedId}`
}

const hasTransformationPrefix = (segment: string) => {
  if (!segment) return false
  if (segment.includes(",")) return true
  return /^[a-zA-Z]+_/.test(segment)
}

export const extractPublicIdFromUrl = (url?: string | null): string | undefined => {
  if (typeof url !== "string") {
    return undefined
  }

  const trimmed = url.trim()
  if (!trimmed) {
    return undefined
  }

  const uploadToken = "/upload/"
  const uploadIndex = trimmed.indexOf(uploadToken)
  if (uploadIndex === -1) {
    return undefined
  }

  const suffix = trimmed.slice(uploadIndex + uploadToken.length)
  if (!suffix) {
    return undefined
  }

  const segments = suffix.split("/")
  if (segments.length === 0) {
    return undefined
  }

  let startIndex = 0
  if (hasTransformationPrefix(segments[startIndex])) {
    startIndex += 1
  }

  if (segments[startIndex] && /^v\d+$/.test(segments[startIndex])) {
    startIndex += 1
  }

  const publicIdSegments = segments.slice(startIndex)
  if (publicIdSegments.length === 0) {
    return undefined
  }

  const publicIdWithExtension = publicIdSegments.join("/")
  const dotIndex = publicIdWithExtension.lastIndexOf(".")
  if (dotIndex === -1) {
    return publicIdWithExtension || undefined
  }

  const publicId = publicIdWithExtension.slice(0, dotIndex)
  return publicId || undefined
}

export const injectCloudinaryTransformation = (
  url: string,
  transformation: string,
): string => {
  if (typeof url !== "string" || !url) {
    return url
  }

  const uploadToken = "/upload/"
  const uploadIndex = url.indexOf(uploadToken)
  if (uploadIndex === -1) {
    return url
  }

  const prefix = url.slice(0, uploadIndex + uploadToken.length)
  const suffix = url.slice(uploadIndex + uploadToken.length)

  if (!suffix) {
    return `${prefix}${transformation}`
  }

  const [firstSegment] = suffix.split("/")
  if (hasTransformationPrefix(firstSegment)) {
    return url
  }

  return `${prefix}${transformation}/${suffix}`
}
