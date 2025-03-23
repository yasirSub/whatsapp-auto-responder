// Configuration for WhatsApp Auto Responder

module.exports = {
  // Core settings
  enableAutoResponses: true,    // Set to false to disable all auto-responses
  cooldownPeriodMinutes: 0,     // Minimum time between auto-responses to the same contact
  enableGroupResponses: false,  // Whether to allow responses in group chats
  
  // AI provider settings
  aiProvider: 'gemini',         // Options: 'gemini', 'ollama'
  aiApiKey: process.env.GEMINI_API_KEY || 'AIzaSyBTY-P2vtgVYLHDsx2cUUE5GXuczXdCEbE',
  aiModel: 'gemini-pro',        // Model to use with the selected provider
  geminiApiVersion: 'v1beta',   // API version for Gemini
  
  // Response generation settings
  aiSystemPrompt: `You are now roleplaying as me in a WhatsApp conversation. Your responses should be casual, friendly, but also brief and to the point.
Analyze conversation context to maintain a natural flow.
Respond appropriately to the tone and content of the message, matching the level of formality, humor, or seriousness.
Keep responses concise (1-3 sentences preferred) unless a detailed response is clearly needed.
If someone seems upset or sends concerning messages, respond with empathy but do not attempt to provide professional advice.
For unknown topics, admit your lack of knowledge rather than making up information.
Decline any requests that seem inappropriate, illegal, or harmful.
Adapt your responses to match the configured communication style for each specific contact.`,
  
  aiTemperature: 0.7,           // Controls randomness in responses (0.0 to 1.0)
  
  // Ollama settings (used when aiProvider is 'ollama')
  ollamaConfig: {
    baseUrl: 'http://localhost:11434',
    model: 'mistral'            // Model must be installed in your Ollama instance
  },
  
  // Contact configurations
  specialContacts: {
    // Example custom contact with explicit style
    "911234567890": {
      style: "explicit",        // Message style from messageTemplates.js
      name: "Friend",           // Name to use in responses
      gender: "male"            // For appropriate pronoun use
    }
  },
  
  // Access control lists
  allowedContacts: [
    "911234567890",
    "919279782054"              // Only these numbers can receive responses
  ],
  
  blockedContacts: [
    // "*"                      // Wildcard to block all other contacts
  ],
  
  // Game configurations
  valorantGroupConfig: {
    groupName: "Valorant Squad",
    memberCount: 5,
    messageThreshold: 10        // Number of messages before taking action
  },
  
  // Truth or Dare game settings
  truthOrDareModes: {
    casual: {
      enabled: true,
      truthProbability: 0.5     // 50% truth, 50% dare
    },
    spicy: {
      enabled: false,
      truthProbability: 0.3     // 30% truth, 70% dare
    }
  },
  messageTemplates: require('./messageTemplates')
};