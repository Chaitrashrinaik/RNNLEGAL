const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const { getDb, queryAll, queryOne } = require('../config/db');
const Document = require('../models/Document');
const Case = require('../models/Case');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { uploadDocument, uploadDocuments, handleUploadError, deleteFromCloudinary, deleteMultipleFromCloudinary, getCloudinaryUrl, getCloudinaryConfigured } = require('../middleware/upload');
const { paginationHelper, paginateResults } = require('../utils/helpers');
const { logFromRequest } = require('../utils/activityLogger');

const router = express.Router();

router.use(auth);

function getDocumentUrl(doc) {
  if (doc.cloudUrl) return doc.cloudUrl;
  if (doc.cloudPublicId && getCloudinaryConfigured()) return getCloudinaryUrl(doc.cloudPublicId);
  if (doc.filePath) {
    let absPath = path.resolve(doc.filePath);
    if (!fs.existsSync(absPath)) {
      absPath = path.join(__dirname, '../../uploads/documents', path.basename(doc.filePath));
    }
    if (fs.existsSync(absPath)) {
      return `/api/documents/${doc.id}/file`;
    }
  }
  return null;
}

function getDocumentThumbnailUrl(doc) {
  if (doc.thumbnailUrl) return doc.thumbnailUrl;
  if (doc.cloudPublicId && getCloudinaryConfigured()) {
    const ext = (doc.originalName || '').split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return getCloudinaryUrl(doc.cloudPublicId, { transformation: [{ width: 200, height: 200, crop: 'fill' }] });
    }
  }
  return null;
}

async function populateDocs(docs) {
  if (docs.length === 0) return [];
  const caseIds = [...new Set(docs.map(d => d.caseId).filter(Boolean))];
  const userIds = [...new Set(docs.map(d => d.uploadedBy).filter(Boolean))];

  let cases = [];
  let users = [];

  if (caseIds.length > 0) {
    cases = await queryAll(`SELECT id,caseNumber,caseTitle FROM cases WHERE id IN (${caseIds.map(() => '?').join(',')})`, caseIds);
  }
  if (userIds.length > 0) {
    users = await queryAll(`SELECT id,name,email FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds);
  }

  const caseMap = Object.fromEntries(cases.map(c => { c._id = c.id; return [c.id, c]; }));
  const userMap = Object.fromEntries(users.map(u => { u._id = u.id; return [u.id, u]; }));

  return docs.map(d => {
    const parsed = Document.parseDoc(d);
    return {
      ...parsed,
      fileUrl: getDocumentUrl(d),
      thumbnailUrl: getDocumentThumbnailUrl(d),
      case: caseMap[d.caseId] || null,
      uploadedBy: userMap[d.uploadedBy] || null,
    };
  });
}

router.get('/:id/file', async (req, res) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let decoded;
    try {
      const jwt = require('jsonwebtoken');
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.cloudUrl) {
      return res.redirect(doc.cloudUrl);
    }
    if (doc.cloudPublicId && getCloudinaryConfigured()) {
      return res.redirect(getCloudinaryUrl(doc.cloudPublicId));
    }

    let filePath = doc.filePath ? path.resolve(doc.filePath) : null;
    if (!filePath || !fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../../uploads/documents', path.basename(doc.filePath || ''));
    }
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || 'document')}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Serve document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error serving document' });
  }
});

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim(),
    query('case').optional().trim(),
    query('category').optional().isIn(['order', 'judgment', 'petition', 'evidence', 'notice', 'correspondence', 'other']),
    query('sortBy').optional().isIn(['title', 'createdAt', 'fileSize', 'category']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { page, limit, skip } = paginationHelper(req.query.page, req.query.limit);
      const { search, case: caseId, category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      let where = 'WHERE 1=1';
      const params = [];

      if (caseId) { where += ' AND d.caseId = ?'; params.push(caseId); }
      if (category) { where += ' AND d.category = ?'; params.push(category); }

      if (search) {
        where += ' AND (d.title LIKE ? OR d.originalName LIKE ? OR d.tags LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      const countResult = await queryOne(`SELECT COUNT(*) as c FROM documents d ${where}`, params);
      const total = countResult?.c || 0;

      const docs = await queryAll(
        `SELECT d.* FROM documents d ${where} ORDER BY d.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      );

      res.json({
        success: true,
        data: await populateDocs(docs),
        pagination: paginateResults(total, page, limit),
      });
    } catch (error) {
      console.error('Get documents error:', error.message);
      res.status(500).json({ success: false, message: 'Server error fetching documents' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const parsed = Document.parseDoc(doc);
    const caseItem = doc.caseId ? await queryOne('SELECT id,caseNumber,caseTitle FROM cases WHERE id = ?', [doc.caseId]) : null;
    const uploader = doc.uploadedBy ? await queryOne('SELECT id,name,email FROM users WHERE id = ?', [doc.uploadedBy]) : null;

    if (caseItem) caseItem._id = caseItem.id;
    if (uploader) uploader._id = uploader.id;

    const versions = (parsed.versions || []).map(v => ({ ...v }));

    res.json({
      success: true,
      data: {
        ...parsed,
        fileUrl: getDocumentUrl(doc),
        thumbnailUrl: getDocumentThumbnailUrl(doc),
        case: caseItem,
        uploadedBy: uploader,
        versions,
      },
    });
  } catch (error) {
    console.error('Get document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching document' });
  }
});

router.get('/:id/view-url', async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const url = getDocumentUrl(doc);
    if (!url) {
      return res.status(404).json({ success: false, message: 'Document URL not available' });
    }

    res.json({ success: true, data: { url, fileName: doc.originalName, mimeType: doc.mimeType, fileSize: doc.fileSize } });
  } catch (error) {
    console.error('Get view URL error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const url = getDocumentUrl(doc);
    if (url) {
      return res.redirect(url);
    }

    return res.status(404).json({ success: false, message: 'Document not available for download' });
  } catch (error) {
    console.error('Download document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error downloading document' });
  }
});

router.get('/:id/download-url', async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const url = getDocumentUrl(doc);
    if (!url) {
      return res.status(404).json({ success: false, message: 'Document URL not available' });
    }

    res.json({ success: true, data: { url, fileName: doc.originalName, mimeType: doc.mimeType, fileSize: doc.fileSize } });
  } catch (error) {
    console.error('Get download URL error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', checkPermission('documents', 'add'), uploadDocument, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, case: caseId, category, tags, accessLevel } = req.body;

    const isCloud = !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
    const cloudUrl = isCloud ? (req.file.path || req.file.url || null) : null;
    const cloudPublicId = req.file.filename || req.file.public_id || null;

    const document = await Document.create({
      title: title || req.file.originalname,
      fileName: cloudPublicId || req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path || cloudUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      caseId: caseId || null,
      uploadedBy: req.user._id,
      category: category || 'other',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags) : [],
      accessLevel: accessLevel || 'team',
      cloudUrl,
      cloudPublicId,
      versions: [
        {
          version: 1,
          uploadedBy: req.user._id,
          filePath: cloudUrl,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          cloudUrl,
          cloudPublicId,
        },
      ],
    });

    const populated = (await populateDocs([await queryOne('SELECT * FROM documents WHERE id = ?', [document.id])]))[0];
    res.status(201).json({ success: true, data: populated });
    logFromRequest(req, { action: 'document_uploaded', entity: 'document', entityId: document.id, caseId: req.body.caseId, module: 'Documents', details: `Document uploaded: ${req.file?.originalname}` });
  } catch (error) {
    console.error('Upload document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error uploading document' });
  }
});

router.put('/:id', checkPermission('documents', 'edit'), async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const { title, category, tags, accessLevel } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (category) updates.category = category;
    if (tags) updates.tags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
    if (accessLevel) updates.accessLevel = accessLevel;

    await Document.updateById(req.params.id, updates);

    const updated = (await populateDocs([await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id])]))[0];
    res.json({ success: true, data: updated });
    logFromRequest(req, { action: 'document_updated', entity: 'document', entityId: req.params.id, module: 'Documents', details: 'Document metadata updated' });
  } catch (error) {
    console.error('Update document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating document' });
  }
});

router.delete('/:id', checkPermission('documents', 'delete'), async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.cloudPublicId) {
      await deleteFromCloudinary(doc.cloudPublicId);
    }

    const versions = JSON.parse(doc.versions || '[]');
    const cloudIds = versions.filter(v => v.cloudPublicId).map(v => v.cloudPublicId);
    if (cloudIds.length > 0) {
      await deleteMultipleFromCloudinary(cloudIds);
    }

    await Document.deleteById(req.params.id);
    res.json({ success: true, message: 'Document deleted successfully' });
    logFromRequest(req, { action: 'document_deleted', entity: 'document', entityId: req.params.id, module: 'Documents', details: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error deleting document' });
  }
});

router.put('/:id/rename', checkPermission('documents', 'edit'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const ext = path.extname(doc.originalName);
    const newOriginalName = name.trim().endsWith(ext) ? name.trim() : name.trim() + ext;

    await Document.updateById(req.params.id, {
      title: name.trim(),
      originalName: newOriginalName,
    });

    const updated = (await populateDocs([await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id])]))[0];
    res.json({ success: true, data: updated, message: 'Document renamed' });
    logFromRequest(req, { action: 'document_renamed', entity: 'document', entityId: req.params.id, module: 'Documents', details: `Document renamed to ${req.body.name}` });
  } catch (error) {
    console.error('Rename document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error renaming document' });
  }
});

router.get('/:id/preview', async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const url = getDocumentUrl(doc);
    if (url) {
      return res.redirect(url);
    }

    return res.status(404).json({ success: false, message: 'Document not available for preview' });
  } catch (error) {
    console.error('Preview document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error previewing document' });
  }
});

router.post('/:id/versions', uploadDocument, handleUploadError, async (req, res) => {
  try {
    const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const isCloud = !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
    const cloudUrl = isCloud ? (req.file.path || req.file.url || null) : null;
    const cloudPublicId = req.file.filename || req.file.public_id || null;

    const versions = JSON.parse(doc.versions || '[]');
    const newVersion = versions.length + 1;

    versions.push({
      version: newVersion,
      uploadedBy: req.user._id,
      filePath: cloudUrl,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      cloudUrl,
      cloudPublicId,
    });

    await Document.updateById(req.params.id, {
      fileName: cloudPublicId || req.file.filename,
      originalName: req.file.originalname,
      filePath: cloudUrl || req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      cloudUrl,
      cloudPublicId,
      versions,
    });

    const updated = (await populateDocs([await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id])]))[0];
    if (updated.versions) {
      updated.versions = updated.versions.map(v => ({ ...v }));
    }

    res.json({ success: true, data: updated });
    logFromRequest(req, { action: 'document_version_uploaded', entity: 'document', entityId: req.params.id, module: 'Documents', details: 'New document version uploaded' });
  } catch (error) {
    console.error('Add version error:', error.message);
    res.status(500).json({ success: false, message: 'Server error adding version' });
  }
});

module.exports = router;
