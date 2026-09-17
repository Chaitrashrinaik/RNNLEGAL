const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

const AVATAR_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const MAX_DOC_SIZE = 50 * 1024 * 1024;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function buildStorage(folderFn) {
  if (!isCloudinaryConfigured) {
    const diskStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        const folder = file.fieldname === 'avatar'
          ? path.join(__dirname, '../../uploads/avatars')
          : path.join(__dirname, '../../uploads/documents');
        cb(null, folder);
      },
      filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
      },
    });
    return diskStorage;
  }
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const folder = folderFn(req, file);
      return {
        folder,
        public_id: `${uuidv4()}`,
        resource_type: 'auto',
        type: 'upload',
      };
    },
  });
}

const docStorage = buildStorage((req, file) => {
  if (req.body.caseId) return `case-management/documents/cases/${req.body.caseId}`;
  return 'case-management/documents/general';
});

const avatarStorage = buildStorage(() => 'case-management/avatars');

const uploadDocument = multer({
  storage: docStorage,
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, WEBP, TXT, ZIP.`), false);
  },
  limits: { fileSize: MAX_DOC_SIZE },
}).single('file');

const uploadDocuments = multer({
  storage: docStorage,
  fileFilter: (req, file, cb) => {
    if (DOCUMENT_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
  },
  limits: { fileSize: MAX_DOC_SIZE },
}).array('files', 10);

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (AVATAR_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG/PNG/WebP images are allowed for avatar.'), false);
  },
  limits: { fileSize: MAX_AVATAR_SIZE },
}).single('avatar');

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File size exceeds the 50MB limit.' });
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: 'Unexpected file field.' });
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
};

async function deleteFromCloudinary(publicId) {
  if (!publicId || !isCloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

async function deleteMultipleFromCloudinary(publicIds) {
  if (!publicIds || publicIds.length === 0 || !isCloudinaryConfigured) return;
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: 'auto' });
  } catch (err) {
    console.error('Cloudinary batch delete error:', err.message);
  }
}

function getCloudinaryUrl(publicId, options = {}) {
  if (!publicId || !isCloudinaryConfigured) return null;
  return cloudinary.url(publicId, {
    resource_type: 'auto',
    secure: true,
    ...options,
  });
}

function getCloudinaryConfigured() {
  return isCloudinaryConfigured;
}

module.exports = {
  cloudinary,
  uploadDocument,
  uploadDocuments,
  uploadAvatar,
  handleUploadError,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getCloudinaryUrl,
  getCloudinaryConfigured,
  DOCUMENT_MIMES,
  AVATAR_MIMES,
};
