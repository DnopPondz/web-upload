export const resolveCloudinaryCloudName = (): string | undefined => {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""
  const trimmed = cloudName.trim()
  return trimmed ? trimmed : undefined
}

export const resolveCloudinaryAvatarFolder = (): string => {
  const folder =
    process.env.CLOUDINARY_AVATAR_FOLDER ||
    process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_FOLDER ||
    ""
  const trimmed = folder.trim()
  return trimmed || "useravatar"
}

export const normalizeAvatarPublicId = (
  publicId?: string | null,
): string | undefined => {
  const trimmed = typeof publicId === "string" ? publicId.trim() : ""
  if (!trimmed) {
    return undefined
  }

  const folder = resolveCloudinaryAvatarFolder()
  if (!folder) {
    return trimmed
  }

  const segments = trimmed.split("/")
  if (segments.length === 1) {
    return `${folder}/${segments[0]}`
  }

  const [firstSegment, ...rest] = segments
  if (firstSegment.toLowerCase() === folder.toLowerCase()) {
    return [folder, ...rest].join("/")
  }

  return trimmed
}

export const buildCloudinaryImageUrl = (publicId?: string | null): string | undefined => {
  const normalizedId = normalizeAvatarPublicId(publicId)
  const cloudName = resolveCloudinaryCloudName()
  if (!cloudName || !normalizedId) {
    return undefined
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/${normalizedId}`
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
