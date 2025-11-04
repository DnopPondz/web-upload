import type { NextApiRequest, NextApiResponse } from "next"
import { ObjectId } from "mongodb"
import clientPromise from "../../../utils/mongodb"
import {
  ensureAuthenticatedUser,
  mapUserDocument,
} from "../../../utils/session"
import {
  buildCloudinaryImageUrl,
  normalizeAvatarPublicId,
} from "../../../utils/cloudinaryHelpers"
import { createPinHash } from "../../../utils/pinHash"

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isValidPin = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9]{4,10}$/.test(value)

const normalizeOptionalString = (value: unknown) => {
  if (value === undefined) return undefined
  if (typeof value !== "string") return undefined
  return value.trim()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "รหัสผู้ใช้ไม่ถูกต้อง" })
  }

  let adminUser
  try {
    adminUser = await ensureAuthenticatedUser(req, res)
    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "ต้องเป็นผู้ดูแลระบบเท่านั้น" })
    }
  } catch (error: any) {
    const statusCode = error?.statusCode || 500
    return res.status(statusCode).json({ error: error?.message || "Unauthorized" })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "img-detail")
  const collection = db.collection("galleryUsers")
  const userObjectId = new ObjectId(id)

  if (req.method === "PUT") {
    const { displayName, folder, role, pin, pinHint, avatarPublicId } = req.body || {}

    const setFields: Record<string, any> = {}
    const unsetFields: Record<string, ""> = {}

    if (displayName !== undefined) {
      if (!isNonEmptyString(displayName)) {
        return res.status(400).json({ error: "กรุณาระบุชื่อผู้ใช้" })
      }
      setFields.displayName = displayName.trim()
    }

    if (folder !== undefined) {
      if (!isNonEmptyString(folder)) {
        return res.status(400).json({ error: "กรุณาระบุโฟลเดอร์ของผู้ใช้" })
      }
      setFields.folder = folder.trim()
    }

    if (role !== undefined) {
      if (role !== "admin" && role !== "member") {
        return res.status(400).json({ error: "สิทธิ์ของผู้ใช้ไม่ถูกต้อง" })
      }
      setFields.role = role
    }

    if (pin !== undefined) {
      const normalizedPin = typeof pin === "string" ? pin.trim() : pin
      if (normalizedPin === "") {
        unsetFields.pinHash = ""
      } else {
        if (!isValidPin(normalizedPin)) {
          return res
            .status(400)
            .json({ error: "กรุณากรอกรหัส PIN ให้ถูกต้อง (ตัวเลข 4-10 หลัก)" })
        }
        setFields.pinHash = createPinHash(normalizedPin)
      }
    }

    if (pinHint !== undefined) {
      const normalizedHint = normalizeOptionalString(pinHint)
      if (!normalizedHint) {
        unsetFields.pinHint = ""
      } else {
        setFields.pinHint = normalizedHint
      }
    }

    if (avatarPublicId !== undefined) {
      const normalizedAvatar = normalizeOptionalString(avatarPublicId)
      if (normalizedAvatar === undefined) {
        return res.status(400).json({ error: "รหัสรูปโปรไฟล์ไม่ถูกต้อง" })
      }

      const sanitizedPublicId = normalizeAvatarPublicId(normalizedAvatar)
      const resolvedUrl = buildCloudinaryImageUrl(sanitizedPublicId)

      if (!sanitizedPublicId) {
        unsetFields.avatarPublicId = ""
        unsetFields.avatarUrl = ""
      } else {
        setFields.avatarPublicId = sanitizedPublicId
        if (resolvedUrl) {
          setFields.avatarUrl = resolvedUrl
        } else {
          unsetFields.avatarUrl = ""
        }
      }
    }

    const hasSetFields = Object.keys(setFields).length > 0
    const hasUnsetFields = Object.keys(unsetFields).length > 0

    if (!hasSetFields && !hasUnsetFields) {
      return res.status(400).json({ error: "ไม่มีข้อมูลสำหรับอัปเดต" })
    }

    const uniquenessFilters = []
    if (setFields.displayName) {
      uniquenessFilters.push({ displayName: setFields.displayName })
    }
    if (setFields.folder) {
      uniquenessFilters.push({ folder: setFields.folder })
    }

    if (uniquenessFilters.length > 0) {
      const conflictUser = await collection.findOne({
        _id: { $ne: userObjectId },
        $or: uniquenessFilters,
      })

      if (conflictUser) {
        return res.status(409).json({ error: "มีผู้ใช้หรือโฟลเดอร์นี้อยู่แล้ว" })
      }
    }

    setFields.updatedAt = new Date()

    const updateOperations: Record<string, any> = {}
    if (Object.keys(setFields).length > 0) {
      updateOperations.$set = setFields
    }
    if (hasUnsetFields) {
      updateOperations.$unset = unsetFields
    }

    const updateResult = await collection.findOneAndUpdate(
      { _id: userObjectId },
      updateOperations,
      { returnDocument: "after" },
    )

    if (!updateResult.value) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" })
    }

    return res.status(200).json({ user: mapUserDocument(updateResult.value) })
  }

  if (req.method === "DELETE") {
    if (adminUser.id === id) {
      return res.status(400).json({ error: "ไม่สามารถลบผู้ใช้ที่กำลังเข้าสู่ระบบได้" })
    }

    const deleteResult = await collection.deleteOne({ _id: userObjectId })

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" })
    }

    return res.status(204).end()
  }

  res.setHeader("Allow", "PUT, DELETE")
  return res.status(405).json({ error: "Method not allowed" })
}
