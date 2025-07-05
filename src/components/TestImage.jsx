import React, { useState } from 'react';
import Image from './Image';
import { apiConfig } from '../config';

const TestImage = () => {
  const [testImage, setTestImage] = useState('1751726708112-keys.jpeg');
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Image Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          value={testImage} 
          onChange={(e) => setTestImage(e.target.value)} 
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Direct URL Test</h3>
        <img 
          src={`${apiConfig.baseUrl}/uploads/${testImage}`} 
          alt="Direct URL Test" 
          style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd' }}
        />
        <p>URL: {`${apiConfig.baseUrl}/uploads/${testImage}`}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Image Component Test</h3>
        <Image 
          src={testImage} 
          alt="Image Component Test" 
          style={{ width: '100%', height: '300px' }}
        />
      </div>
      
      <div>
        <h3>All Possible URL Formats</h3>
        <ul>
          <li>
            <strong>Just filename:</strong> {testImage}
            <Image 
              src={testImage} 
              alt="Just filename" 
              style={{ width: '100%', height: '100px', marginTop: '5px' }}
            />
          </li>
          <li>
            <strong>With uploads path:</strong> {`uploads/${testImage}`}
            <Image 
              src={`uploads/${testImage}`} 
              alt="With uploads path" 
              style={{ width: '100%', height: '100px', marginTop: '5px' }}
            />
          </li>
          <li>
            <strong>With slash path:</strong> {`/uploads/${testImage}`}
            <Image 
              src={`/uploads/${testImage}`} 
              alt="With slash path" 
              style={{ width: '100%', height: '100px', marginTop: '5px' }}
            />
          </li>
          <li>
            <strong>Full URL:</strong> {`${apiConfig.baseUrl}/uploads/${testImage}`}
            <Image 
              src={`${apiConfig.baseUrl}/uploads/${testImage}`} 
              alt="Full URL" 
              style={{ width: '100%', height: '100px', marginTop: '5px' }}
            />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TestImage; 