#!/usr/bin/env node
const readline = require('readline');
const { updateConfig, clearSession, loadConfig } = require('./utils');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayMenu() {
  console.log('\n=== WhatsApp Auto-Response Manager ===');
  console.log('1. View Current Configuration');
  console.log('2. Toggle Auto-Responses');
  console.log('3. Set Cooldown Period');
  console.log('4. Manage Allowed Contacts');
  console.log('5. Manage Blocked Contacts');
  console.log('6. Toggle Group Responses');
  console.log('7. Toggle Away Mode');
  console.log('8. Edit AI Prompt');
  console.log('9. Reset WhatsApp Session');
  console.log('0. Exit');
  
  rl.question('\nEnter your choice: ', (choice) => {
    handleMenuChoice(choice);
  });
}

function handleMenuChoice(choice) {
  switch (choice) {
    case '1':
      viewConfig();
      break;
    case '2':
      toggleAutoResponses();
      break;
    case '3':
      setCooldownPeriod();
      break;
    case '4':
      manageAllowedContacts();
      break;
    case '5':
      manageBlockedContacts();
      break;
    case '6':
      toggleGroupResponses();
      break;
    case '7':
      toggleAwayMode();
      break;
    case '8':
      editAIPrompt();
      break;
    case '9':
      resetSession();
      break;
    case '0':
      console.log('Exiting Auto-Response Manager. Goodbye!');
      rl.close();
      return;
    default:
      console.log('Invalid choice. Please try again.');
      displayMenu();
      return;
  }
}

// 1. View Current Configuration
function viewConfig() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  console.log('\n=== Current Configuration ===');
  console.log(`Auto-responses: ${config.enableAutoResponses ? 'Enabled' : 'Disabled'}`);
  console.log(`Cooldown period: ${config.cooldownPeriodMinutes} minutes`);
  console.log(`Group responses: ${config.enableGroupResponses ? 'Enabled' : 'Disabled'}`);
  console.log(`Away mode: ${config.awayModeOnly ? 'Enabled' : 'Disabled'}`);
  console.log(`Allowed contacts: ${config.allowedContacts.length > 0 ? config.allowedContacts.join(', ') : 'All'}`);
  console.log(`Blocked contacts: ${config.blockedContacts.length > 0 ? config.blockedContacts.join(', ') : 'None'}`);
  console.log(`AI Model: ${config.aiModel}`);
  console.log(`AI Max Tokens: ${config.aiMaxTokens}`);
  console.log(`AI Temperature: ${config.aiTemperature}`);
  console.log('\nAI System Prompt:');
  console.log(config.aiSystemPrompt);
  
  rl.question('\nPress Enter to continue...', () => {
    displayMenu();
  });
}

// 2. Toggle Auto-Responses
function toggleAutoResponses() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  config.enableAutoResponses = !config.enableAutoResponses;
  if (updateConfig(config)) {
    console.log(`Auto-responses ${config.enableAutoResponses ? 'enabled' : 'disabled'}.`);
  } else {
    console.log('Error updating configuration.');
  }
  
  rl.question('Press Enter to continue...', () => {
    displayMenu();
  });
}

// 3. Set Cooldown Period
function setCooldownPeriod() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  rl.question(`Enter new cooldown period in minutes (current: ${config.cooldownPeriodMinutes}): `, (input) => {
    const value = parseInt(input);
    if (isNaN(value) || value < 0) {
      console.log('Invalid input. Please enter a positive number.');
    } else {
      config.cooldownPeriodMinutes = value;
      if (updateConfig(config)) {
        console.log(`Cooldown period set to ${value} minutes.`);
      } else {
        console.log('Error updating configuration.');
      }
    }
    
    rl.question('Press Enter to continue...', () => {
      displayMenu();
    });
  });
}

// 4. Manage Allowed Contacts
function manageAllowedContacts() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  console.log('\n=== Manage Allowed Contacts ===');
  console.log('Current allowed contacts:');
  if (config.allowedContacts.length > 0) {
    config.allowedContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact}`);
    });
  } else {
    console.log('All contacts are allowed (empty list)');
  }
  
  console.log('\nOptions:');
  console.log('1. Add a contact');
  console.log('2. Remove a contact');
  console.log('3. Clear all allowed contacts (allow all)');
  console.log('0. Back to main menu');
  
  rl.question('\nEnter your choice: ', (choice) => {
    switch (choice) {
      case '1':
        rl.question('Enter the phone number to add (with country code, no + or spaces): ', (number) => {
          if (!config.allowedContacts.includes(number)) {
            config.allowedContacts.push(number);
            if (updateConfig(config)) {
              console.log(`Added ${number} to allowed contacts.`);
            } else {
              console.log('Error updating configuration.');
            }
          } else {
            console.log(`${number} is already in the allowed list.`);
          }
          
          rl.question('Press Enter to continue...', () => {
            manageAllowedContacts();
          });
        });
        break;
      case '2':
        if (config.allowedContacts.length === 0) {
          console.log('No contacts to remove.');
          rl.question('Press Enter to continue...', () => {
            manageAllowedContacts();
          });
          break;
        }
        
        rl.question('Enter the index of the contact to remove: ', (index) => {
          const idx = parseInt(index) - 1;
          if (isNaN(idx) || idx < 0 || idx >= config.allowedContacts.length) {
            console.log('Invalid index.');
          } else {
            const removed = config.allowedContacts.splice(idx, 1)[0];
            if (updateConfig(config)) {
              console.log(`Removed ${removed} from allowed contacts.`);
            } else {
              console.log('Error updating configuration.');
            }
          }
          
          rl.question('Press Enter to continue...', () => {
            manageAllowedContacts();
          });
        });
        break;
      case '3':
        config.allowedContacts = [];
        if (updateConfig(config)) {
          console.log('Cleared all allowed contacts. All contacts will now be allowed.');
        } else {
          console.log('Error updating configuration.');
        }
        
        rl.question('Press Enter to continue...', () => {
          manageAllowedContacts();
        });
        break;
      case '0':
        displayMenu();
        break;
      default:
        console.log('Invalid choice.');
        rl.question('Press Enter to continue...', () => {
          manageAllowedContacts();
        });
        break;
    }
  });
}

// 5. Manage Blocked Contacts
function manageBlockedContacts() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  console.log('\n=== Manage Blocked Contacts ===');
  console.log('Current blocked contacts:');
  if (config.blockedContacts.length > 0) {
    config.blockedContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact}`);
    });
  } else {
    console.log('No blocked contacts');
  }
  
  console.log('\nOptions:');
  console.log('1. Add a contact to block');
  console.log('2. Remove a contact from block list');
  console.log('3. Clear all blocked contacts');
  console.log('0. Back to main menu');
  
  rl.question('\nEnter your choice: ', (choice) => {
    switch (choice) {
      case '1':
        rl.question('Enter the phone number to block (with country code, no + or spaces): ', (number) => {
          if (!config.blockedContacts.includes(number)) {
            config.blockedContacts.push(number);
            if (updateConfig(config)) {
              console.log(`Added ${number} to blocked contacts.`);
            } else {
              console.log('Error updating configuration.');
            }
          } else {
            console.log(`${number} is already in the blocked list.`);
          }
          
          rl.question('Press Enter to continue...', () => {
            manageBlockedContacts();
          });
        });
        break;
      case '2':
        if (config.blockedContacts.length === 0) {
          console.log('No contacts to unblock.');
          rl.question('Press Enter to continue...', () => {
            manageBlockedContacts();
          });
          break;
        }
        
        rl.question('Enter the index of the contact to unblock: ', (index) => {
          const idx = parseInt(index) - 1;
          if (isNaN(idx) || idx < 0 || idx >= config.blockedContacts.length) {
            console.log('Invalid index.');
          } else {
            const removed = config.blockedContacts.splice(idx, 1)[0];
            if (updateConfig(config)) {
              console.log(`Removed ${removed} from blocked contacts.`);
            } else {
              console.log('Error updating configuration.');
            }
          }
          
          rl.question('Press Enter to continue...', () => {
            manageBlockedContacts();
          });
        });
        break;
      case '3':
        config.blockedContacts = [];
        if (updateConfig(config)) {
          console.log('Cleared all blocked contacts.');
        } else {
          console.log('Error updating configuration.');
        }
        
        rl.question('Press Enter to continue...', () => {
          manageBlockedContacts();
        });
        break;
      case '0':
        displayMenu();
        break;
      default:
        console.log('Invalid choice.');
        rl.question('Press Enter to continue...', () => {
          manageBlockedContacts();
        });
        break;
    }
  });
}

// 6. Toggle Group Responses
function toggleGroupResponses() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  config.enableGroupResponses = !config.enableGroupResponses;
  if (updateConfig(config)) {
    console.log(`Group responses ${config.enableGroupResponses ? 'enabled' : 'disabled'}.`);
  } else {
    console.log('Error updating configuration.');
  }
  
  rl.question('Press Enter to continue...', () => {
    displayMenu();
  });
}

// 7. Toggle Away Mode
function toggleAwayMode() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  config.awayModeOnly = !config.awayModeOnly;
  if (updateConfig(config)) {
    console.log(`Away mode ${config.awayModeOnly ? 'enabled' : 'disabled'}.`);
  } else {
    console.log('Error updating configuration.');
  }
  
  rl.question('Press Enter to continue...', () => {
    displayMenu();
  });
}

// 8. Edit AI Prompt
function editAIPrompt() {
  const config = loadConfig();
  if (!config) {
    console.log('Error loading configuration.');
    return displayMenu();
  }
  
  console.log('\nCurrent AI System Prompt:');
  console.log(config.aiSystemPrompt);
  
  rl.question('\nEnter new AI prompt (or press Enter to keep current): ', (prompt) => {
    if (prompt.trim()) {
      config.aiSystemPrompt = prompt.trim();
      if (updateConfig(config)) {
        console.log('AI prompt updated successfully.');
      } else {
        console.log('Error updating configuration.');
      }
    } else {
      console.log('AI prompt unchanged.');
    }
    
    rl.question('Press Enter to continue...', () => {
      displayMenu();
    });
  });
}

// 9. Reset WhatsApp Session
function resetSession() {
  rl.question('Are you sure you want to reset the WhatsApp session? This will require scanning the QR code again. (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      if (clearSession()) {
        console.log('WhatsApp session reset successful. You will need to scan the QR code on next start.');
      } else {
        console.log('No session data found or error clearing session.');
      }
    } else {
      console.log('Session reset cancelled.');
    }
    
    rl.question('Press Enter to continue...', () => {
      displayMenu();
    });
  });
}

// Start the CLI
console.log('Welcome to WhatsApp Auto-Response Manager');
displayMenu(); 