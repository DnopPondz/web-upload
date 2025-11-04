import type { NextApiRequest, NextApiResponse } from "next"
import cloudinary from "../../utils/cloudinary"
import clientPromise from "../../utils/mongodb"
import { buildCloudinaryContextString } from "../../utils/photoMetadata"
import { ensureAuthenticatedUser } from "../../utils/session"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb", // ✅ อนุญาตอัปโหลดได้ถึง 20MB (ปรับได้ตามต้องการ)
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const user = await ensureAuthenticatedUser(req, res)

    const { file, imageName = "", album = "", description = "" } = req.body || {}
    if (!file) {
      return res.status(400).json({ error: "No file provided" })
    }

    if (typeof file !== "string") {
      return res.status(400).json({ error: "Invalid file provided" })
    }

    const { contextString, trimmedValues } = buildCloudinaryContextString({
      imageName,
      album,
      description,
    })

    const uploadOptions: Record<string, any> = {
      folder: user.folder,
      tags: [`gallery-user:${user.id}`],
    }

    if (contextString) {
      uploadOptions.context = contextString
    }

    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
      uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET
    }

    const uploadResponse = await cloudinary.uploader.upload(file, uploadOptions)

    if (process.env.MONGODB_URI) {
      try {
        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB || "img-detail")
        const collection = db.collection("photoMetadata")
        const now = new Date()

        await collection.updateOne(
          { public_id: uploadResponse.public_id },
          {
            $set: {
              public_id: uploadResponse.public_id,
              album: trimmedValues.album ?? "",
              description: trimmedValues.description ?? "",
              imageName: trimmedValues.imageName ?? "",
              ownerId: user.id,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true },
        )
      } catch (error) {
        console.error("Failed to persist upload metadata", error)
      }
    }

    res.status(200).json({
      success: true,
      public_id: uploadResponse.public_id,
      url: uploadResponse.secure_url,
      metadata: {
        imageName: trimmedValues.imageName ?? "",
        album: trimmedValues.album ?? "",
        description: trimmedValues.description ?? "",
      },
    })
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 500
    console.error("Upload error:", error)
    res.status(statusCode).json({ error: error.message || "Upload failed." })
  }
}
