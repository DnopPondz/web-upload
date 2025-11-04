import Image from "next/image"
import { useEffect, useState } from "react"

interface AvatarImageProps {
  src?: string | null
  alt: string
  size: number
  className?: string
  priority?: boolean
  fallbackSrc?: string | null
}

const AvatarImage = ({
  src,
  alt,
  size,
  className,
  priority = false,
  fallbackSrc = null,
}: AvatarImageProps) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src, fallbackSrc])

  const displaySrc = !src || hasError ? fallbackSrc ?? null : src

  if (!displaySrc) {
    const placeholderInitial = alt?.trim().charAt(0)?.toUpperCase() ?? ""
    const placeholderClassName =
      className ??
      "flex items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase text-white/60"

    const placeholderStyle = className ? undefined : { width: size, height: size }

    return (
      <div role="img" aria-label={alt} className={placeholderClassName} style={placeholderStyle}>
        {placeholderInitial}
      </div>
    )
  }

  return (
    <Image
      src={displaySrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={priority}
      onError={
        src && !hasError
          ? () => {
              setHasError(true)
            }
          : undefined
      }
    />
  )
}

export default AvatarImage
