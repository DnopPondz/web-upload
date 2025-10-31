import type { NextApiRequest, NextApiResponse } from "next"
import cloudinary from "../../utils/cloudinary"
import { ensureAuthenticatedUser } from "../../utils/session"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const user = await ensureAuthenticatedUser(req, res)
    const { public_id: publicId } = req.body || {}
    if (!publicId || typeof publicId !== "string") {
      return res.status(400).json({ error: "Missing public_id" })
    }

    if (!publicId.startsWith(`${user.folder}/`)) {
      return res.status(403).json({ error: "ไม่สามารถลบไฟล์ของผู้ใช้อื่นได้" })
    }

    const result = await cloudinary.uploader.destroy(publicId)
    console.log("Delete result:", result)

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error("Failed to delete image")
    }

    res.status(200).json({ success: true, result })
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 500
    console.error("Delete error:", error)
    res.status(statusCode).json({ error: error.message || "Delete failed." })
  }
}
