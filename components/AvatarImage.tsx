import Image from "next/image"
import { useEffect, useState } from "react"

interface AvatarImageProps {
  src?: string | null
  alt: string
  size: number
  className?: string
  priority?: boolean
  fallbackSrc?: string
}

const DEFAULT_FALLBACK = "/user.png"

const AvatarImage = ({
  src,
  alt,
  size,
  className,
  priority = false,
  fallbackSrc = DEFAULT_FALLBACK,
}: AvatarImageProps) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  const displaySrc = !src || hasError ? fallbackSrc : src

  return (
    <Image
      src={displaySrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={priority}
      onError={src && !hasError ? () => setHasError(true) : undefined}
    />
  )
}

export default AvatarImage
