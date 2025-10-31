import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const KEY_LENGTH = 64

export const createPinHash = (pin: string) => {
  if (!pin || typeof pin !== "string") {
    throw new Error("PIN must be a non-empty string")
  }

  const salt = randomBytes(16).toString("hex")
  const hashBuffer = scryptSync(pin, salt, KEY_LENGTH)

  return `${salt}:${hashBuffer.toString("hex")}`
}

export const verifyPinHash = (pin: string, storedHash: string): boolean => {
  if (!storedHash) return false

  const [salt, key] = storedHash.split(":")
  if (!salt || !key) return false

  try {
    const derivedBuffer = scryptSync(pin, salt, KEY_LENGTH)
    const keyBuffer = Buffer.from(key, "hex")

    if (derivedBuffer.length !== keyBuffer.length) {
      return false
    }

    return timingSafeEqual(derivedBuffer, keyBuffer)
  } catch (error) {
    console.error("Failed to verify PIN hash", error)
    return false
  }
}
