import type { NextApiRequest, NextApiResponse } from "next"
import { ObjectId } from "mongodb"
import clientPromise from "../../../utils/mongodb"
import { verifyPinHash } from "../../../utils/pinHash"
import { buildCloudinaryImageUrl, normalizeAvatarPublicId } from "../../../utils/cloudinaryHelpers"
import { createSessionCookie } from "../../../utils/session"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { userId, pin } = req.body || {}

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "กรุณาเลือกผู้ใช้" })
  }

  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "กรุณากรอกรหัส PIN" })
  }

  try {
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "กรุณาเลือกผู้ใช้ที่ถูกต้อง" })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("galleryUsers")

    const userDoc = await collection.findOne({ _id: new ObjectId(userId) })

    if (!userDoc || !userDoc.pinHash) {
      return res.status(401).json({ error: "ไม่สามารถยืนยันตัวตนได้" })
    }

    const isValid = verifyPinHash(pin, userDoc.pinHash)

    if (!isValid) {
      return res.status(401).json({ error: "รหัส PIN ไม่ถูกต้อง" })
    }

    res.setHeader("Set-Cookie", createSessionCookie(userDoc._id.toString()))

    const avatarPublicId = normalizeAvatarPublicId(userDoc.avatarPublicId)
    const rawAvatarUrl =
      typeof userDoc.avatarUrl === "string" && userDoc.avatarUrl.trim()
        ? userDoc.avatarUrl.trim()
        : undefined

    const avatarUrl = rawAvatarUrl || buildCloudinaryImageUrl(avatarPublicId)

    return res.status(200).json({
      user: {
        id: userDoc._id.toString(),
        displayName: userDoc.displayName,
        folder: userDoc.folder,
        avatarPublicId,
        avatarUrl: avatarUrl ?? undefined,
      },
    })
  } catch (error: any) {
    console.error("Failed to verify user", error)
    return res
      .status(500)
      .json({ error: error?.message || "เกิดข้อผิดพลาดในการยืนยันตัวตน" })
  }
}
