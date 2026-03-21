import { Router, Response } from 'express'
import multer from 'multer'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import { uploadFile } from '../services/uploadService'

const router = Router()

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.'))
    }
  },
})

/**Think
 * POST /api/upload
 * Upload a single image. Returns { url, key, storage }
 * Requires: authenticated seller or admin
 */
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  upload.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' })
        return
      }

      const result = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

      res.status(201).json({
        message: 'Image uploaded successfully',
        data: result,
      })
    } catch (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File too large. Maximum size is 5MB.' })
          return
        }
        res.status(400).json({ error: error.message })
        return
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({ error: 'Upload failed' })
    }
  }
)

export default router
