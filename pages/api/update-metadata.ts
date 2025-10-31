import type { NextApiRequest, NextApiResponse } from "next"
import cloudinary from "../../utils/cloudinary"

const sanitizeContextValue = (value: string) => value.replace(/[|=]/g, "-")

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { public_id: publicId, album = "", description = "" } = req.body || {}

    if (!publicId || typeof publicId !== "string") {
      return res.status(400).json({ error: "Missing public_id" })
    }

    const safeAlbum = sanitizeContextValue(album.toString())
    const safeDescription = sanitizeContextValue(description.toString())

    const contextParts = [`album=${safeAlbum}`, `description=${safeDescription}`]

    await cloudinary.uploader.add_context(contextParts.join("|"), [publicId])

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error("Update metadata error:", error)
    return res
      .status(500)
      .json({ error: error?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" })
  }
}
