import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/TestMatchPage.css';

const TestMatchPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [matches, setMatches] = useState([]);
  const [testStats, setTestStats] = useState(null);
  const [emailResults, setEmailResults] = useState([]);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const consoleEndRef = useRef(null);

  const [formData, setFormData] = useState({
    status: 'lost',
    title: '',
    category: '',
    subcategory: '',
    location: '',
    description: '',
    sendEmail: false
  });

  // Sample templates for quick testing
  const sampleTemplates = {
    lost: [
      {
        name: 'Lost MacBook Pro',
        data: {
          status: 'lost',
          title: 'Lost MacBook Pro',
          category: 'Electronics',
          subcategory: 'Laptop',
          location: 'University Library',
          description: 'Silver MacBook Pro 13" with stickers on the back. Lost in the library around the study area.'
        }
      },
      {
        name: 'Lost Phone',
        data: {
          status: 'lost',
          title: 'Lost iPhone',
          category: 'Electronics',
          subcategory: 'Mobile Phone',
          location: 'Cafeteria',
          description: 'iPhone 13 in black case with a screen protector. Has my ID in the case.'
        }
      },
      {
        name: 'Lost Wallet',
        data: {
          status: 'lost',
          title: 'Lost Brown Wallet',
          category: 'Personal Item',
          subcategory: 'Wallet',
          location: 'Science Building',
          description: 'Brown leather wallet containing student ID, credit cards, and some cash.'
        }
      }
    ],
    found: [
      {
        name: 'Found Laptop',
        data: {
          status: 'found',
          title: 'Found Laptop Computer',
          category: 'Electronics',
          subcategory: 'Laptop',
          location: 'University Library',
          description: 'Silver Apple laptop found in the library study area. Has some stickers on the lid.'
        }
      },
      {
        name: 'Found Smartphone',
        data: {
          status: 'found',
          title: 'Found iPhone',
          category: 'Electronics',
          subcategory: 'Mobile Phone',
          location: 'Cafeteria',
          description: 'Black iPhone with case found on a table in the cafeteria. Screen is locked.'
        }
      },
      {
        name: 'Found Keys',
        data: {
          status: 'found',
          title: 'Found Key Ring',
          category: 'Personal Item',
          subcategory: 'Keys',
          location: 'Science Building',
          description: 'Set of keys on a red lanyard found in the science building lobby.'
        }
      }
    ]
  };

  // Log to console with timestamp
  const logToConsole = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now(),
      timestamp,
      message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
      type
    };
    
    setConsoleOutput(prev => [...prev, logEntry]);
    
    // Also log to browser console
    switch (type) {
      case 'error':
        console.error(`[${timestamp}] ${logEntry.message}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] ${logEntry.message}`);
        break;
      case 'success':
        console.log(`%c[${timestamp}] ${logEntry.message}`, 'color: green');
        break;
      default:
        console.log(`[${timestamp}] ${logEntry.message}`);
    }
  };

  // Scroll to bottom of console when new logs are added
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);
  
  // Clear console logs
  const clearConsole = () => {
    setConsoleOutput([]);
    logToConsole('Console cleared');
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Load template
  const loadTemplate = (templateIndex) => {
    const template = sampleTemplates[formData.status][templateIndex];
    if (template) {
      setFormData({
        ...template.data,
        sendEmail: formData.sendEmail
      });
      logToConsole(`Loaded template: ${template.name}`);
    }
  };

  // Submit form to test matching
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setMatches([]);
      setTestStats(null);
      setEmailResults([]);
      
      // Validate form
      if (!formData.title || !formData.location) {
        setError('Title and location are required fields');
        logToConsole('Validation error: Title and location are required fields', 'error');
        return;
      }
      
      // Log test parameters
      logToConsole('--- STARTING NEW TEST ---');
      logToConsole(`Testing ${formData.status} item: "${formData.title}"`);
      logToConsole(`Location: ${formData.location}`);
      logToConsole(`Category: ${formData.category}`);
      logToConsole(`Subcategory: ${formData.subcategory}`);
      logToConsole(`Description: ${formData.description}`);
      logToConsole(`Send emails: ${formData.sendEmail ? 'YES' : 'NO'}`);
      
      // Create test item
      const testItem = {
        status: formData.status,
        title: formData.title,
        category: formData.category,
        subcategory: formData.subcategory,
        location: formData.location,
        description: formData.description,
        date: new Date().toISOString().slice(0, 10),
        user_id: currentUser?.id || 1
      };
      
      // Set query parameter for email sending
      const sendMailParam = formData.sendEmail ? '?sendMail=true' : '';
      
      // Make API call to test endpoint
      logToConsole(`Sending request to /test-match${sendMailParam}`);
      const response = await axios.post(`/test-match${sendMailParam}`, { item: testItem });
      
      // Log successful response
      logToConsole('Response received from server', 'success');
      logToConsole(`${response.data.message}`);
      logToConsole(`Checked ${response.data.totalItemsChecked} ${response.data.testItem.status === 'lost' ? 'found' : 'lost'} items`);
      logToConsole(`Match threshold: ${response.data.threshold * 100}%`);
      
      // Set results in state
      setMatches(response.data.matches || []);
      setTestStats({
        totalChecked: response.data.totalItemsChecked,
        matchesFound: response.data.matches?.length || 0,
        threshold: response.data.threshold
      });
      
      // Log matches
      if (response.data.matches?.length > 0) {
        logToConsole(`Found ${response.data.matches.length} potential matches!`, 'success');
        response.data.matches.forEach((match, index) => {
          logToConsole(`Match #${index + 1}: "${match.title}" - Score: ${match.scorePercentage}`);
          
          // Log match details for debugging
          logToConsole(`[MATCH SCORE] Description: ${match.score.toFixed(2)}`);
        });
      } else {
        logToConsole('No matches found above threshold', 'warn');
      }
      
      // Handle email results if enabled
      if (formData.sendEmail && response.data.emailResults !== 'Email sending disabled') {
        setEmailResults(response.data.emailResults || []);
        
        if (response.data.emailResults?.length > 0) {
          logToConsole(`--- EMAIL RESULTS (${response.data.emailResults.length}) ---`);
          response.data.emailResults.forEach(result => {
            if (result.success) {
              logToConsole(`[EMAILJS SUCCESS] Sent to: ${result.to}`, 'success');
            } else {
              logToConsole(`[EMAILJS FAILED] Sent to: ${result.to} - Error: ${result.error || 'Unknown error'}`, 'error');
            }
          });
        }
      }
      
      setSuccess(true);
      logToConsole('Test completed successfully', 'success');
      
    } catch (error) {
      // Handle errors
      setError(error.response?.data?.message || error.message);
      logToConsole(`Error: ${error.response?.data?.message || error.message}`, 'error');
      
      // Log detailed error information if available
      if (error.response?.data?.error) {
        logToConsole(`Error details: ${error.response.data.error}`, 'error');
      }
      
      if (error.response?.data?.stack) {
        logToConsole(`Stack trace: ${error.response.data.stack}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-match-container">
      <div className="test-match-header">
        <h1>Match Testing Tool</h1>
        <p className="warning-text">
          This is a debugging tool for testing the auto-match functionality. 
          No changes will be made to the database.
        </p>
      </div>
      
      <div className="test-match-content">
        <div className="test-form-container">
          <h2>Test Item Details</h2>
          
          <form onSubmit={handleSubmit} className="test-form">
            <div className="form-group">
              <label htmlFor="status">Item Status:</label>
              <div className="status-toggle">
                <button 
                  type="button" 
                  className={`status-btn ${formData.status === 'lost' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, status: 'lost' }))}
                >
                  Lost Item
                </button>
                <button 
                  type="button" 
                  className={`status-btn ${formData.status === 'found' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, status: 'found' }))}
                >
                  Found Item
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="templates">Quick Templates:</label>
              <div className="templates-container">
                {sampleTemplates[formData.status].map((template, index) => (
                  <button 
                    key={index}
                    type="button"
                    className="template-btn"
                    onClick={() => loadTemplate(index)}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="title">Title:</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter item title"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category:</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Electronics, Clothing, etc."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subcategory">Subcategory:</label>
                <input
                  type="text"
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  placeholder="Laptop, Jacket, etc."
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="location">Location:</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Where item was lost/found"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed description of the item"
                rows="4"
              ></textarea>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="sendEmail"
                  checked={formData.sendEmail}
                  onChange={handleChange}
                />
                <span className="checkbox-text">Send Emails?</span>
                <span className="checkbox-description">
                  If checked, real emails will be sent for matches.
                </span>
              </label>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="test-btn" 
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Matching'}
              </button>
              <button 
                type="button" 
                className="clear-btn"
                onClick={() => {
                  setFormData({
                    status: formData.status,
                    title: '',
                    category: '',
                    subcategory: '',
                    location: '',
                    description: '',
                    sendEmail: formData.sendEmail
                  });
                }}
              >
                Clear Form
              </button>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </form>
        </div>
        
        <div className="test-results-container">
          <div className="results-header">
            <h2>Test Results</h2>
            {testStats && (
              <div className="test-stats">
                <span className="stat">
                  Checked: <strong>{testStats.totalChecked}</strong> items
                </span>
                <span className="stat">
                  Matches: <strong>{testStats.matchesFound}</strong>
                </span>
                <span className="stat">
                  Threshold: <strong>{testStats.threshold * 100}%</strong>
                </span>
              </div>
            )}
          </div>
          
          {matches.length > 0 ? (
            <div className="matches-table-container">
              <table className="matches-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Match Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(match => (
                    <tr key={match.id} className="match-row">
                      <td className="match-title">{match.title}</td>
                      <td>{match.category || 'N/A'}</td>
                      <td>{match.location}</td>
                      <td className="match-score">{match.scorePercentage}</td>
                      <td>
                        <Link to={`/items/${match.id}`} className="view-link" target="_blank">
                          View Item
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            success && (
              <div className="no-matches">
                <p>No matches found above the threshold ({testStats?.threshold * 100}%).</p>
              </div>
            )
          )}
          
          {/* Email Results Section */}
          {formData.sendEmail && emailResults.length > 0 && (
            <div className="email-results">
              <h3>Email Results</h3>
              <div className="email-results-list">
                {emailResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`email-result ${result.success ? 'success' : 'error'}`}
                  >
                    <div className="email-status">
                      {result.success ? '✓' : '✗'} Email to: {result.to}
                    </div>
                    <div className="email-details">
                      {result.success ? 'Successfully sent' : `Failed: ${result.error || 'Unknown error'}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Console Output */}
          <div className="console-container">
            <div className="console-header">
              <h3>Console Log</h3>
              <button className="clear-console-btn" onClick={clearConsole}>
                Clear Console
              </button>
            </div>
            <div className="console-output">
              {consoleOutput.map(log => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="log-timestamp">[{log.timestamp}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMatchPage; 