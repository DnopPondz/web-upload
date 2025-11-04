import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

/**
 * สร้าง hash สำหรับ PIN โดยใช้ scrypt + salt
 */
export const createPinHash = (pin: string): string => {
  if (!pin || typeof pin !== "string") {
    throw new Error("PIN must be a non-empty string");
  }

  const salt = randomBytes(16).toString("hex");
  const hashBuffer = scryptSync(pin, salt, KEY_LENGTH);

  return `${salt}:${hashBuffer.toString("hex")}`;
};

/**
 * ตรวจสอบว่า PIN ที่ใส่ตรงกับ hash ที่เก็บไว้หรือไม่
 */
export const verifyPinHash = (pin: string, storedHash: string): boolean => {
  if (!storedHash) return false;

  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  try {
    // สร้าง hash ใหม่จาก pin ที่ใส่มา
    const derivedBuffer = scryptSync(pin, salt, KEY_LENGTH);
    const keyBuffer = Buffer.from(key, "hex");

    // ความยาวไม่เท่ากัน => ไม่ต้องเปรียบเทียบ
    if (derivedBuffer.length !== keyBuffer.length) {
      return false;
    }

    // ✅ แปลง Buffer → Uint8Array เพื่อให้ตรงกับ type ของ timingSafeEqual
    const derivedView = new Uint8Array(derivedBuffer);
    const keyView = new Uint8Array(keyBuffer);

    return timingSafeEqual(derivedView, keyView);
  } catch (error) {
    console.error("Failed to verify PIN hash", error);
    return false;
  }
};
