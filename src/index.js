const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import utility functions
const { 
  getRandomMessage,
  updateConfig,
  clearSession,
  loadConfig,
  extractTopics,
  analyzeSentiment
} = require('./utils');

// Import configuration
const config = require('./config');
const responseControl = require('./responseControl');

// Import Truth or Dare module
const truthOrDare = require('./truthOrDare');

// Import Ollama client for local LLM support
const ollamaClient = require('./ollamaClient');

// Import Gemini client for cloud LLM support
const geminiClient = require('./geminiClient');

// Import messageTemplates
const messageTemplates = require('./messageTemplates');

// Check if .env file exists, create if not
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, 'GEMINI_API_KEY=your_gemini_api_key_here\n');
  console.log('Created .env file. Please add your Gemini API key before running again.');
  process.exit(1);
}

// Gemini API client initialization is now handled by the geminiClient module

// Tracking last proactive message time for each special contact
const lastProactiveMessage = {};

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  }
});

// Event: When QR code is received
client.on('qr', (qr) => {
  console.log('QR Code received, scan it with WhatsApp mobile app:');
  qrcode.generate(qr, { small: true });
});

// Event: When client is ready
client.on('ready', () => {
  console.log('WhatsApp Auto Responder is ready!');
  console.log(`Auto-responses: ${config.enableAutoResponses ? 'Enabled' : 'Disabled'}`);
  console.log(`Cooldown period: ${config.cooldownPeriodMinutes} minutes`);
  console.log(`AI Provider: ${config.aiProvider}`);
  console.log(`AI Model: ${config.aiModel}`);
  
  if (config.enableProactiveMessaging && config.specialContacts) {
    startProactiveMessaging();
  }
});

// Event: When authentication fails
client.on('auth_failure', (msg) => {
  console.error('Authentication failed:', msg);
});

// Event: When disconnected
client.on('disconnected', (reason) => {
  console.log('WhatsApp disconnected:', reason);
});

// Function to start proactive messaging system
async function startProactiveMessaging() {
  console.log('Starting proactive messaging system...');
  
  // Initialize the last message time for special contacts
  Object.keys(config.specialContacts).forEach(number => {
    lastProactiveMessage[number] = Date.now() - (Math.random() * 30000); // Stagger initial messages
  });
  
  // Check for sending proactive messages frequently (every 30 seconds)
  setInterval(async () => {
    if (!config.enableProactiveMessaging) return;
    
    const now = Date.now();
    const frequencyMs = config.proactiveMessageFrequencyMinutes * 60 * 1000;
    
    // Check each special contact
    for (const number of Object.keys(config.specialContacts)) {
      // Skip if not enough time has passed since last message
      if (now - lastProactiveMessage[number] < frequencyMs) continue;
      
      try {
        // Get the contact and prepare to send message
        const contact = await client.getContactById(number + '@c.us');
        if (!contact) {
          console.log(`Special contact ${number} not found, skipping proactive message`);
          continue;
        }
        
        const chat = await contact.getChat();
        
        // Select appropriate template based on contact type
        let templates = config.proactiveMessageTemplates; // default
        const contactStyle = config.specialContacts[number].style;
        
        if (contactStyle === 'romantic' && config.romanticMessageTemplates) {
          templates = config.romanticMessageTemplates;
          console.log(`Using romantic templates for ${number}`);
        } else if (contactStyle === 'polite' && config.politeMessageTemplates) {
          templates = config.politeMessageTemplates;
          console.log(`Using polite templates for ${number}`);
        } else if (contactStyle === 'flirty' && config.flirtyMessageTemplates) {
          templates = config.flirtyMessageTemplates;
          console.log(`Using flirty templates for ${number}`);
        }
        
        // Select a random message from templates
        const randomMessage = templates[Math.floor(Math.random() * templates.length)];
        
        // Personalize the message if we have a name (but not for polite style)
        let personalizedMessage = randomMessage;
        if (config.specialContacts[number].name && contactStyle !== 'polite') {
          // 20% chance of using their name
          if (Math.random() < 0.2) {
            personalizedMessage = randomMessage.replace('you', config.specialContacts[number].name);
          }
        }
        
        // Send the message
        console.log(`Sending proactive message to ${number}: ${personalizedMessage}`);
        chat.sendStateTyping();
        
        // Small delay to simulate typing - but keep it shorter
        await new Promise(resolve => setTimeout(resolve, Math.min(personalizedMessage.length * 15, 1500)));
        
        // Send the message
        await chat.sendMessage(personalizedMessage);
        
        // Update the last message time
        lastProactiveMessage[number] = now;
        
      } catch (error) {
        console.error(`Error sending proactive message to ${number}:`, error.message);
      }
    }
  }, 30 * 1000); // Check every 30 seconds
}

// Add cross-contact relay definitions
const relayMapping = {
  // Disabled the relay mapping for 918918168558 as requested
  // '918918168558': '919279782054', // Messages from 89181 68558 will be relayed to 92797 82054
  // '919279782054': '918918168558'  // Messages from 92797 82054 will be relayed back to 89181 68558
};

// Event: When a message is received
client.on('message', async (message) => {
  try {
    // Always ignore messages from self to prevent loops
    if (message.fromMe) {
      return;
    }
    
    // Set up basic message info
    const chat = await message.getChat();
    const contactNumber = message.from.split('@')[0];
    const contact = await message.getContact();
    
    // Check if the message is from a group and block all groups
    if (chat.isGroup) {
      console.log(`Message received from group ${chat.name}. All groups are blocked.`);
      return; // Exit immediately for any group message
    }
    
    // Check if contact is in the allowed list, block all others
    if (config.allowedContacts && config.allowedContacts.length > 0) {
      if (!config.allowedContacts.includes(contactNumber)) {
        console.log(`Message received from ${contactNumber}, but not in allowed list. Ignoring.`);
        return;
      }
    }
    
    // Check if contact is in the blocked list
    if (config.blockedContacts && config.blockedContacts.includes(contactNumber)) {
      console.log(`Message received from blocked contact ${contactNumber}. Ignoring.`);
      return;
    }
    
    // Check if wildcard block is enabled
    if (config.blockedContacts && config.blockedContacts.includes("*") && 
        !(config.allowedContacts && config.allowedContacts.includes(contactNumber))) {
      console.log(`Message received from ${contactNumber}, blocked by wildcard. Ignoring.`);
      return;
    }
    
    // Master control - if responses are disabled, just log the message
    if (!responseControl.enableResponses) {
      console.log('All auto-responses are disabled in responseControl.js. Message logged only.');
      return;
    }
    
    // Check if the message contains any blocked phrases
    if (responseControl.blockedPhrases && responseControl.blockedPhrases.some(phrase => 
      message.body.toLowerCase().includes(phrase.toLowerCase()))) {
      console.log(`Message contains a blocked phrase. Ignoring.`);
      return;
    }
    
    // Check for Truth or Dare game interaction using our new module
    const gameResponse = truthOrDare.handleTruthOrDare(message.body, contactNumber);
    if (gameResponse.isGameResponse) {
      console.log(`Truth or Dare game interaction detected: "${message.body}"`);
      
      // Send typing indicator to make it look natural
      chat.sendStateTyping();
      
      // Small delay to simulate typing
      const typingDelay = Math.min(1000, gameResponse.message.length * 10);
      await new Promise(resolve => setTimeout(resolve, typingDelay));
      
      // Send the response
      await chat.sendMessage(gameResponse.message);
      console.log(`Truth or Dare response sent to ${contactNumber}`);
      return; // Skip normal AI processing
    }
    
    // If user is in a truth or dare game, we don't want to generate AI responses
    if (truthOrDare.isInGame(contactNumber)) {
      return; // Don't process further if they're in a game
    }
    
    // Check if this is a relay contact - handle before other checks
    if (relayMapping && contactNumber in relayMapping) {
      const targetNumber = relayMapping[contactNumber];
      console.log(`Relay detected: Forwarding message from ${contactNumber} to ${targetNumber}`);
      
      try {
        // Get the target contact and chat
        const targetContact = await client.getContactById(targetNumber + '@c.us');
        if (!targetContact) {
          console.log(`Target contact ${targetNumber} not found, cannot relay message`);
          return;
        }
        
        const targetChat = await targetContact.getChat();
        
        // Get contact name for better identification (fallback to number if no name)
        const contactName = contact.name || contact.pushname || contactNumber;
        
        // Send typing indicator to make it look natural
        targetChat.sendStateTyping();
        
        // Small delay to simulate typing
        const typingDelay = Math.min(700, message.body.length * 12);
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        // Forward the message with the contact's name as prefix
        await targetChat.sendMessage(`${message.body}`);
        console.log(`Message relayed successfully to ${targetNumber}`);
        
        // Send acknowledgment back to sender with delivery status
        chat.sendMessage("Message delivered ✓");
        
        return; // Skip normal processing
      } catch (error) {
        console.error(`Error relaying message to ${relayMapping[contactNumber]}:`, error.message);
        
        // Notify sender of failure
        chat.sendMessage("Sorry, couldn't deliver your message at this time.");
        return;
      }
    }
    
    // Check if this is a Valorant gaming group using our dedicated function
    const isValorantGameGroup = isValorantGroup(chat);
    let senderName = contact.pushname || contact.name || contactNumber;
    
    if (chat.isGroup) {
      console.log(`Received message in group: "${chat.name}" from ${senderName}`);
      
      // Check if group responses are enabled
      if (!responseControl.chatTypes.groups.enabled) {
        // Check if this specific group is in the allowed list
        if (!responseControl.chatTypes.groups.allowedGroups.includes(chat.name)) {
          console.log(`Message received in group ${chat.name}, but group responses are disabled. Ignoring.`);
          return;
        } else {
          console.log(`Group "${chat.name}" is in allowed groups list. Proceeding.`);
        }
      } else {
        // Check if this specific group is in the blocked list
        if (responseControl.chatTypes.groups.blockedGroups.includes(chat.name)) {
          console.log(`Group "${chat.name}" is in blocked groups list. Ignoring.`);
          return;
        }
      }
      
      // Special handling for Valorant groups - always respond to these
      if (isValorantGameGroup) {
        console.log(`🎮 Processing message in Valorant group "${chat.name}"`);
      }
    } else {
      // Check if personal chats are enabled
      if (!responseControl.chatTypes.personal.enabled) {
        console.log('Personal chat responses are disabled. Ignoring.');
        return;
      }
    }
    
    // Check if this contact is blocked
    if (responseControl.blockedContacts && responseControl.blockedContacts.includes(contactNumber)) {
      console.log(`Message received from blocked contact ${contactNumber}. Ignoring.`);
      return;
    }
    
    // Check if this contact is allowed for auto-responses
    if (responseControl.allowedContacts && responseControl.allowedContacts.length > 0 && !responseControl.allowedContacts.includes(contactNumber)) {
      console.log(`Message received from ${contactNumber}, but not in allowed list. Ignoring.`);
      return;
    }
    
    // Check contact-specific response frequency
    if (responseControl.contactSettings && 
        contactNumber in responseControl.contactSettings && 
        responseControl.contactSettings[contactNumber].responseFrequency === 'reduced') {
      // Only respond 30% of the time for this contact
      if (Math.random() > 0.3) {
        console.log(`Reduced response frequency for ${contactNumber}. Skipping this message.`);
        return;
      }
    }
    
    // Log the message
    console.log(`Message received from ${contactNumber}${chat.isGroup ? ' (' + senderName + ')' : ''}: ${message.body}`);
    console.log(`Processing message. Cooldown: ${chat.isGroup ? responseControl.chatTypes.groups.cooldownMinutes : responseControl.chatTypes.personal.cooldownMinutes} minutes`);
    
    // If auto-responses are disabled, just log the message
    if (!config.enableAutoResponses) {
      console.log('Auto-responses are disabled. Message logged only.');
      return;
    }
    
    // Reset proactive messaging timer for this contact if they are special
    if (config.specialContacts && contactNumber in config.specialContacts) {
      lastProactiveMessage[contactNumber] = Date.now();
    }
    
    // Get full chat history for context - improved version
    let chatHistory = [];
    let lastMessageSender = null;
    
    try {
      let messagesToFetch = 20; // Fetch more messages for better context
      
      if (chat.isGroup) {
        // For group chats, retrieve more context for better conversation flow
        const messages = await chat.fetchMessages({ limit: messagesToFetch });
        
        // For Valorant groups, we want to include more group context
        if (isValorantGameGroup) {
          // Get last 15 messages regardless of sender for better group context
          chatHistory = messages
            .filter(msg => msg.body && msg.body.trim() !== '')  // Only include text messages
            .slice(0, 15)  // Use up to 15 messages
            .map(msg => {
              // Include author names for better context
              const author = msg.fromMe ? 'ME' : (msg._data.notifyName || 'Someone');
              
              // Save the last message sender (not from me) for tagging
              if (!msg.fromMe && msg.author === message.author) {
                lastMessageSender = author;
              }
              
              return `${author}: ${msg.body}`;
            })
            .reverse();
        } else {
          // First filter just messages from this user and direct responses
          let relevantMessages = [];
          let lastFromUser = false;
          
          messages.forEach(msg => {
            const isFromCurrentUser = msg.author === message.author;
            
            if (isFromCurrentUser) {
              // Save the sender name for tagging
              if (!msg.fromMe) {
                lastMessageSender = msg._data.notifyName || 'Someone';
              }
              
              relevantMessages.push(msg);
              lastFromUser = true;
            } else if (lastFromUser && msg.fromMe) {
              // This is a response to the user
              relevantMessages.push(msg);
              lastFromUser = false;
            }
          });
          
          // Get the messages in reverse chronological order (oldest first)
          chatHistory = relevantMessages
            .slice(0, 15)  // Use up to 15 messages
            .map(msg => msg.body)
            .reverse();
        }
      } else {
        // For individual chats, consider all messages between user and assistant
        const messages = await chat.fetchMessages({ limit: messagesToFetch });
        
        // Convert to chat history format - exclude media messages, system messages etc.
        chatHistory = messages
          .filter(msg => msg.body && msg.body.trim() !== '')  // Only include text messages
          .slice(0, 15)  // Use up to 15 messages
          .map(msg => msg.body)
          .reverse();
      }
      
      console.log(`Retrieved ${chatHistory.length} messages for context`);
      
      // Log the first and last message for debugging
      if (chatHistory.length > 0) {
        console.log(`Oldest message: ${chatHistory[0].substring(0, 30)}...`);
        console.log(`Newest message: ${chatHistory[chatHistory.length - 1].substring(0, 30)}...`);
      }
      
    } catch (error) {
      console.log('Error getting chat history, continuing without context:', error.message);
    }
    
    // Generate response using AI
    console.log('Generating AI response...');
    const aiResponse = await generateAIResponse(message.body, chatHistory, contactNumber, isValorantGameGroup, chat.name, chat.isGroup, lastMessageSender);
    
    // Check if we need to enforce a maximum response length for this contact
    let finalResponse = aiResponse;
    if (responseControl.contactSettings && 
        contactNumber in responseControl.contactSettings && 
        responseControl.contactSettings[contactNumber].maxResponseLength) {
      const maxLength = responseControl.contactSettings[contactNumber].maxResponseLength;
      if (finalResponse.length > maxLength) {
        // Try to find a natural break point
        const sentenceBreaks = [...finalResponse.matchAll(/[.!?]\s+/g)];
        let truncated = false;
        
        if (sentenceBreaks.length > 0) {
          // Find the last sentence break before the max length
          const suitableBreak = sentenceBreaks
            .filter(match => match.index < maxLength)
            .pop();
          
          if (suitableBreak) {
            finalResponse = finalResponse.substring(0, suitableBreak.index + 2);
            truncated = true;
          }
        }
        
        // If no suitable break found or still too long, just truncate
        if (!truncated || finalResponse.length > maxLength) {
          finalResponse = finalResponse.substring(0, maxLength);
          // Make sure it ends with proper punctuation
          if (!/[.!?]$/.test(finalResponse)) {
            finalResponse += '.';
          }
        }
        
        console.log(`Response truncated to ${finalResponse.length} characters (max: ${maxLength})`);
      }
    }
    
    // Typing indicator for a more natural experience
    chat.sendStateTyping();
    console.log('Sending typing indicator...');
    
    // More dynamic typing delay based on response length and complexity
    const baseDelay = 500; // Base delay in ms
    const charDelay = 10; // Delay per character
    
    // Calculate typing delay (longer for longer messages, but with a max cap)
    const typingDelay = Math.min(Math.max(baseDelay, finalResponse.length * charDelay), 3000);
    console.log(`Waiting ${typingDelay}ms to simulate typing...`);
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    // Send the AI-generated response
    chat.sendMessage(finalResponse);
    console.log(`AI response sent to ${contactNumber}: ${finalResponse}`);
    
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// At the top with other global variables
const ENFORCE_FEMALE_CONTACT_SAFETY = false; // Global safety flag
const EMERGENCY_SAFE_MODE = false; // Global emergency feature switch

// Function to generate AI response using Gemini or Ollama
async function generateAIResponse(message, chatHistory, contactNumber, isValorantGroup = false, groupName = "", isGroup = false, lastMessageSender = null) {
  try {
    let possibleResponses = [];
    let formattedMessage = ""; // Define formattedMessage variable
    
    // Check if this is a female contact that needs extra protection
    const isFemaleContact = config.specialContacts && 
                           contactNumber in config.specialContacts && 
                           config.specialContacts[contactNumber].gender === 'female';
                           
    // Get 15 messages for context
    console.log(`Generating AI response...`);
    console.log(`Preparing prompt with ${chatHistory.length} messages of context`);
    
    // Format chat history for better context understanding
    let chatContext = "Previous messages (ordered from oldest to newest):\n";
    
    if (chatHistory.length > 0) {
      // Process the history to label messages as user or you (the owner)
      chatHistory.forEach((msg, index) => {
        // For Valorant group, the messages already have author prefixes
        if (isValorantGroup) {
          chatContext += msg + "\n";
        } else {
          // Check if this is the last message (most recent) - it should always be from the user
          const isUserMessage = (index === chatHistory.length - 1) || (index % 2 === 0);
          const prefix = isUserMessage ? "THEM: " : "YOU: ";
          chatContext += prefix + msg + "\n";
        }
      });
    }
    
    // Extract topics from conversation history
    const topics = extractTopics(chatHistory.join(' ') + ' ' + message);
    
    // Analyze sentiment of the message
    const sentiment = analyzeSentiment(message);

    // Analyze language style from previous messages (to better match Hinglish style)
    const languageStyle = analyzeLanguageStyle(chatHistory);

    // Track conversation state to avoid repetition
    const recentMessages = chatHistory.slice(-6);
    const lastUserMessages = recentMessages.filter((_, index) => index % 2 === 0).slice(-3);
    const lastBotMessages = recentMessages.filter((_, index) => index % 2 === 1).slice(-3);
    
    // Check for repetitive patterns
    const repetitivePattern = checkRepetitivePatterns(lastUserMessages, lastBotMessages);
    
    // Check if this is a special contact with custom prompt or Valorant group
    let systemPrompt = config.aiSystemPrompt;
    let contactName = contactNumber;
    let extraContext = "";
    let temperature = config.aiTemperature;
    let maxTokens = config.aiMaxTokens;
    let emojiAllowed = false; // By default, no emojis allowed
    
    if (isValorantGroup && config.valorantGroupConfig && config.valorantGroupConfig.enabled) {
      // Use Valorant group settings
      systemPrompt = config.valorantGroupConfig.customPrompt;
      temperature = config.valorantGroupConfig.aiTemperature || 0.7;
      maxTokens = config.valorantGroupConfig.maxTokens || 100;
      emojiAllowed = true; // Allow very occasional emojis in gaming groups
      
      extraContext = `This is a Valorant gaming group chat named "${groupName}".
The conversation is about Valorant - a tactical FPS game.
Reference Valorant specific game elements when appropriate: agents, maps, weapons, tactics.
If anyone mentions a specific agent or map, acknowledge it and show your knowledge about it.
If they're discussing strategies, provide relevant tips without being condescending.
Keep your messages casual and gaming-focused, with very occasional gaming emojis if appropriate.
Use primarily Hinglish (Roman Hindi mixed with English) for an authentic Indian gaming chat feel.
Language style from previous messages: ${languageStyle}

IMPORTANT: Since this is a group chat, you should tag the person you're replying to by using @TheirName at the beginning of your response when appropriate, unless you're responding to the entire group.
You should try to figure out who you're replying to based on the conversation context.`;
      
      console.log(`Using Valorant group prompt for group: ${groupName}`);
    }
    else if (config.specialContacts && contactNumber in config.specialContacts) {
      const specialContact = config.specialContacts[contactNumber];
      console.log(`Using custom settings for special contact ${contactNumber}`);
      
      // Use the safe template selection function to get appropriate templates
      possibleResponses = getSafeMessageTemplate(contactNumber, specialContact.style);
      
      // Special contacts may have custom names
      if (specialContact.name) {
        formattedMessage = `${formattedMessage}\n\n- ${specialContact.name}`;
      }
      
      if (specialContact.style === 'romantic') {
        extraContext = `
This is a romantic conversation with someone you care deeply about.
Be affectionate and caring in your responses.
Use primarily Hinglish (Roman Hindi mixed with English) for more authentic and natural texting.
Language style from previous messages: ${languageStyle}
IMPORTANT: 
- NEVER use the term 'jaan' as they do not like that term
- DO NOT ask the same questions repeatedly
- DO NOT use too many emojis
- Keep responses very short (1-2 sentences max)
- Continue the conversation naturally from previous messages
- If you notice you asked about something before, don't ask again
- Always follow their lead in conversation topics`;
        emojiAllowed = false;
        maxTokens = 50; // Shorter responses for romantic conversations
        temperature = 0.7; // More natural for romantic conversations
      } else if (specialContact.style === 'flirty') {
        // Extract sexual keywords to understand conversation context
        const sexualKeywords = [
          'sex', 'sexy', 'nipple', 'hot', 'fuck', 'suck', 'lick', 'kiss', 'dirty', 
          'wet', 'hard', 'horny', 'cum', 'chest', 'bra', 'panty', 'body', 'touch'
        ];
        
        // Check if conversation has sexual content
        const hasExplicitContent = 
          sexualKeywords.some(keyword => 
            message.toLowerCase().includes(keyword) || 
            lastUserMessages.some(msg => msg.toLowerCase().includes(keyword))
          );
            
        extraContext = `
This is a flirty/sexual conversation with your female romantic partner.
You are MALE talking to a FEMALE.
Be suggestive, passionate, and engaging in your responses as a heterosexual male.
Use primarily Hinglish (Roman Hindi mixed with English) for more authentic and intimate texting.
Language style from previous messages: ${languageStyle}
Current conversation tone: ${hasExplicitContent ? 'Explicitly sexual' : 'Flirtatious'}.

IMPORTANT: 
- Always respond as a MALE to a FEMALE partner
- When responding to sexual content, use male perspective 
- DO NOT ask the same questions repeatedly
- DO NOT use any emojis at all
- Keep responses very short (1-2 sentences max)
- Continue the conversation naturally from previous messages
- Match her level of explicitness - be direct when she is
- If she initiates sexual talk, respond enthusiastically as a male
- Always follow her lead in conversation topics`;
        emojiAllowed = false;
        maxTokens = 60; // Slightly longer for flirty conversations
        temperature = 0.8; // Higher temperature for more variety in risqué responses
      } else if (specialContact.style === 'explicit') {
        // For explicitly sexual conversations
        // Extract sexual keywords to understand conversation content better
        const sexualKeywords = [
          'sex', 'sexy', 'nipple', 'hot', 'fuck', 'suck', 'lick', 'kiss', 'dirty', 
          'wet', 'hard', 'horny', 'cum', 'chest', 'bra', 'panty', 'body', 'touch',
          'naked', 'nude', 'underwear', 'clothes', 'boobs', 'cock', 'dick', 'pussy', 
          'cum', 'masturbate', 'tongue', 'taste', 'eat', 'bite', 'spank', 'choke', 
          'juicy', 'inside', 'finger', 'squirt'
        ];
        
        // Check for various body parts mentioned
        const bodyParts = {
          breasts: /boob|breast|chuchi|tits|nipple/i,
          genitals: /pussy|chut|vagina|dick|cock|lund|penis/i,
          butt: /ass|butt|gaand/i,
          lips: /lips|mouth|honth/i,
          general: /body|skin|jism/i
        };
        
        // Check if conversation has sexual content
        const hasExplicitContent = 
          sexualKeywords.some(keyword => 
            message.toLowerCase().includes(keyword) || 
            lastUserMessages.some(msg => msg.toLowerCase().includes(keyword))
          );
        
        // Check which body parts are mentioned to personalize response
        const mentionedBodyParts = Object.entries(bodyParts).filter(([part, regex]) => 
          regex.test(message) || lastUserMessages.some(msg => regex.test(msg))
        ).map(([part]) => part);
        
        // Determine if the message is about what she's doing or what she wants
        const isTellingWhatShesWearing = /wear|pehen|kapde|shirt|dress|cloth/i.test(message);
        const isTellingWhatShesDoing = /touch|wet|hard|horny|masturbat|finger/i.test(message);
        const isAskingToDoSomething = /want|come|help|touch|lick|fuck|suck/i.test(message);
        
        // For contact 919279782054, provide more direct, engaging prompt
        if (contactNumber === '919279782054') {
          // Check if we should ask a direct question - every 2-3 messages
          const shouldAskQuestion = Math.random() < 0.40; // 40% chance
          
          // List of direct questions to ask
          const directQuestions = [
            "Are u horny?",
            "Kya pehen rakha hai?",
            "Apne nipples touch karo?",
            "Ab kya karogi?",
            "Tumhari pic bhejo na",
            "Video call kare?",
            "Tumhara man kya kar raha hai?",
            "Geeli ho gai?",
            "Mera lund muh me logi?"
          ];
          
          // Select a random question
          const randomQuestion = directQuestions[Math.floor(Math.random() * directQuestions.length)];
          
          extraContext = `
This is an EXTREMELY EXPLICIT sexual conversation with a female partner.
You are MALE talking to a FEMALE.
${shouldAskQuestion ? `JUST ASK THIS DIRECT SEXUAL QUESTION: "${randomQuestion}"` : 'Be extremely direct, explicit, and sexual in your responses.'}
Use raw Hindi sexual words liberally (chut, lund, etc).
NEVER write more than 5-7 words total.

CONTEXT: 
${mentionedBodyParts.length > 0 ? `- She mentioned her ${mentionedBodyParts.join(', ')}` : ''}
${isTellingWhatShesWearing ? '- She is telling you what she is wearing' : ''}
${isTellingWhatShesDoing ? '- She is telling you what she is doing sexually' : ''}
${isAskingToDoSomething ? '- She is asking you to do something sexual' : ''}

IMPORTANT:
- RESPOND EXTREMELY SHORT (5-7 words maximum)
- Only raw sexual messages for this contact
- Be EXTRA explicit and direct
- NEVER use emojis
- If she's not being explicit, be more direct and explicit
- If she's not responding to sexual content, be even more direct
- NEVER say anything that isn't explicitly sexual`;

          emojiAllowed = false;
          maxTokens = 40; // Even shorter for explicit conversations
          temperature = 0.9; // Very high temperature for more unpredictable responses
        } else {
          extraContext = `
This is an EXTREMELY EXPLICIT sexual conversation with a female partner.
You are MALE talking to a FEMALE.
Be extremely direct, explicit, and sexual in your responses.
Use sexually explicit Hinglish phrases liberally.
NEVER write more than one short sentence.

CONTEXT: 
${mentionedBodyParts.length > 0 ? `- She mentioned her ${mentionedBodyParts.join(', ')}` : ''}
${isTellingWhatShesWearing ? '- She is telling you what she is wearing' : ''}
${isTellingWhatShesDoing ? '- She is telling you what she is doing sexually' : ''}
${isAskingToDoSomething ? '- She is asking you to do something sexual' : ''}

IMPORTANT:
- Always respond as a MALE to a FEMALE partner
- ALWAYS assume sexual context
- Keep responses EXTREMELY short (5-10 words MAXIMUM)
- NEVER use emojis
- NEVER ask the same questions repeatedly
- If she mentions body parts, express desire for them
- If she tells you what she's doing, tell her what you'd do in response
- If she asks for something, respond enthusiastically agreeing
- Your goal is to create intense sexual tension with minimal words`;

          emojiAllowed = false;
          maxTokens = 30; // Even shorter for explicit conversations
          temperature = 0.95; // Very high temperature for more unpredictable responses
        }
      } else if (specialContact.style === 'casual') {
        extraContext = `
This is a casual conversation with a friend.
Keep it light, friendly, and conversational.
Use primarily Hinglish (Roman Hindi mixed with English) with casual phrases.
Language style from previous messages: ${languageStyle}
IMPORTANT:
- Keep responses very short (1-2 sentences max)
- DO NOT use any emojis at all
- Continue the conversation naturally without repeating yourself
- Remember what they've already told you`;
        emojiAllowed = false;
        maxTokens = 50; // Shorter responses for casual conversations
      } else if (specialContact.style === 'polite') {
        extraContext = `
This is a professional contact that requires polite and respectful communication.
Use a mix of Hindi and English that sounds formal but natural.
Language style from previous messages: ${languageStyle}
IMPORTANT:
- Keep responses very brief and concise
- Avoid pet names, emojis, and overly casual language
- Be professional but friendly`;
        emojiAllowed = false;
        maxTokens = 50; // Shorter responses for professional contacts
      }
    }
    
    // Add context about repetitive patterns if detected
    if (repetitivePattern) {
      extraContext += `\nIMPORTANT: I notice I've been ${repetitivePattern}. Change approach and do not repeat this pattern.`;
    }
    
    // Create the full prompt with system instructions and context
    let fullPrompt;
    
    if (isValorantGroup) {
      fullPrompt = `${systemPrompt}
This is in a group chat named: "${groupName}".
${extraContext}

Current conversation topics: ${topics.length > 0 ? topics.join(", ") : "general Valorant discussion"}
Current sentiment: ${sentiment}

${chatContext}

Latest message: ${message}
Latest message sender: ${lastMessageSender}

Your response (keep it brief, casual, and gaming appropriate, using primarily Hinglish with gaming terms):`;
    } else if (isGroup) {
      // Add group chat context for non-Valorant groups
      fullPrompt = `${systemPrompt}
This is in a group chat named: "${groupName}".
Since this is a group chat, you should tag the person you're replying to by using @TheirName at the beginning of your response when appropriate.
Keep your responses brief and to the point.
Use primarily Hinglish (Roman Hindi mixed with English) that sounds natural.
Language style from previous messages: ${languageStyle}
DO NOT use emojis in your responses.

Current conversation topics: ${topics.length > 0 ? topics.join(", ") : "general conversation"}
Current sentiment: ${sentiment}

${chatContext}

Latest message: ${message}
Latest message sender: ${lastMessageSender}

Your response:`;
    } else {
      fullPrompt = `${systemPrompt}
This conversation is with contact: ${contactName}.
${extraContext}

Current conversation topics: ${topics.length > 0 ? topics.join(", ") : "general conversation"}
Current sentiment: ${sentiment}

${chatContext}

Their latest message: ${message}

Your response (MUST be very short, 1-2 sentences max, using primarily Hinglish that flows naturally):`;
    }

    console.log('Preparing to generate response...');
    
    let responseText;
    
    // Choose between Ollama and Gemini based on configuration
    if (config.aiProvider === 'ollama') {
      console.log('Using local Ollama LLM for response generation');
      try {
        // Convert to Ollama format
        const messages = [
          { role: 'system', content: systemPrompt + '\n' + extraContext },
          ...recentMessages.map((msg, index) => ({
            role: index % 2 === 0 ? 'user' : 'assistant',
            content: msg
          })),
          { role: 'user', content: message }
        ];
        
        // Call Ollama API
        responseText = await ollamaClient.generateResponse(
          message, 
          messages,
          systemPrompt + '\n' + extraContext
        );
      } catch (error) {
        console.error('Error with Ollama LLM, falling back to Gemini:', error.message);
        // Fall back to Gemini
        responseText = await geminiClient.generateResponse(
          message,
          recentMessages.map((msg, i) => ({
            fromMe: i % 2 !== 0,
            message: msg
          })),
          systemPrompt + '\n' + extraContext
        );
      }
    } else {
      // Use Gemini (default)
      console.log('Using Gemini API for response generation');
      
      try {
        // Use our Gemini client module instead of direct API calls
        responseText = await geminiClient.generateResponse(
          message,
          recentMessages.map((msg, i) => ({
            fromMe: i % 2 !== 0,
            message: msg
          })),
          systemPrompt + '\n' + extraContext
        );
      } catch (error) {
        console.error('Error with Gemini API:', error.message);
        
        // If error is rate limit, return a specific message
        if (error.message.includes('429')) {
          return "Sorry, reached message limit. Try again in a few minutes.";
        } else {
          // For other errors, return a generic message
          return "Sorry, having trouble responding. Try again soon.";
        }
      }
    }
    
    console.log('Successfully received response');
    
    // Special case for romantic contact: Filter out "jaan" from responses
    if (config.specialContacts && contactNumber in config.specialContacts && 
        (config.specialContacts[contactNumber].style === 'romantic' || config.specialContacts[contactNumber].style === 'flirty')) {
      
      // Replace jaan with alternative terms
      responseText = responseText.replace(/jaan/gi, "baby").replace(/\bjaan\b/gi, "baby");
      
      // Replace sweetheart with alternative terms or nothing to avoid overuse
      // Check if "sweetheart" appears in the response
      if (responseText.toLowerCase().includes("sweetheart")) {
        // Count occurrences to decide what to do
        const sweetheartCount = (responseText.match(/sweetheart/gi) || []).length;
        
        if (sweetheartCount > 0) {
          // Replace with empty string most of the time to avoid overuse
          responseText = responseText.replace(/sweetheart/gi, "");
          
          // Remove any double spaces created by the replacement
          responseText = responseText.replace(/\s+/g, " ").trim();
        }
      }
    }
    
    // Remove AI artifacts like "As an AI..." or prefixes
    responseText = responseText
      .replace(/^as an ai/i, "")
      .replace(/^i'm sorry, but /i, "")
      .replace(/^i am an ai/i, "")
      .replace(/^as a language model/i, "")
      .replace(/^sorry, i/i, "I")
      .trim();
    
    // Remove emojis from responses (unless explicitly allowed for certain contacts/groups)
    if (!emojiAllowed) {
      // Use a regex to remove emojis
      responseText = responseText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
      console.log("Removed emojis from response");
    } else {
      // For groups where emojis are allowed but should be limited, count and potentially remove
      const emojiCount = (responseText.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
      
      if (emojiCount > 1) {
        // If more than one emoji, remove all but the first one
        let foundFirstEmoji = false;
        responseText = responseText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, (match) => {
          if (!foundFirstEmoji) {
            foundFirstEmoji = true;
            return match;
          }
          return "";
        });
        console.log(`Reduced emojis from ${emojiCount} to 1`);
      }
    }
    
    // Ensure responses are kept short - more aggressive truncation
    // First try to find a natural break point
    let truncatedResponse = responseText;
    
    if (responseText.length > 100) {
      // Look for sentence endings followed by space
      const sentenceBreaks = [...responseText.matchAll(/[.!?]\s+/g)];
      
      if (sentenceBreaks.length > 0) {
        // Find the first sentence break after 40 characters but before 100
        const suitableBreak = sentenceBreaks.find(match => 
          match.index >= 30 && match.index <= 90
        );
        
        if (suitableBreak) {
          truncatedResponse = responseText.substring(0, suitableBreak.index + 2);
        } else {
          // If no suitable break found, just truncate
          truncatedResponse = responseText.substring(0, 90);
        }
      } else {
        // No sentence breaks found, truncate at 90 chars
        truncatedResponse = responseText.substring(0, 90);
      }
    }
    
    // For explicitly sexual content, ensure the response is super brief
    if (config.specialContacts && contactNumber in config.specialContacts && 
        config.specialContacts[contactNumber].style === 'explicit') {
      
      // Ensure responses are very short
      if (truncatedResponse.length > 50) {
        const words = truncatedResponse.split(/\s+/);
        if (words.length > 8) {
          truncatedResponse = words.slice(0, 8).join(' ');
        }
      }
      
      // Remove any softening language
      truncatedResponse = truncatedResponse
        .replace(/i think|maybe|perhaps|possibly/gi, '')
        .replace(/would like to|would love to/gi, 'will')
        .replace(/could|would|should/gi, 'will')
        .replace(/^i want/i, 'I will')
        .trim();
    }
    
    // Special case for contact 919279782054: ensure ultra short responses
    if (contactNumber === '919279782054') {
      // Ensure extremely short responses for this contact
      // First, split into words
      const words = truncatedResponse.split(/\s+/);
      
      // If it's a question and more than 7 words, truncate
      if (truncatedResponse.includes('?') && words.length > 7) {
        truncatedResponse = words.slice(0, 7).join(' ');
      } 
      // If it's not a question and more than 6 words, truncate
      else if (!truncatedResponse.includes('?') && words.length > 6) {
        truncatedResponse = words.slice(0, 6).join(' ');
      }
      
      // Make sure response ends properly after truncation
      if (truncatedResponse.endsWith(',') || truncatedResponse.endsWith(';')) {
        truncatedResponse = truncatedResponse.slice(0, -1) + '.';
      }
      
      // If response doesn't end with punctuation, add a period
      if (!/[.!?]$/.test(truncatedResponse)) {
        truncatedResponse += '.';
      }
      
      // Make response more explicitly sexual if it's not already
      if (!containsExplicitWords(truncatedResponse)) {
        // Add explicit term if not present (randomly select)
        const explicitTerms = ['lund', 'chut', 'boobs', 'gaand', 'fuck'];
        const randomTerm = explicitTerms[Math.floor(Math.random() * explicitTerms.length)];
        
        // If it's a question, leave it as is
        if (!truncatedResponse.includes('?')) {
          // Randomly decide where to add the term
          if (Math.random() < 0.5) {
            // Add at the beginning
            truncatedResponse = `Mera ${randomTerm} ` + truncatedResponse;
          } else {
            // Add at the end by replacing period
            truncatedResponse = truncatedResponse.replace(/\.$/, '') + ` ${randomTerm}.`;
          }
        }
      }
    }
    
    // Emergency content filter for female contacts - additional safety measure
    if (false && config.specialContacts && contactNumber in config.specialContacts && 
        config.specialContacts[contactNumber].gender === 'female') {
      const explicitWords = [
        'lund', 'chut', 'chod', 'fuck', 'cum', 'boobs', 'sex', 'sexy', 'dick', 'horny', 'panty',
        'kiss', 'lips', 'garam', 'chudai', 'wet', 'touch', 'body', 'deep', 'andar', 'legs',
        'doggy', 'position', 'bed', 'masturbate', 'fingers', 'orgasm', 'nude', 'naked', 'fantasy',
        'video call', 'vc', 'pic', 'photo', 'ghusa', 'daal', 'choos', 'massage', 'hot',
        'tight', 'hole', 'come', 'spank', 'harder', 'suck', 'lick', 'maaru', 'dalna',
        'gili', 'garam', 'ready', 'oral', 'virgin', 'geeli', 'feel'
      ];

      // Regular expression patterns to detect inappropriate phrases
      const explicitPatterns = [
        /\b(tu|tum|tujhe|tumhe|tera|tumha?ra)\s+(.*?)(hot|sexy|horny|garam|gili|geeli|wet|touch|feel)\b/i,
        /\b(chut|pussy|dick|lund|cock|boobs)\b/i,
        /\b(kaha?n|where|konsi|which)\s+(position|pose|jagah|place)\b/i,
        /\b(video|call|vc)\s+(kare|karein|karenge|karen|karo)\b/i,
        /\bpic\s+(bhejo|send|dikha|dikhao)\b/i,
        /\bphoto\s+(bhejo|send|dikha|dikhao)\b/i,
        /\b(aaj|today|abhi|now)\s+(.*?)(karenge|karein|kare|karo|let's|lets)\b/i,
        /\b(andar|inside|under|neeche)\s+(.*?)(daal|dal|push|insert|ghusa)\b/i,
        /\b(tu|tum|tujhe|tumhe|tera|tumha?ra)\s+(.*?)(chahiye|want|need|like)\b/i
      ];
      
      // Check if response contains any explicit words
      const hasExplicitWord = explicitWords.some(word => 
        truncatedResponse.toLowerCase().includes(word.toLowerCase())
      );

      // Check against explicit patterns
      const matchesExplicitPattern = explicitPatterns.some(pattern => 
        pattern.test(truncatedResponse)
      );
      
      // Overall check for explicit content
      const hasExplicitContent = hasExplicitWord || matchesExplicitPattern;
      
      if (hasExplicitContent) {
        console.log(`⚠️ CRITICAL SAFETY OVERRIDE: Explicit content detected in response to female contact: "${truncatedResponse}"`);
        
        // Replace with a safe response
        const safeResponses = [
          "Aap kaise hain?",
          "Abhi main busy hoon, baad mein baat kar sakte hain.",
          "Kya aapka din accha raha?",
          "Main aapse baad mein baat karunga.",
          "Main thoda busy hoon, aapse jald hi baat karunga.",
          "Will respond soon.",
          "Sorry, having trouble responding clearly right now."
        ];
        
        truncatedResponse = safeResponses[Math.floor(Math.random() * safeResponses.length)];
        console.log(`🔒 SAFETY: Response replaced with: "${truncatedResponse}"`);
      }
    }
    
    return truncatedResponse;
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Shorter fallback responses in Hinglish
    const fallbackResponses = [
      "Thodi der baad baat karein?",
      "Connection issue hai. Baad mein reply karunga.",
      "Abhi busy hoon, thodi der mein free.",
      "Message dekha, jaldi reply karunga.",
      "Will respond soon."
    ];
    
    return getRandomMessage(fallbackResponses);
  }
}

// Helper function to check if text contains explicit sexual words
function containsExplicitWords(text) {
  const explicitWords = [
    'sex', 'fuck', 'lund', 'chut', 'boobs', 'chodo', 'chodna', 'horny', 'wet', 'hard', 
    'geeli', 'garam', 'nipple', 'cum', 'sperm', 'oral', 'blowjob', 'suck', 'dick', 'penis',
    'gaand', 'ass', 'pussy', 'vagina', 'orgasm', 'masturbate', 'hilana', 'muth'
  ];
  
  return explicitWords.some(word => text.toLowerCase().includes(word));
}

// Function to analyze language style from previous messages
function analyzeLanguageStyle(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) {
    return "No previous messages to analyze";
  }
  
  // Look at the last few messages from the user for style analysis
  const yourMessages = chatHistory.filter((_, index) => index % 2 === 1).slice(-3);
  
  if (yourMessages.length === 0) {
    return "No previous responses to analyze";
  }
  
  // Check for Hinglish patterns
  const hinglishPatterns = [
    /kya/i, /main/i, /tum/i, /aap/i, /hai/i, /hain/i, /mein/i, 
    /kar/i, /raha/i, /rahi/i, /ho/i, /kaise/i, /kyun/i, /acha/i,
    /nahi/i, /haan/i, /baat/i, /kuch/i, /bahut/i, /thoda/i
  ];
  
  // Count Hinglish words
  let hinglishCount = 0;
  let totalWords = 0;
  
  yourMessages.forEach(msg => {
    const words = msg.split(/\s+/);
    totalWords += words.length;
    
    words.forEach(word => {
      if (hinglishPatterns.some(pattern => pattern.test(word))) {
        hinglishCount++;
      }
    });
  });
  
  // Calculate Hinglish ratio
  const hinglishRatio = totalWords > 0 ? (hinglishCount / totalWords) : 0;
  
  // Analyze style
  if (hinglishRatio > 0.5) {
    return "Primarily Hinglish with some English mixed in";
  } else if (hinglishRatio > 0.3) {
    return "Mix of Hindi and English with more English words";
  } else if (hinglishRatio > 0.1) {
    return "Mostly English with occasional Hindi words";
  } else {
    return "Primarily English messages";
  }
}

// Function to check for repetitive patterns in conversation
function checkRepetitivePatterns(userMessages, botMessages) {
  if (!userMessages || !botMessages || userMessages.length < 2 || botMessages.length < 2) {
    return null;
  }
  
  // Check for repeated questions from bot
  const questionPatterns = [/\?$/, /kya/i, /kaisa/i, /kaise/i, /why/i, /what/i, /how/i, /where/i, /when/i];
  
  let repeatedQuestions = 0;
  let askedUserStatus = 0;
  let askedWhatDoing = 0;
  
  // Count question types
  for (const msg of botMessages) {
    // Check if it's a question
    if (questionPatterns.some(pattern => pattern.test(msg))) {
      repeatedQuestions++;
    }
    
    // Check for specific repetitive questions
    if (/how are you|kaise ho|kaisa hai|kya haal hai/i.test(msg)) {
      askedUserStatus++;
    }
    
    if (/what (are you doing|do you do)|kya kar rahe ho|kya kar rahi ho/i.test(msg)) {
      askedWhatDoing++;
    }
  }
  
  // Identify patterns
  if (repeatedQuestions >= 2) {
    return "asking too many questions";
  }
  
  if (askedUserStatus >= 2) {
    return "repeatedly asking how they are";
  }
  
  if (askedWhatDoing >= 2) {
    return "repeatedly asking what they're doing";
  }
  
  // Check if bot is repeating the same phrase
  if (botMessages.length >= 2 && 
      botMessages[0].toLowerCase() === botMessages[1].toLowerCase()) {
    return "repeating the exact same message";
  }
  
  return null;
}

// Start the client
client.initialize();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await client.destroy();
  process.exit(0);
});

// When checking for Valorant group
function isValorantGroup(chat) {
  if (!chat.isGroup) return false;
  
  // Get the group name
  const groupName = chat.name;
  console.log(`Checking group: ${groupName}`);
  
  // Check if Valorant group is enabled in config
  if (!config.valorantGroupConfig || !config.valorantGroupConfig.enabled) {
    console.log(`Valorant group responses are disabled in config`);
    return false;
  }
  
  // Check if it exactly matches the configured name
  const exactMatch = groupName === config.valorantGroupConfig.groupName;
  
  if (exactMatch) {
    console.log(`✅ Matched exact Valorant group: ${groupName}`);
    return true;
  }
  
  console.log(`❌ Not a Valorant group: ${groupName}`);
  return false;
}

// Add this function for safer message template selection
function getSafeMessageTemplate(contactNumber, templateType) {
  // No need to import messageTemplates here as it's imported at the top of the file
  
  // EMERGENCY SAFE MODE - if enabled, only allows casual/polite templates for ALL contacts
  if (EMERGENCY_SAFE_MODE) {
    console.log(`🚨 EMERGENCY SAFE MODE ACTIVE: Using safe templates for ALL contacts`);
    
    // For ALL contacts, regardless of gender, use only safe templates
    switch(templateType) {
      case 'truth':
        return messageTemplates.truthOrDare.safeTruth;
      case 'dare':
        return messageTemplates.truthOrDare.safeDare;
      case 'polite':
        return messageTemplates.polite;
      case 'morning':
        return messageTemplates.conversationStarters.femaleMorning;
      case 'night':
        return messageTemplates.conversationStarters.femaleNight;
      case 'bored':
        return messageTemplates.conversationStarters.femaleBored;
      case 'happy':
        return messageTemplates.moods.femaleHappy;
      case 'sad':
        return messageTemplates.moods.femaleSad;
      case 'romantic':
      case 'flirty':
      case 'explicit':
      case 'extraExplicit':
      case 'horny':
        // For ANY explicit templates, use safe casual templates
        console.log(`⚠️ BLOCKED: Emergency safe mode blocked template "${templateType}"`);
        return messageTemplates.casual;
      default:
        // For any other template type, use safe casual templates
        return messageTemplates.casual;
    }
  }
  
  // Check if this is a female contact that requires protection
  if (ENFORCE_FEMALE_CONTACT_SAFETY && 
      config.specialContacts && 
      contactNumber in config.specialContacts && 
      config.specialContacts[contactNumber].gender === 'female') {
    
    console.log(`🔒 SAFETY ENFORCED: Using female-safe templates for contact ${contactNumber}`);
    
    // Based on requested template type, return the appropriate safe template
    switch(templateType) {
      case 'truth':
        return messageTemplates.truthOrDare.safeTruth;
      case 'dare':
        return messageTemplates.truthOrDare.safeDare;
      case 'morning':
        return messageTemplates.conversationStarters.femaleMorning;
      case 'night':
        return messageTemplates.conversationStarters.femaleNight;
      case 'bored':
        return messageTemplates.conversationStarters.femaleBored;
      case 'happy':
        return messageTemplates.moods.femaleHappy;
      case 'sad':
        return messageTemplates.moods.femaleSad;
      case 'romantic':
      case 'flirty':
      case 'explicit':
      case 'extraExplicit':
      case 'horny':
        // For any romantic, flirty or explicit templates, ALWAYS use safe casual templates
        console.log(`⚠️ BLOCKED: Attempted to use inappropriate template "${templateType}" for female contact`);
        return messageTemplates.femaleContact;
      default:
        // For any other template type, use safe casual templates
        return messageTemplates.femaleContact;
    }
  }
  
  // For non-female contacts, or if safety is disabled, return the original template
  if (templateType === 'flirty' && messageTemplates[templateType]) {
    return messageTemplates[templateType];
  } else if (templateType === 'explicit' && messageTemplates[templateType]) {
    return messageTemplates[templateType];
  } else if (templateType === 'extraExplicit' && messageTemplates[templateType]) {
    return messageTemplates[templateType];
  } else if (templateType === 'romantic' && messageTemplates[templateType]) {
    return messageTemplates[templateType];
  } else if (templateType === 'casual' && messageTemplates[templateType]) {
    return messageTemplates[templateType];
  } else if (templateType === 'polite' && messageTemplates[templateType]) {
    return messageTemplates[templateType];
  } else {
    // Default to casual if the requested type doesn't exist
    return messageTemplates.casual;
  }
} 