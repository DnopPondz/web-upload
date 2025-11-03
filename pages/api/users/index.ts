import type { NextApiRequest, NextApiResponse } from "next"
import clientPromise from "../../../utils/mongodb"
import { mapUserDocs } from "../../../utils/session"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "img-detail")
    const collection = db.collection("galleryUsers")

    const users = await collection
      .find({}, {
        projection: {
          displayName: 1,
          folder: 1,
          avatarPublicId: 1,
          pinHint: 1,
          role: 1,
        },
      })
      .sort({ displayName: 1 })
      .toArray()

    return res.status(200).json({ users: mapUserDocs(users) })
  } catch (error: any) {
    console.error("Failed to load gallery users", error)
    return res
      .status(500)
      .json({ error: error?.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้" })
  }
}
