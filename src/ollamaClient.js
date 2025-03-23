// OllamaClient.js - Handles interactions with local Ollama LLM

const axios = require('axios');
const config = require('./config');

/**
 * Generate a response using Ollama API
 * @param {string} message - The user message
 * @param {Array} chatHistory - Array of previous messages
 * @param {string} systemPrompt - Optional system prompt for model context setting
 * @returns {Promise<string>} The generated response
 */
async function generateResponse(message, chatHistory = [], systemPrompt = null) {
  try {
    // Get Ollama configuration from config
    const baseUrl = config.ollamaConfig?.baseUrl || 'http://localhost:11434';
    const modelName = config.ollamaConfig?.model || 'mistral';
    const temperature = config.aiTemperature || 0.7;
    const maxTokens = config.aiMaxTokens || 80;
    
    console.log(`Using Ollama with model ${modelName} at ${baseUrl}`);
    
    // Format messages for Ollama API
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Convert chat history to Ollama format
    for (const msg of chatHistory) {
      messages.push({
        role: msg.fromMe ? 'assistant' : 'user',
        content: msg.message
      });
    }
    
    // Add the current user message
    messages.push({
      role: 'user',
      content: message
    });
    
    console.log(`Sending request to Ollama with ${messages.length} messages`);
    
    // Make API call to Ollama
    const response = await axios.post(`${baseUrl}/api/chat`, {
      model: modelName,
      messages,
      options: {
        temperature: temperature,
        num_predict: maxTokens
      },
      stream: false
    });
    
    // Handle empty response
    if (!response.data || !response.data.message) {
      console.error('Empty response from Ollama API');
      return "I'm sorry, I couldn't generate a response at the moment. Please try again later.";
    }
    
    const result = response.data.message.content;
    console.log(`Received response from Ollama API: ${result.substring(0, 50)}...`);
    
    return result;
  } catch (error) {
    console.error(`Error with Ollama API: ${error.message || error}`);
    
    // Return friendly error message
    if (error.message && error.message.includes('ECONNREFUSED')) {
      return "I can't connect to the local Ollama server. Please make sure it's running.";
    } else if (error.message && error.message.includes('not found')) {
      return "The requested model is not found in your Ollama installation. Try installing it first.";
    } else {
      return "I'm sorry, I encountered an error with the local LLM. Please try again later.";
    }
  }
}

/**
 * Legacy function for API compatibility
 * @deprecated Use generateResponse instead
 */
async function chatCompletion(messages, temperature, maxTokens) {
  console.warn('chatCompletion is deprecated, use generateResponse instead');
  return generateResponse(
    messages[messages.length - 1]?.content || '',
    messages,
    messages[0]?.content || ''
  );
}

module.exports = { generateResponse, chatCompletion }; 