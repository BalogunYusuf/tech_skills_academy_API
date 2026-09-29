const { Readable } = require('stream');
const Material = require('../models/Material');
const Course = require('../models/Course');
const cloudinary = require('../config/cloudinary');
const { logEvent } = require('../utils/audit');

const isCloudinary = (process.env.STORAGE_MODE || 'cloudinary').toLowerCase() === 'cloudinary';

// Helper: wrap a Buffer in a readable stream (Readable.from() would iterate byte-by-byte)
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// Helper: upload a buffer to Cloudinary via upload_stream
const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'techlearn/materials', resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    bufferToStream(buffer).pipe(uploadStream);
  });
};

// @desc    Upload material
// @route   POST /api/materials
// @access  Private/Staff
exports.uploadMaterial = async (req, res) => {
  try {
    const { title, description, course, type, module, accessLevel, releaseDate, fileUrl: externalUrl } = req.body;

    // Link-type materials only need an external URL; everything else requires a file
    if (!req.file && !(type === 'link' && externalUrl)) {
      return res.status(400).json({ success: false, message: 'Please upload a file or provide an external URL for link materials' });
    }

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role !== 'admin' && String(courseDoc.instructor) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this course' });
    }

    let fileUrl = externalUrl || '';
    let filePublicId;
    let fileSize = req.file ? req.file.size : 0;

    if (req.file) {
      if (isCloudinary) {
        const result = await uploadBufferToCloudinary(req.file.buffer);
        fileUrl = result.secure_url;
        filePublicId = result.public_id;
      } else {
        // Local storage: multer diskStorage already wrote the file to /uploads/materials
        fileUrl = `/uploads/materials/${req.file.filename}`;
      }
    }

    const material = await Material.create({
      title,
      description,
      course,
      instructor: req.user.id,
      type,
      fileUrl,
      filePublicId,
      fileSize,
      module,
      accessLevel,
      releaseDate: accessLevel === 'scheduled' ? releaseDate : null,
      isPublished: true,
      isDraft: false
    });

    courseDoc.modules.push({
      title: module || 'General',
      materials: [material._id]
    });
    await courseDoc.save();

    await logEvent(req, 'material.created', { targetType: 'material', targetId: material._id, meta: { title: material.title, course } });
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get materials, optionally filtered by course
// @route   GET /api/materials?course=xxx
// @access  Private
exports.getMaterials = async (req, res) => {
  try {
    const { course } = req.query;
    const query = { isPublished: true };

    if (req.user.role === 'instructor') query.instructor = req.user.id;

    if (course) {
      query.course = course;
    }

    if (req.user.role === 'student') {
      const User = require('../models/User');
      const user = await User.findById(req.user.id).select('enrolledCourses');
      query.course = query.course ? query.course : { $in: user.enrolledCourses || [] };
      query.$or = [
        { accessLevel: 'all' },
        { accessLevel: 'enrolled' },
        { accessLevel: 'scheduled', releaseDate: { $lte: new Date() } }
      ];
    }

    const materials = await Material.find(query)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: materials.length, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private
exports.getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName');

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    material.views += 1;
    await material.save();

    res.status(200).json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private/Staff
exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    if (req.user.role !== 'admin' && material.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this material' });
    }

    const updated = await Material.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logEvent(req, 'material.updated', { targetType: 'material', targetId: updated._id, meta: { title: updated.title } });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private/Staff
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    if (req.user.role !== 'admin' && material.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this material' });
    }

    if (isCloudinary && material.filePublicId) {
      await cloudinary.uploader.destroy(material.filePublicId, { resource_type: 'auto' }).catch(() => {});
    }

    await material.deleteOne();
    await logEvent(req, 'material.deleted', { targetType: 'material', targetId: material._id, meta: { title: material.title } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Track a download
// @route   POST /api/materials/:id/download
// @access  Private
exports.trackDownload = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    await logEvent(req, 'material.downloaded', { targetType: 'material', targetId: material._id, meta: { title: material.title } });
    res.status(200).json({ success: true, fileUrl: material.fileUrl, downloads: material.downloads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
