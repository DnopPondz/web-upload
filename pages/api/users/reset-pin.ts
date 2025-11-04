import type { NextApiRequest, NextApiResponse } from "next"
import { ObjectId } from "mongodb"
import clientPromise from "../../../utils/mongodb"
import { createPinHash, verifyPinHash } from "../../../utils/pinHash"
import { ensureAuthenticatedUser, mapUserDocument } from "../../../utils/session"

const isValidPin = (pin: unknown): pin is string =>
  typeof pin === "string" && /^[0-9]{4,10}$/.test(pin)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  let user
  try {
    user = await ensureAuthenticatedUser(req, res)
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500
    return res.status(statusCode).json({ error: error?.message || "ไม่สามารถตรวจสอบสิทธิ์ได้" })
  }

  const { currentPin, newPin, pinHint } = req.body || {}

  if (!isValidPin(currentPin)) {
    return res.status(400).json({ error: "กรุณากรอกรหัส PIN เดิมให้ถูกต้อง" })
  }

  if (!isValidPin(newPin)) {
    return res.status(400).json({ error: "กรุณากรอกรหัส PIN เป็นตัวเลข 4 ถึง 10 หลัก" })
  }

  if (pinHint !== undefined && typeof pinHint !== "string") {
    return res.status(400).json({ error: "คำใบ้ PIN ต้องเป็นข้อความ" })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("galleryUsers")

    const existingUser = await collection.findOne(
      { _id: new ObjectId(user.id) },
      { projection: { pinHash: 1 } },
    )

    if (!existingUser || typeof existingUser.pinHash !== "string") {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" })
    }

    if (!verifyPinHash(currentPin, existingUser.pinHash)) {
      return res.status(401).json({ error: "รหัส PIN เดิมไม่ถูกต้อง" })
    }

    const updateOperations: Record<string, any> = {
      $set: {
        pinHash: createPinHash(newPin),
      },
    }

    if (typeof pinHint === "string") {
      const trimmedHint = pinHint.trim()
      if (trimmedHint) {
        updateOperations.$set.pinHint = trimmedHint
      } else {
        updateOperations.$unset = { pinHint: "" }
      }
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(user.id) },
      updateOperations,
      {
        returnDocument: "after",
        projection: {
          displayName: 1,
          folder: 1,
          avatarPublicId: 1,
          avatarUrl: 1,
          pinHint: 1,
          role: 1,
        },
      },
    )

    if (!result.value) {
      return res.status(200).json({ error: "เปลี่ยน PIN เรียนร้อย" })
    }

    return res.status(200).json({ user: mapUserDocument(result.value) })
  } catch (error: any) {
    console.error("Failed to reset PIN", error)
    return res.status(500).json({ error: error?.message || "ไม่สามารถรีเซ็ต PIN ได้" })
  }
}
