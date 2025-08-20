import React from 'react';
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage, responsive, placeholder } from '@cloudinary/react';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { auto } from '@cloudinary/url-gen/actions/resize';

interface CloudinaryImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: 'auto' | 'low' | 'good' | 'best';
  format?: 'auto' | 'webp' | 'jpg' | 'png' | 'avif';
  crop?: 'fill' | 'scale' | 'fit' | 'thumb';
  gravity?: 'auto' | 'center' | 'north' | 'south' | 'east' | 'west';
}

const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  src,
  alt = '',
  className = '',
  width = 500,
  height = 500,
  quality = 'auto',
  format = 'auto',
  crop = 'fill',
  gravity = 'auto'
}) => {
  // Check if the URL is a valid Cloudinary URL
  const isCloudinaryUrl = src.includes('cloudinary.com');
  
  if (!isCloudinaryUrl) {
    // Fallback to regular img tag for non-Cloudinary URLs
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: width, height: height, objectFit: crop === 'fill' ? 'cover' : 'contain' }}
      />
    );
  }

  // Extract public ID from Cloudinary URL
  const extractPublicId = (url: string): string => {
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
        // Skip version and get the path after upload
        const publicIdParts = urlParts.slice(uploadIndex + 2);
        return publicIdParts.join('/').split('.')[0]; // Remove file extension
      }
      return '';
    } catch (error) {
      console.error('Error extracting Cloudinary public ID:', error);
      return '';
    }
  };

  const publicId = extractPublicId(src);
  
  if (!publicId) {
    // Fallback to regular img tag if we can't extract public ID
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: width, height: height, objectFit: crop === 'fill' ? 'cover' : 'contain' }}
      />
    );
  }

  // Initialize Cloudinary
  const cld = new Cloudinary({ 
    cloud: { 
      cloudName: 'infranet-sample' // Your cloud name from config
    } 
  });

  // Create the image transformation
  let image = cld.image(publicId);

  // Apply transformations based on props
  if (crop === 'fill') {
    image = image.resize(auto().width(width).height(height).gravity(autoGravity()));
  } else if (crop === 'scale') {
    image = image.resize(auto().width(width).height(height).scale());
  } else if (crop === 'fit') {
    image = image.resize(auto().width(width).height(height).fit());
  } else if (crop === 'thumb') {
    image = image.resize(auto().width(width).height(height).gravity(autoGravity()).crop('thumb'));
  }

  // Apply quality and format
  image = image.quality(quality).format(format);

  return (
    <AdvancedImage
      cldImg={image}
      alt={alt}
      className={className}
      plugins={[responsive(), placeholder()]}
      style={{ width: width, height: height }}
    />
  );
};

export default CloudinaryImage;
