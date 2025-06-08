import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/api';

// Fallback image when loading fails
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='24' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

/**
 * Image component with fallback and proper URL handling
 * @param {Object} props
 * @param {string} props.src - Image source path
 * @param {string} props.alt - Alt text for the image
 * @param {Object} props.style - Additional styles for the image
 * @param {string} props.className - CSS class for the image
 * @param {Function} props.onLoad - Callback when image loads successfully
 * @param {Function} props.onError - Callback when image fails to load
 */
const Image = ({ 
  src, 
  alt = 'Image', 
  style = {},
  className = '',
  onLoad,
  onError,
  ...rest 
}) => {
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState(() => {
    // Process the image URL to ensure it's valid
    if (!src) return FALLBACK_IMAGE;
    
    if (src.startsWith('data:')) return src;
    
    if (src.startsWith('http')) return src;
    
    // If it's just a filename, add the full path
    if (!src.startsWith('/')) {
      return `${API_BASE_URL}/uploads/${src}`;
    }
    
    // If it already has /uploads in the path but is missing the base URL
    if (src.startsWith('/uploads/')) {
      return `${API_BASE_URL}${src}`;
    }
    
    return src;
  });
  
  // Handle image load error
  const handleError = () => {
    console.log('Image failed to load:', imageUrl);
    setError(true);
    if (onError) onError();
  };
  
  // Handle successful image load
  const handleLoad = (e) => {
    console.log('Image loaded successfully:', imageUrl);
    if (onLoad) onLoad(e);
  };
  
  return (
    <img
      src={error ? FALLBACK_IMAGE : imageUrl}
      alt={alt}
      style={{ 
        objectFit: 'cover',
        borderRadius: '8px',
        ...style 
      }}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      {...rest}
    />
  );
};

export default Image; 