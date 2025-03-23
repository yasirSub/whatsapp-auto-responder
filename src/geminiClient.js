// Gemini API client for response generation

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

/**
 * Generate a response using Gemini Pro API
 * @param {string} message - The user message
 * @param {Array} chatHistory - Array of previous messages
 * @param {string} systemPrompt - Optional system prompt for model context setting
 * @returns {Promise<string>} The generated response
 */
async function generateResponse(message, chatHistory = [], systemPrompt = null) {
  try {
    const apiKey = config.aiApiKey;
    const modelName = config.aiModel || 'gemini-pro';
    const temperature = config.aiTemperature || 0.7;
    const maxTokens = config.aiMaxTokens || 80;
    
    // Create the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the configured model
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: temperature,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: maxTokens,
      },
    });
    
    // Prepare chat context in text format for compatibility with v0.2.1
    let chatContext = "";
    
    // Add system prompt if provided
    if (systemPrompt) {
      chatContext += `System: ${systemPrompt}\n\n`;
    }
    
    // Add chat history
    for (const msg of chatHistory) {
      const role = msg.fromMe ? 'Assistant' : 'User';
      chatContext += `${role}: ${msg.message}\n`;
    }
    
    // Add the current message
    chatContext += `User: ${message}\n`;
    chatContext += `Assistant:`;
    
    console.log(`Sending request to Gemini API with ${chatHistory.length} messages in context`);
    
    // Generate content
    const result = await model.generateContent(chatContext);
    
    // Handle empty response
    if (!result || !result.response) {
      console.error('Empty response from Gemini API');
      return "I'm sorry, I couldn't generate a response at the moment. Please try again later.";
    }
    
    const responseText = result.response.text().trim();
    
    console.log(`Received response from Gemini API: ${responseText.substring(0, 50)}...`);
    
    return responseText;
  } catch (error) {
    console.error(`Error with Gemini API: ${error.message || error}`);
    
    // Return friendly error message
    if (error.message && error.message.includes('not found')) {
      return "I'm having trouble with my AI service. The model may be incorrect or not available.";
    } else if (error.message && error.message.includes('invalid api key')) {
      return "There's an issue with my configuration. Please contact the administrator about the API key.";
    } else {
      return "I'm sorry, I encountered an error while generating a response. Please try again later.";
    }
  }
}

module.exports = { generateResponse }; 