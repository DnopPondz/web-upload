import type { NextApiRequest, NextApiResponse } from "next"
import cloudinary from "../../utils/cloudinary"
import { ensureAuthenticatedUser } from "../../utils/session"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb", // ✅ อนุญาตอัปโหลดได้ถึง 20MB (ปรับได้ตามต้องการ)
    },
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const user = await ensureAuthenticatedUser(req, res)

    const { file } = req.body || {}
    if (!file) {
      return res.status(400).json({ error: "No file provided" })
    }

    const uploadOptions: Record<string, any> = {
      folder: user.folder,
      tags: [`gallery-user:${user.id}`],
    }

    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
      uploadOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET
    }

    const uploadResponse = await cloudinary.uploader.upload(file, uploadOptions)

    res.status(200).json({
      success: true,
      public_id: uploadResponse.public_id,
      url: uploadResponse.secure_url,
    })
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 500
    console.error("Upload error:", error)
    res.status(statusCode).json({ error: error.message || "Upload failed." })
  }
}
