// Configuration for WhatsApp Auto Responder

module.exports = {
  // Set to true to enable auto-responses, false to just log messages without responding
  enableAutoResponses: true,
  
  // Cooldown period in minutes before sending another auto-response to the same contact
  cooldownPeriodMinutes: 0,
  
  // List of phone numbers to auto-respond to (with country code, no + or spaces)
  // Leave empty to respond to all contacts
  allowedContacts: [],
  
  // List of phone numbers to never auto-respond to
  blockedContacts: [],
  
  // Set to true to auto-respond in group chats
  enableGroupResponses: true,
  
  // Set to true to enable away mode (only respond when away)
  awayModeOnly: false,
  
  // Custom system prompt for AI
  aiSystemPrompt: `You are an AI assistant responding on behalf of the owner of this WhatsApp account. 
                   Be helpful, concise, and natural in your responses.
                   Keep your responses relatively short, to the point, and respond ASAP.
                   Don't overthink responses - reply quickly and naturally.`,
  
  // AI response settings (Gemini-specific)
  // Available models: gemini-pro, gemini-pro-vision
  aiModel: 'gemini-pro',
  
  // Maximum output length
  aiMaxTokens: 100,
  
  // Temperature for generation (0.0-1.0, higher = more creative)
  aiTemperature: 0.4,
}; 