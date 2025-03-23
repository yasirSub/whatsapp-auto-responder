const fs = require('fs');
const path = require('path');

// File paths
const configPath = path.join(__dirname, 'config.js');
const sessionDataPath = path.join(__dirname, '..', '.wwebjs_auth');

/**
 * Utility to update the configuration file
 * @param {Object} newConfig - The new configuration object
 */
function updateConfig(newConfig) {
  try {
    // Read the current config file
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Create new config content
    let newConfigContent = '// Configuration for WhatsApp Auto Responder\n\nmodule.exports = {\n';
    
    // Add each property
    Object.entries(newConfig).forEach(([key, value]) => {
      // Format based on the type of value
      if (typeof value === 'string') {
        // Handle string that might contain backticks
        if (value.includes('`')) {
          newConfigContent += `  ${key}: \`${value}\`,\n`;
        } else {
          newConfigContent += `  ${key}: '${value}',\n`;
        }
      } else if (Array.isArray(value)) {
        // Format array
        newConfigContent += `  ${key}: [${value.map(item => typeof item === 'string' ? `'${item}'` : item).join(', ')}],\n`;
      } else {
        // Other types (boolean, number)
        newConfigContent += `  ${key}: ${value},\n`;
      }
    });
    
    // Close the object
    newConfigContent += '};';
    
    // Write back to the file
    fs.writeFileSync(configPath, newConfigContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error updating config:', error);
    return false;
  }
}

/**
 * Clear session data to force new login
 */
function clearSession() {
  try {
    if (fs.existsSync(sessionDataPath)) {
      fs.rmSync(sessionDataPath, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing session:', error);
    return false;
  }
}

/**
 * Load the current configuration
 */
function loadConfig() {
  try {
    // Clear require cache to ensure we get the latest config
    delete require.cache[require.resolve('./config')];
    return require('./config');
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

// Function to extract topics from a conversation
function extractTopics(text) {
  const topics = [];
  const lowercaseText = text.toLowerCase();
  
  // Check for common topics
  if (lowercaseText.includes("work") || lowercaseText.includes("job") || lowercaseText.includes("office")) {
    topics.push("work");
  }
  if (lowercaseText.includes("study") || lowercaseText.includes("class") || lowercaseText.includes("college")) {
    topics.push("education");
  }
  if (lowercaseText.includes("movie") || lowercaseText.includes("film") || lowercaseText.includes("watch")) {
    topics.push("entertainment");
  }
  if (lowercaseText.includes("food") || lowercaseText.includes("eat") || lowercaseText.includes("restaurant")) {
    topics.push("food");
  }
  if (lowercaseText.includes("game") || lowercaseText.includes("play") || lowercaseText.includes("valorant")) {
    topics.push("gaming");
  }
  
  // Check for Valorant-specific topics
  if (lowercaseText.includes("jett") || lowercaseText.includes("raze") || 
      lowercaseText.includes("phoenix") || lowercaseText.includes("reyna")) {
    topics.push("valorant agents");
  }
  if (lowercaseText.includes("bind") || lowercaseText.includes("haven") || 
      lowercaseText.includes("split") || lowercaseText.includes("ascent")) {
    topics.push("valorant maps");
  }
  if (lowercaseText.includes("vandal") || lowercaseText.includes("phantom") || 
      lowercaseText.includes("operator") || lowercaseText.includes("sheriff")) {
    topics.push("valorant weapons");
  }
  if (lowercaseText.includes("rank") || lowercaseText.includes("competitive") || 
      lowercaseText.includes("radiant") || lowercaseText.includes("immortal")) {
    topics.push("ranked");
  }
  
  return topics;
}

// Simple sentiment analysis function
function analyzeSentiment(text) {
  const lowercaseText = text.toLowerCase();
  
  const positiveWords = ["happy", "good", "great", "love", "nice", "awesome", "wonderful", "thanks", "thank", "cool", "excited"];
  const negativeWords = ["sad", "bad", "terrible", "hate", "awful", "upset", "angry", "annoyed", "disappointed", "sorry"];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowercaseText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowercaseText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return "positive";
  else if (negativeCount > positiveCount) return "negative";
  else return "neutral";
}

// Function to get a random message from an array of templates
function getRandomMessage(templates) {
  if (!templates || templates.length === 0) {
    return "Hey, how are you?";
  }
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

// Export utility functions
module.exports = {
  getRandomMessage,
  updateConfig,
  clearSession,
  loadConfig,
  extractTopics,
  analyzeSentiment
}; 