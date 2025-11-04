import type { NextApiRequest, NextApiResponse } from "next"
import clientPromise from "../../../utils/mongodb"
import { createPinHash } from "../../../utils/pinHash"
import { buildCloudinaryImageUrl, normalizeAvatarPublicId } from "../../../utils/cloudinaryHelpers"
import { mapUserDocument } from "../../../utils/session"

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isValidPin = (pin: unknown): pin is string =>
  typeof pin === "string" && /^[0-9]{4,10}$/.test(pin)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { displayName, folder, pin, pinHint, avatarPublicId, role } = req.body || {}

  if (!isNonEmptyString(displayName)) {
    return res.status(400).json({ error: "กรุณาระบุชื่อผู้ใช้" })
  }

  if (!isNonEmptyString(folder)) {
    return res.status(400).json({ error: "กรุณาระบุโฟลเดอร์ของผู้ใช้" })
  }

  if (!isValidPin(pin)) {
    return res.status(400).json({ error: "กรุณากรอกรหัส PIN ให้ถูกต้อง (ตัวเลข 4-10 หลัก)" })
  }

  if (pinHint !== undefined && typeof pinHint !== "string") {
    return res.status(400).json({ error: "คำใบ้รหัสต้องเป็นข้อความ" })
  }

  if (avatarPublicId !== undefined && typeof avatarPublicId !== "string") {
    return res.status(400).json({ error: "รหัสรูปโปรไฟล์ไม่ถูกต้อง" })
  }

  if (role !== undefined && role !== "admin" && role !== "member") {
    return res.status(400).json({ error: "สิทธิ์ของผู้ใช้ไม่ถูกต้อง" })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("galleryUsers")

    const normalizedFolder = folder.trim()
    const normalizedName = displayName.trim()
    const normalizedAvatarPublicId = normalizeAvatarPublicId(avatarPublicId)
    const normalizedAvatarUrl = buildCloudinaryImageUrl(normalizedAvatarPublicId)

    const existingUser = await collection.findOne({
      $or: [
        { folder: normalizedFolder },
        { displayName: normalizedName },
      ],
    })

    if (existingUser) {
      return res.status(409).json({ error: "มีผู้ใช้หรือโฟลเดอร์นี้อยู่แล้ว" })
    }

    const insertResult = await collection.insertOne({
      displayName: normalizedName,
      folder: normalizedFolder,
      pinHash: createPinHash(pin),
      avatarPublicId: normalizedAvatarPublicId,
      ...(normalizedAvatarUrl ? { avatarUrl: normalizedAvatarUrl } : {}),
      pinHint: pinHint?.trim() || undefined,
      role: role === "admin" ? "admin" : "member",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const newUserDoc = await collection.findOne({ _id: insertResult.insertedId })

    if (!newUserDoc) {
      return res
        .status(500)
        .json({ error: "ไม่สามารถดึงข้อมูลผู้ใช้ที่สร้างขึ้นใหม่ได้" })
    }

    return res.status(201).json({ user: mapUserDocument(newUserDoc) })
  } catch (error: any) {
    console.error("Failed to register gallery user", error)
    return res
      .status(500)
      .json({ error: error?.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้" })
  }
}
