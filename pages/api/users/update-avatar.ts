import type { NextApiRequest, NextApiResponse } from "next"
import { ObjectId } from "mongodb"
import cloudinary from "../../../utils/cloudinary"
import clientPromise from "../../../utils/mongodb"
import { ensureAuthenticatedUser, mapUserDocument } from "../../../utils/session"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}

const isDataUriImage = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:image/")

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

  const { file } = req.body || {}

  if (!isDataUriImage(file)) {
    return res.status(400).json({ error: "กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง" })
  }

  const avatarFolderRoot = process.env.CLOUDINARY_AVATAR_FOLDER?.trim() || "user-avatars"
  const uploadOptions: Record<string, any> = {
    folder: `${avatarFolderRoot}/${user.id}`,
    tags: [`gallery-user:${user.id}`, "profile-avatar"],
    invalidate: true,
  }

  if (process.env.CLOUDINARY_UPLOAD_PRESET) {
    uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET
  }

  const previousAvatarId = user.avatarPublicId

  try {
    const uploadResponse = await cloudinary.uploader.upload(file, uploadOptions)

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("galleryUsers")

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(user.id) },
      {
        $set: { avatarPublicId: uploadResponse.public_id },
      },
      {
        returnDocument: "after",
        projection: {
          displayName: 1,
          folder: 1,
          avatarPublicId: 1,
          pinHint: 1,
          role: 1,
        },
      },
    )

    if (!result.value) {
      await cloudinary.uploader.destroy(uploadResponse.public_id).catch(() => null)
      return res.status(404).json({ error: "ไม่พบผู้ใช้" })
    }

    if (previousAvatarId && previousAvatarId !== uploadResponse.public_id) {
      await cloudinary.uploader.destroy(previousAvatarId, { invalidate: true }).catch(() => null)
    }

    return res.status(200).json({ user: mapUserDocument(result.value) })
  } catch (error: any) {
    console.error("Failed to update avatar", error)
    return res.status(500).json({ error: error?.message || "ไม่สามารถอัปเดตรูปโปรไฟล์ได้" })
  }
}
