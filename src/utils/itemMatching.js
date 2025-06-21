import emailjs from '@emailjs/browser';
import emailService from './emailService';

// Calculate similarity score between two strings using Levenshtein distance
const calculateStringSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const matrix = Array(s1.length + 1).fill().map(() => 
    Array(s2.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (matrix[s1.length][s2.length] / maxLength);
};

// Calculate match score between lost and found items
export const calculateMatchScore = (lostItem, foundItem) => {
  let score = 0;
  let totalWeight = 0;

  // Category match (weight: 0.3)
  if (lostItem.category === foundItem.category) {
    score += 0.3;
  }
  totalWeight += 0.3;

  // Subcategory match (weight: 0.2)
  if (lostItem.subcategory && foundItem.subcategory && 
      lostItem.subcategory === foundItem.subcategory) {
    score += 0.2;
  }
  totalWeight += 0.2;

  // Location match (weight: 0.2)
  if (lostItem.location === foundItem.location) {
    score += 0.2;
  }
  totalWeight += 0.2;

  // Date proximity (weight: 0.1)
  const lostDate = new Date(lostItem.date);
  const foundDate = new Date(foundItem.date);
  const daysDiff = Math.abs((lostDate - foundDate) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) {
    score += 0.1 * (1 - daysDiff / 7);
  }
  totalWeight += 0.1;

  // Description similarity (weight: 0.2)
  const descriptionSimilarity = calculateStringSimilarity(
    lostItem.description,
    foundItem.description
  );
  score += 0.2 * descriptionSimilarity;
  totalWeight += 0.2;

  return score / totalWeight;
};

// Send match notification email using our email service
export const sendMatchNotification = async (userEmail, userName, item, matchId) => {
  try {
    const result = await emailService.sendMatchNotification(
      userEmail,
      userName,
      item.title,
      matchId,
      {
        category: item.category,
        date: item.date,
        description: item.description
      }
    );
    return result.success;
  } catch (error) {
    console.error('Error sending match notification:', error);
    return false;
  }
};

// Check for matches when a new item is submitted
export const checkForMatches = async (newItem, isFoundItem) => {
  try {
    const response = await fetch('http://localhost:5000/api/items/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item: newItem,
        isFoundItem
      })
    });

    if (!response.ok) {
      throw new Error('Failed to check for matches');
    }

    const { matches } = await response.json();
    return matches;
  } catch (error) {
    console.error('Error checking for matches:', error);
    return [];
  }
}; 

// Check for email matches when a new item is reported
export const checkEmailMatches = async (email, itemType) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error('Invalid email provided for matching');
    return { matches: [], matchCount: 0 };
  }
  
  try {
    console.log(`Checking for ${itemType} items with email: ${email}`);
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Make API request to find items with matching email
    const response = await fetch(`http://localhost:5000/api/items/email-matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        itemType: itemType === 'lost' ? 'found' : 'lost' // Look for opposite type
      })
    });

    if (!response.ok) {
      throw new Error('Failed to check for email matches');
    }

    const { matches } = await response.json();
    
    console.log(`Found ${matches.length} potential email matches`);
    return { 
      matches,
      matchCount: matches.length
    };
  } catch (error) {
    console.error('Error checking for email matches:', error);
    return { matches: [], matchCount: 0 };
  }
};

// Send email notification for potential matches
export const notifyEmailMatches = async (userEmail, userName, matches, itemType) => {
  try {
    if (!matches || matches.length === 0) {
      console.log('No matches to notify about');
      return { success: true, message: 'No matches to notify about' };
    }
    
    console.log(`Sending email notification for ${matches.length} potential matches`);
    
    // Format matches for email
    const matchesInfo = matches.map(match => ({
      title: match.title,
      category: match.category,
      location: match.location,
      date: new Date(match.date).toLocaleDateString(),
      id: match.id
    }));
    
    // Send email notification
    const result = await emailService.sendPotentialMatchesEmail(
      userEmail,
      userName,
      itemType,
      matchesInfo
    );
    
    return result;
  } catch (error) {
    console.error('Error sending email notification for matches:', error);
    return { success: false, message: error.message };
  }
};