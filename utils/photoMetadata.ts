export const sanitizeContextValue = (value: string) => value.replace(/[|=]/g, "-")

export const buildCloudinaryContextString = (values: {
  imageName?: string
  album?: string
  description?: string
}) => {
  const entries = Object.entries(values).map(([key, rawValue]) => {
    const trimmed = (rawValue ?? "").toString().trim()
    return {
      key,
      trimmed,
      sanitized: sanitizeContextValue(trimmed),
    }
  })

  return {
    contextString: entries.map(({ key, sanitized }) => `${key}=${sanitized}`).join("|"),
    trimmedValues: entries.reduce(
      (acc, { key, trimmed }) => ({
        ...acc,
        [key]: trimmed,
      }),
      {} as {
        imageName?: string
        album?: string
        description?: string
      },
    ),
  }
}
