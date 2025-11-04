import type { NextApiRequest, NextApiResponse } from "next"
import { ObjectId } from "mongodb"
import cloudinary from "../../../utils/cloudinary"
import clientPromise from "../../../utils/mongodb"
import {
  buildCloudinaryImageUrl,
  normalizeAvatarPublicId,
  resolveCloudinaryAvatarFolder,
} from "../../../utils/cloudinaryHelpers"
import { ensureAuthenticatedUser, mapUserDocument } from "../../../utils/session"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}

const AVATAR_FOLDER = resolveCloudinaryAvatarFolder()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const user = await ensureAuthenticatedUser(req, res)
    const { file } = req.body || {}

    if (!file || typeof file !== "string") {
      return res.status(400).json({ error: "กรุณาเลือกรูปภาพที่จะอัปโหลด" })
    }

    const uploadOptions: Record<string, any> = {
      folder: AVATAR_FOLDER,
      public_id: user.id,
      overwrite: true,
      invalidate: true,
      tags: [`gallery-user:${user.id}`, "avatar"],
    }

    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
      uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET
    }

    const uploadResponse = await cloudinary.uploader.upload(file, uploadOptions)

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("galleryUsers")
    const userId = new ObjectId(user.id)

    const normalizedPublicId =
      normalizeAvatarPublicId(uploadResponse.public_id) || uploadResponse.public_id
    const resolvedAvatarUrl =
      uploadResponse.secure_url || buildCloudinaryImageUrl(normalizedPublicId)

    await collection.updateOne(
      { _id: userId },
      {
        $set: {
          avatarPublicId: normalizedPublicId,
          avatarUrl: resolvedAvatarUrl,
          updatedAt: new Date(),
        },
      },
    )

    const updatedUserDoc = await collection.findOne({ _id: userId })
    const updatedUser = updatedUserDoc ? mapUserDocument(updatedUserDoc) : null

    const previousPublicId = normalizeAvatarPublicId(user.avatarPublicId)

    if (previousPublicId && previousPublicId !== normalizedPublicId) {
      try {
        await cloudinary.uploader.destroy(previousPublicId)
      } catch (destroyError) {
        console.warn("Failed to remove previous avatar", destroyError)
      }
    }

    return res.status(200).json({
      success: true,
      avatarPublicId: normalizedPublicId,
      avatarUrl: resolvedAvatarUrl,
      user: updatedUser ?? {
        ...user,
        avatarPublicId: normalizedPublicId ?? undefined,
        avatarUrl: resolvedAvatarUrl ?? undefined,
      },
    })
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 500
    console.error("Avatar upload error:", error)
    return res.status(statusCode).json({ error: error?.message || "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้" })
  }
}
