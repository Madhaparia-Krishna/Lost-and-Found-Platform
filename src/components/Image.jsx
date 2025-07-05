import React, { useState, useEffect } from 'react';
import { apiConfig } from '../config';

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
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Process the image URL to ensure it's valid
    let processedUrl = FALLBACK_IMAGE;

    if (src) {
      // Extract just the filename if it contains a path
      const filename = src.includes('/') ? src.split('/').pop() : src;
      
      console.log('Image filename:', filename);
      
      // Direct URL to the uploads directory
      processedUrl = `${apiConfig.baseUrl}/uploads/${filename}`;
      
      console.log('Direct image URL:', processedUrl);
    } else {
      console.log('No image source provided, using fallback');
    }

    setImageUrl(processedUrl);
    setError(false);
    setIsLoading(true);
  }, [src]);
  
  // Handle image load error
  const handleError = () => {
    console.error('Image failed to load:', {
      originalSrc: src,
      processedUrl: imageUrl
    });
    
    setError(true);
    setIsLoading(false);
    if (onError) onError();
  };
  
  // Handle successful image load
  const handleLoad = (e) => {
    console.log('Image loaded successfully:', {
      originalSrc: src,
      processedUrl: imageUrl,
      dimensions: `${e.target.naturalWidth}x${e.target.naturalHeight}`
    });
    setIsLoading(false);
    if (onLoad) onLoad(e);
  };
  
  return (
    <div className={`image-container ${className}`} style={{ position: 'relative', ...style }}>
      <img
        src={error ? FALLBACK_IMAGE : imageUrl}
        alt={alt}
        style={{ 
          objectFit: 'cover',
          borderRadius: '8px',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
          width: '100%',
          height: '100%',
          ...style 
        }}
        onError={handleError}
        onLoad={handleLoad}
        {...rest}
      />
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666'
        }}>
          Loading...
        </div>
      )}
    </div>
  );
};

export default Image; 