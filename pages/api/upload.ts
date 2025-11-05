import type { NextApiRequest, NextApiResponse } from "next"
import cloudinary from "../../utils/cloudinary"
import clientPromise from "../../utils/mongodb"
import { buildCloudinaryContextString } from "../../utils/photoMetadata"
import { ensureAuthenticatedUser } from "../../utils/session"

const MAX_UPLOADS_PER_BATCH = 10

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb", // ✅ อนุญาตอัปโหลดได้ถึง 20MB (ปรับได้ตามต้องการ)
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const user = await ensureAuthenticatedUser(req, res)

    const { file, files, imageName = "", album = "", description = "" } =
      req.body || {}

    const uploadSingleImage = async (
      filePayload: string,
      metadataOverrides?: {
        imageName?: string
        album?: string
        description?: string
      },
    ) => {
      const { contextString, trimmedValues } = buildCloudinaryContextString({
        imageName: metadataOverrides?.imageName ?? imageName,
        album: metadataOverrides?.album ?? album,
        description: metadataOverrides?.description ?? description,
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

      const uploadResponse = await cloudinary.uploader.upload(
        filePayload,
        uploadOptions,
      )

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

      return {
        public_id: uploadResponse.public_id,
        url: uploadResponse.secure_url,
        metadata: {
          imageName: trimmedValues.imageName ?? "",
          album: trimmedValues.album ?? "",
          description: trimmedValues.description ?? "",
        },
      }
    }

    if (Array.isArray(files)) {
      if (files.length === 0) {
        return res.status(400).json({ error: "No files provided" })
      }

      if (files.length > MAX_UPLOADS_PER_BATCH) {
        return res
          .status(400)
          .json({ error: `อัปโหลดได้สูงสุด ${MAX_UPLOADS_PER_BATCH} รูปต่อครั้ง` })
      }

      const uploadResults = [] as Array<{
        public_id: string
        url: string
        metadata: { imageName: string; album: string; description: string }
      }>

      for (const entry of files) {
        if (!entry || typeof entry.file !== "string") {
          return res.status(400).json({ error: "Invalid file payload" })
        }

        const result = await uploadSingleImage(entry.file, {
          imageName: entry.imageName,
          album: entry.album,
          description: entry.description,
        })
        uploadResults.push(result)
      }

      return res.status(200).json({ success: true, results: uploadResults })
    }

    if (!file) {
      return res.status(400).json({ error: "No file provided" })
    }

    if (typeof file !== "string") {
      return res.status(400).json({ error: "Invalid file provided" })
    }

    const singleResult = await uploadSingleImage(file)

    res.status(200).json({
      success: true,
      public_id: singleResult.public_id,
      url: singleResult.url,
      metadata: singleResult.metadata,
    })
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 500
    console.error("Upload error:", error)
    res.status(statusCode).json({ error: error.message || "Upload failed." })
  }
}
