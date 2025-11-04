import type { NextApiRequest, NextApiResponse } from "next"
import cloudinary from "../../utils/cloudinary"
import clientPromise from "../../utils/mongodb"
import { buildCloudinaryContextString } from "../../utils/photoMetadata"
import { ensureAuthenticatedUser } from "../../utils/session"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const user = await ensureAuthenticatedUser(req, res)

    const {
      public_id: publicId,
      album = "",
      description = "",
      imageName = "",
    } = req.body || {}

    if (!publicId || typeof publicId !== "string") {
      return res.status(400).json({ error: "Missing public_id" })
    }

    if (!publicId.startsWith(`${user.folder}/`)) {
      return res.status(403).json({ error: "ไม่สามารถแก้ไขข้อมูลของผู้ใช้อื่นได้" })
    }

    const { contextString, trimmedValues } = buildCloudinaryContextString({
      album,
      description,
      imageName,
    })

    if (contextString) {
      await cloudinary.uploader.add_context(contextString, [publicId])
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("photoMetadata")

    await collection.updateOne(
      { public_id: publicId },
      {
        $set: {
          public_id: publicId,
          album: trimmedValues.album ?? "",
          description: trimmedValues.description ?? "",
          imageName: trimmedValues.imageName ?? "",
          ownerId: user.id,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return res.status(200).json({ success: true })
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 500
    console.error("Update metadata error:", error)
    return res
      .status(statusCode)
      .json({ error: error?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" })
  }
}
