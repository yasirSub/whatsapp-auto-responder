#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { updateConfig, loadConfig } = require('./utils');
const truthOrDare = require('./truthOrDare');

// Display banner
console.log('');
console.log('===============================================');
console.log('🚀 WhatsApp Auto-Response ASAP Mode Activating');
console.log('===============================================');
console.log('');

// Load current config
const config = loadConfig();

// Backup original config
const originalConfig = { ...config };
const backupPath = path.join(__dirname, 'config.backup.js');

// Check if backup already exists
if (!fs.existsSync(backupPath)) {
  // Create backup of original configuration
  try {
    // Write backup to separate file
    const configContent = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
    fs.writeFileSync(backupPath, configContent, 'utf8');
    console.log('✅ Original configuration backed up');
  } catch (error) {
    console.error('⚠️ Error backing up configuration:', error.message);
  }
}

// Update configuration for ASAP mode
const asapConfig = {
  ...config,
  enableAutoResponses: true,
  cooldownPeriodMinutes: 0,
  enableGroupResponses: true,
  aiSystemPrompt: `You are responding on behalf of the owner of this WhatsApp account.
                   Be helpful, natural, and concise.
                   Keep responses very brief - preferably 1-2 sentences maximum.
                   Respond as if you're the actual person, not an AI.`,
  aiMaxTokens: 80,
  aiTemperature: 0.3,
};

// Apply ASAP configuration
if (updateConfig(asapConfig)) {
  console.log('✅ ASAP mode configuration applied:');
  console.log('  • Auto-responses: Enabled');
  console.log('  • Cooldown: 0 minutes (respond to every message)');
  console.log('  • Group responses: Enabled');
  console.log('  • Response style: Brief & quick');
} else {
  console.error('⚠️ Failed to apply ASAP configuration');
  process.exit(1);
}

console.log('');
console.log('🔄 Starting WhatsApp auto-response system...');
console.log('');

// Register cleanup function for when the script is terminated
process.on('SIGINT', async () => {
  console.log('\n\n💾 Restoring original configuration...');
  
  // Check if we have a backup to restore
  if (fs.existsSync(backupPath)) {
    try {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(path.join(__dirname, 'config.js'), backupContent, 'utf8');
      console.log('✅ Original configuration restored');
    } catch (error) {
      console.error('⚠️ Error restoring configuration:', error.message);
    }
  } else {
    // No backup, just update with the original values
    if (updateConfig(originalConfig)) {
      console.log('✅ Original configuration restored');
    } else {
      console.error('⚠️ Failed to restore original configuration');
    }
  }
  
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Start the WhatsApp client
try {
  require('./index');
} catch (error) {
  console.error('⚠️ Error starting WhatsApp client:', error.message);
  process.exit(1);
}

// Add this to your message processing logic where you handle incoming messages
async function handleMessage(message, phoneNumber) {
  // First check if this is a Truth or Dare game interaction
  const gameResponse = truthOrDare.handleTruthOrDare(message.body, phoneNumber);
  
  if (gameResponse.isGameResponse) {
    // This is a game interaction, send the game response directly
    await sendTypingIndicator(phoneNumber);
    await sendMessage(phoneNumber, gameResponse.message);
    return; // Exit early, don't process further
  }
  
  // If not a game message, continue with your normal message processing
  
  // If user is in a truth or dare game, we don't want to generate AI responses
  if (truthOrDare.isInGame(phoneNumber)) {
    return; // Don't process further if they're in a game
  }
  
  // Existing message handling code continues here...
  // Check cooldowns, generate AI responses, etc.

  // Inside the function that handles AI prompt preparation (where it checks for special contacts)
  if (specialContacts && phoneNumber in specialContacts) {
    // Get the special contact config
    const specialContact = specialContacts[phoneNumber];
    
    console.log(`Using custom prompt for special contact ${phoneNumber} (${specialContact.style} style)`);
    
    // Check if we have gender-specific handling
    if (specialContact.gender === 'female') {
      console.log(`Detected female contact - applying appropriate respectful style regardless of original style setting`);
      
      // Force override style for female contacts - ignore any explicit/flirty settings
      responseStyle = 'casual';
      
      // Prepare a female-specific prompt with strict instructions
      systemPrompt = `You are responding on behalf of the owner of this WhatsApp account to a female friend.
                     IMPORTANT: You MUST ALWAYS be respectful, casual, and appropriate in your responses.
                     IMPORTANT: NEVER use explicit, sexual, flirty or inappropriate language under ANY circumstances.
                     NEVER use tu/tujhe/tera forms - ALWAYS use the respectful "tm/tmhe/tmhara" form.
                     Keep responses brief - preferably 1 sentence.
                     NEVER discuss or reference body parts, sex, or anything remotely explicit.
                     Be friendly but proper and respectful at all times.
                     Respond as if you're having a normal, appropriate conversation with a female friend.`;
      
      if (specialContact.contextHint) {
        systemPrompt += ` ${specialContact.contextHint}`;
      }
      
      // Hard override any temperature setting to reduce creativity/randomness
      temperature = 0.3;
      
    } else if (specialContact.gender === 'male') {
      // Prepare a male-specific prompt if needed
      systemPrompt = `You are responding on behalf of the owner of this WhatsApp account. 
                     Respond in the style specified for this contact.
                     Keep responses brief - usually 1-2 sentences.
                     Respond as if you're the actual person chatting.`;
    }
    
    // Set other parameters as before
    responseStyle = specialContact.style || responseStyle;
    temperature = specialContact.aiTemperature || temperature;
  }
} 