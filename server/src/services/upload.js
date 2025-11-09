import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env.js';

// Configure Cloudinary
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed'));
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

export const uploadToCloudinary = async (filePath, folder = 'products') => {
  if (env.USE_LOCAL_STORAGE) {
    // Return local file path
    return {
      url: `/uploads/${path.basename(filePath)}`,
      publicId: path.basename(filePath),
    };
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `abaya-house/${folder}`,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    // Delete local file after upload
    await fs.unlink(filePath).catch(err => console.error('File deletion error:', err));

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

export const deleteFromCloudinary = async publicId => {
  if (env.USE_LOCAL_STORAGE) {
    // Delete local file
    const filePath = path.join(process.cwd(), 'uploads', publicId);
    await fs.unlink(filePath).catch(err => console.error('File deletion error:', err));
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
  }
};
