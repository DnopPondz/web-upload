// pages/api/delete.ts
import cloudinary from '../../utils/cloudinary'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { public_id } = req.body
    if (!public_id) {
      return res.status(400).json({ error: 'Missing public_id' })
    }

    const result = await cloudinary.uploader.destroy(public_id)
    console.log('Delete result:', result)

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('Failed to delete image')
    }

    res.status(200).json({ success: true, result })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: error.message || 'Delete failed.' })
  }
}
