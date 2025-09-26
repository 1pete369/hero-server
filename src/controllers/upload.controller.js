import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'profile-pictures', // Organize images in folders
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Auto-crop to square, focus on face
            { quality: 'auto' }, // Auto-optimize quality
            { format: 'auto' }, // Auto-optimize format (WebP, AVIF, etc.)
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.status(200).json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.status(200).json({ 
        success: true, 
        message: 'Image deleted successfully' 
      });
    } else {
      res.status(400).json({ 
        message: 'Failed to delete image' 
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      message: 'Failed to delete image',
      error: error.message 
    });
  }
};
