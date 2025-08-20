const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadImage = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: 'infranet/posts',
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

// Upload video to Cloudinary
const uploadVideo = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: 'infranet/posts',
      resource_type: 'video',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error('Failed to upload video');
  }
};

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

module.exports = {
  uploadImage,
  uploadVideo,
  deleteFile
};
