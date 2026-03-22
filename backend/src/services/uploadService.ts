import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'

const USE_S3 = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
)

const s3 = USE_S3
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// Ensure local upload dir exists
if (!USE_S3 && !fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true })
}

export interface UploadResult {
  url: string
  key: string
  storage: 's3' | 'local'
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  // Convert to WebP for smaller file size (skip for GIFs to preserve animation)
  let processedBuffer = buffer
  let finalMime = mimeType
  let ext = path.extname(originalName).toLowerCase() || '.jpg'

  if (mimeType !== 'image/gif') {
    processedBuffer = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    finalMime = 'image/webp'
    ext = '.webp'
  }

  const key = `products/${crypto.randomUUID()}${ext}`

  if (USE_S3 && s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: processedBuffer,
        ContentType: finalMime,
      })
    )
    const url = process.env.AWS_CLOUDFRONT_URL
      ? `${process.env.AWS_CLOUDFRONT_URL}/${key}`
      : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
    return { url, key, storage: 's3' }
  }

  // Local fallback
  const localBaseName = path.basename(key)
  const localPath = path.join(LOCAL_UPLOAD_DIR, localBaseName)
  // Ensure the directory exists (though LOCAL_UPLOAD_DIR is already checked)
  fs.mkdirSync(path.dirname(localPath), { recursive: true })
  fs.writeFileSync(localPath, processedBuffer)

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
  const url = `${baseUrl}/uploads/${localBaseName}`
  return { url, key: localBaseName, storage: 'local' }
}

export async function deleteFile(key: string, storage: 's3' | 'local'): Promise<void> {
  if (storage === 's3' && USE_S3 && s3) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })
    )
    return
  }
  const localPath = path.join(LOCAL_UPLOAD_DIR, key)
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
}
