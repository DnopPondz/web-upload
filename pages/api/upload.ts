// pages/api/upload.ts
import cloudinary from '../../utils/cloudinary'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // ✅ อนุญาตอัปโหลดได้ถึง 10MB (ปรับได้ตามต้องการ)
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { file } = req.body
    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const uploadResponse = await cloudinary.uploader.upload(file, {
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      tags: ['nextjs-conf'],
    })

    res.status(200).json({
      success: true,
      public_id: uploadResponse.public_id,
      url: uploadResponse.secure_url,
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message || 'Upload failed.' })
  }
}
