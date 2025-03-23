// Response Control Configuration for WhatsApp Auto Responder
// This file allows easy control over which chats to respond to and which to ignore

module.exports = {
  // Master control for all responses
  enableResponses: true,

  // Contacts that should never receive auto-responses
  blockedContacts: [
    '918918168558',  // Example: This contact will never receive auto-responses
    '1234567890',
    '919124089439',
  ],

  // Contacts that should always receive auto-responses (if empty, responds to all non-blocked contacts)
  allowedContacts: [
    // Only respond to these specific contacts
    '919279782054', // Baby
    
  ],

  
  // Chat type settings
  chatTypes: {
    // Control responses in personal (1-on-1) chats
    personal: {
      enabled: true,
      cooldownMinutes: 0,  // 0 = respond to every message, no cooldown
    },
    
    // Control responses in group chats
    groups: {
      enabled: false,  // Set to false to disable all group responses
      cooldownMinutes: 0,
      
      // Specific groups that should receive responses even if groups.enabled = false
      allowedGroups: [
        // Only respond in the Valorant group
        "Valorant 🎮",
      ],
      
      // Specific groups that should never receive responses even if groups.enabled = true
      blockedGroups: [
        // Add group names that should never receive responses
      ]
    }
  },

  // Block specific phrases or patterns (messages containing these won't get responses)
  blockedPhrases: [
    "don't reply",
    "no reply",
    // Add more phrases that should trigger ignoring the message
  ],

  // Contact types for different response styles (use in conjunction with src/config.js)
  contactTypes: {
    // Contacts that should receive romantic style responses
    romantic: [
      '',
    ],
    
    // Contacts that should receive explicit style responses
    explicit: [
      '',
    ],
    
    // Contacts that should receive professional/polite style responses
    professional: [
      // Add contact numbers that should get professional responses
    ],
    
    // Contacts that should receive casual friendly style responses
    casual: [
      // Add contact numbers that should get casual responses
    ]
  },

  // Advanced: Control response behavior for specific contacts
  contactSettings: {
    // Format: 'contactNumber': { customSetting1: value, customSetting2: value }
    '919279782054': {
      maxResponseLength: 40,  // Maximum characters for responses to this contact
      explicitLevel: 'extreme',  // Level of explicit content (mild, moderate, extreme)
      responseFrequency: 'every',  // 'every' = every message, 'reduced' = occasional
    },
    // '919124089439': {
      // maxResponseLength: 100,
      // explicitLevel: 'moderate',
      // responseFrequency: 'every',
    // }
  }
}; 