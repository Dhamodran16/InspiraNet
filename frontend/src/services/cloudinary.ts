
import { Cloudinary } from '@cloudinary/url-gen';

// Initialize Cloudinary with environment variables
const cloudinary = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'infranet-sample'
  }
});

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'infranet-sample';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'InfraNet';

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
}

// Upload image to Cloudinary
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  try {
    console.log('Uploading image to Cloudinary:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
    formData.append('folder', 'infranet/posts');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    console.log('Cloudinary response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary upload failed:', errorData);
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
    }

    const data: CloudinaryResponse = await response.json();
    console.log('Cloudinary upload successful:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Upload video to Cloudinary
export const uploadVideoToCloudinary = async (file: File): Promise<string> => {
  try {
    console.log('Uploading video to Cloudinary:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
    formData.append('folder', 'infranet/posts');
    formData.append('resource_type', 'video');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    console.log('Cloudinary video response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary video upload failed:', errorData);
      throw new Error(`Failed to upload video: ${response.status} ${response.statusText}`);
    }

    const data: CloudinaryResponse = await response.json();
    console.log('Cloudinary video upload successful:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Upload resume to Cloudinary (PDF or image)
export const uploadResumeToCloudinary = async (file: File): Promise<string> => {
  try {
    console.log('Uploading resume to Cloudinary:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate file type for resume
    const allowedResumeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedResumeTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF and image files are allowed for resumes.');
    }

    // Check file size (max 10MB for resumes)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 10MB for resumes.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
    formData.append('folder', 'infranet/resumes');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    console.log('Cloudinary resume response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary resume upload failed:', errorData);
      throw new Error(`Failed to upload resume: ${response.status} ${response.statusText}`);
    }

    const data: CloudinaryResponse = await response.json();
    console.log('Cloudinary resume upload successful:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading resume to Cloudinary:', error);
    throw new Error(`Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Validate file type and size
export const validateFile = (file: File, maxSize: number = 10 * 1024 * 1024): boolean => {
  // Check file size (default 10MB)
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 10MB.');
  }

  // Check file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

  if (!allowedImageTypes.includes(file.type) && !allowedVideoTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only images and videos are allowed.');
  }

  return true;
};

// Get file type
export const getFileType = (file: File): 'image' | 'video' => {
  if (file.type.startsWith('image/')) {
    return 'image';
  } else if (file.type.startsWith('video/')) {
    return 'video';
  }
  throw new Error('Invalid file type');
};
