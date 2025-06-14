// CommonJS version of itemMatching for server-side use

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
const calculateMatchScore = (lostItem, foundItem) => {
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

module.exports = {
  calculateMatchScore,
  calculateStringSimilarity
}; 