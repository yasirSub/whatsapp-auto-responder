// Truth or Dare Game Handler
const config = require('./config');

// Game session state storage
const gameState = {};

/**
 * Handle Truth or Dare game interaction
 * @param {string} message - The user message
 * @param {string} phoneNumber - The user's phone number
 * @returns {Object} - Response information
 */
function handleTruthOrDare(message, phoneNumber) {
  const lowerCaseMsg = message.toLowerCase().trim();
  
  // Get contact configuration if available
  const contactConfig = config.specialContacts && config.specialContacts[phoneNumber] 
    ? config.specialContacts[phoneNumber] 
    : null;
  
  // Check gender context for tailoring responses
  const gender = contactConfig && contactConfig.gender
    ? contactConfig.gender
    : 'unknown';
  
  // Check if the message is a trigger to start the game
  if (isTriggerMessage(lowerCaseMsg)) {
    // Initialize or reset game state
    gameState[phoneNumber] = {
      isPlaying: true,
      mode: getGameMode(lowerCaseMsg),
      lastQuestion: null,
      waitingForAnswer: false,
      questionType: null,
      questionResponses: 0,
      gender: gender // Store gender context in game state
    };
    
    let startResponse = config.truthOrDareModes.startResponse;
    
    // If it's a female contact, adjust the game options
    if (gender === 'female') {
      startResponse = "Let's play Truth or Dare! Choose 'truth' or 'dare' to start playing.";
    }
    
    return {
      isGameResponse: true,
      message: startResponse
    };
  }
  
  // If user is not in a game session, don't process further
  if (!gameState[phoneNumber] || !gameState[phoneNumber].isPlaying) {
    return { isGameResponse: false };
  }
  
  // If we're waiting for an answer to a previous question
  if (gameState[phoneNumber].waitingForAnswer) {
    // User answered the question, let's respond to their answer
    gameState[phoneNumber].questionResponses++;
    
    // After user answers, provide a reaction and ask for next choice
    if (gameState[phoneNumber].questionResponses >= 1) {
      let reaction = "";
      const questionType = gameState[phoneNumber].questionType;
      
      // Different reactions based on question type
      if (questionType === 'truth') {
        reaction = getReactionToTruth(lowerCaseMsg);
      } else if (questionType === 'dare') {
        reaction = getReactionToDare(lowerCaseMsg);
      } else if (questionType === 'spicyTruth') {
        reaction = getReactionToSpicyTruth(lowerCaseMsg);
      } else if (questionType === 'spicyDare') {
        reaction = getReactionToSpicyDare(lowerCaseMsg);
      } else if (questionType === 'extremeDare') {
        reaction = getReactionToExtremeDare(lowerCaseMsg);
      }
      
      // Reset for next question/dare
      gameState[phoneNumber].waitingForAnswer = false;
      gameState[phoneNumber].questionResponses = 0;
      
      // For female contacts, only offer standard options
      let nextPrompt = "Next round? Choose 'truth', 'dare', 'spicy truth (st)', 'spicy dare (sd)', or 'extreme dare (xd)'";
      if (gameState[phoneNumber].gender === 'female') {
        nextPrompt = "Next round? Choose 'truth' or 'dare'";
      }
      
      return {
        isGameResponse: true,
        message: reaction + "\n\n" + nextPrompt
      };
    }
    
    return {
      isGameResponse: true,
      message: "Interesting! Tell me more about that..."
    };
  }
  
  // Handle truth choice
  if (lowerCaseMsg.includes('truth') || lowerCaseMsg === 't') {
    // For female contacts, don't offer spicy options
    if (gameState[phoneNumber].gender !== 'female' && (lowerCaseMsg.includes('spicy') || lowerCaseMsg === 'st')) {
      const question = getRandomSpicyTruthQuestion(phoneNumber);
      gameState[phoneNumber].lastQuestion = question;
      gameState[phoneNumber].waitingForAnswer = true;
      gameState[phoneNumber].questionType = 'spicyTruth';
      
      return {
        isGameResponse: true,
        message: question
      };
    } else {
      const question = getRandomTruthQuestion(phoneNumber);
      gameState[phoneNumber].lastQuestion = question;
      gameState[phoneNumber].waitingForAnswer = true;
      gameState[phoneNumber].questionType = 'truth';
      
      return {
        isGameResponse: true,
        message: question
      };
    }
  }
  
  // Handle dare choice
  if (lowerCaseMsg.includes('dare') || lowerCaseMsg === 'd') {
    // For female contacts, don't offer extreme options
    if (gameState[phoneNumber].gender !== 'female') {
      if (lowerCaseMsg.includes('extreme') || lowerCaseMsg === 'xd') {
        const dare = getRandomExtremeDareChallenge(phoneNumber);
        gameState[phoneNumber].lastQuestion = dare;
        gameState[phoneNumber].waitingForAnswer = true;
        gameState[phoneNumber].questionType = 'extremeDare';
        
        return {
          isGameResponse: true,
          message: dare
        };
      } else if (lowerCaseMsg.includes('spicy') || lowerCaseMsg === 'sd') {
        const dare = getRandomSpicyDareChallenge(phoneNumber);
        gameState[phoneNumber].lastQuestion = dare;
        gameState[phoneNumber].waitingForAnswer = true;
        gameState[phoneNumber].questionType = 'spicyDare';
        
        return {
          isGameResponse: true,
          message: dare
        };
      }
    }
    
    // Standard dare for everyone
    const dare = getRandomDareChallenge(phoneNumber);
    gameState[phoneNumber].lastQuestion = dare;
    gameState[phoneNumber].waitingForAnswer = true;
    gameState[phoneNumber].questionType = 'dare';
    
    return {
      isGameResponse: true,
      message: dare
    };
  }
  
  // Handle next (request another question/dare)
  if (lowerCaseMsg === 'next' || lowerCaseMsg === 'another') {
    let nextPrompt = "Choose 'truth', 'dare', 'spicy truth (st)', 'spicy dare (sd)', or 'extreme dare (xd)'";
    if (gameState[phoneNumber].gender === 'female') {
      nextPrompt = "Choose 'truth' or 'dare'";
    }
    
    return {
      isGameResponse: true,
      message: nextPrompt
    };
  }
  
  // Handle game termination
  if (lowerCaseMsg === 'stop' || lowerCaseMsg === 'end' || lowerCaseMsg === 'quit') {
    gameState[phoneNumber].isPlaying = false;
    
    return {
      isGameResponse: true,
      message: "Game ended! We can play again anytime."
    };
  }
  
  // For any other messages during the game, prompt them to choose
  let choicePrompt = "Choose 'truth', 'dare', 'spicy truth (st)', 'spicy dare (sd)', or 'extreme dare (xd)'";
  if (gameState[phoneNumber].gender === 'female') {
    choicePrompt = "Choose 'truth' or 'dare'";
  }
  
  return {
    isGameResponse: true,
    message: choicePrompt
  };
}

// Get reaction to truth responses
function getReactionToTruth(answer) {
  const reactions = [
    "Wow, that's quite a revelation!",
    "Didn't expect that from you!",
    "That's interesting to know!",
    "Thanks for being honest!",
    "I'll remember that about you!"
  ];
  return reactions[Math.floor(Math.random() * reactions.length)];
}

// Get reaction to dare responses
function getReactionToDare(answer) {
  // Check if they agreed or declined
  if (answer.includes('ok') || answer.includes('done') || answer.includes('yes') || answer.includes('ha') || answer.includes('okay')) {
    const reactions = [
      "Brave! I like your attitude!",
      "Well done! That was fun!",
      "You're quite daring, aren't you?",
      "Nice! You're good at this game!",
      "That was awesome!"
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  } else {
    const reactions = [
      "Too scared? Maybe try an easier dare next time!",
      "No problem, we can try something else!",
      "Maybe next time you'll be braver!",
      "That's okay, not everyone is daring enough!",
      "Let's try something different next round!"
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }
}

// Get reaction to spicy truth responses
function getReactionToSpicyTruth(answer) {
  const reactions = [
    "That's quite spicy! I like your honesty!",
    "Oooh, that's interesting to know!",
    "Getting hot in here with your answers!",
    "That's quite revealing!",
    "I'm definitely learning new things about you!"
  ];
  return reactions[Math.floor(Math.random() * reactions.length)];
}

// Get reaction to spicy dare responses
function getReactionToSpicyDare(answer) {
  // Check if they agreed or declined
  if (answer.includes('ok') || answer.includes('done') || answer.includes('yes') || answer.includes('ha') || answer.includes('okay')) {
    const reactions = [
      "You're on fire! That was hot!",
      "Wow, you actually did it! Impressive!",
      "You're bolder than I thought!",
      "That was quite a show!",
      "You're killing this game!"
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  } else {
    const reactions = [
      "Too spicy for you? No worries!",
      "Maybe that was a bit too much!",
      "We can tone it down if you prefer!",
      "No pressure, it's just a game!",
      "Let's try something more comfortable next time!"
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }
}

// Get reaction to extreme dare responses
function getReactionToExtremeDare(answer) {
  // Check if they agreed or declined
  if (answer.includes('ok') || answer.includes('done') || answer.includes('yes') || answer.includes('ha') || answer.includes('okay')) {
    const reactions = [
      "OMG! You're wild!",
      "Absolutely fearless! I'm impressed!",
      "You're taking this to another level!",
      "That was extremely daring!",
      "You've got some serious guts!"
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  } else {
    const reactions = [
      "That was probably too extreme, let's try something else!",
      "No problem, that was pushing the limits!",
      "Even I thought that might be too much!",
      "Let's stick to regular dares next time!",
      "No judgment, that was definitely on the extreme side!"
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }
}

/**
 * Check if the message is a trigger to start the game
 */
function isTriggerMessage(message) {
  // Check if triggers array exists before trying to use it
  return config.truthOrDareModes && 
         config.truthOrDareModes.triggers && 
         Array.isArray(config.truthOrDareModes.triggers) &&
         config.truthOrDareModes.triggers.some(trigger => 
           message.includes(trigger.toLowerCase())
         );
}

/**
 * Determine game mode based on message
 */
function getGameMode(message) {
  if (message.includes('spicy')) return 'spicy';
  if (message.includes('extreme')) return 'extreme';
  return config.truthOrDareModes && config.truthOrDareModes.defaultMode ? 
         config.truthOrDareModes.defaultMode : 'casual';
}

/**
 * Get random truth question
 */
function getRandomTruthQuestion(phoneNumber) {
  // Choose safe questions for female contacts
  if (config.specialContacts && 
      phoneNumber in config.specialContacts && 
      config.specialContacts[phoneNumber].gender === 'female') {
      
    const safeTruthQuestions = config.messageTemplates.truthOrDare.safeTruth || config.messageTemplates.truthOrDare.truth;
    const question = getRandomItem(safeTruthQuestions);
    return "🤔 TRUTH 🤔\n" + question;
  }
  
  // Regular questions for others
  const truthQuestions = config.messageTemplates.truthOrDare.truth;
  const question = getRandomItem(truthQuestions);
  return "🤔 TRUTH 🤔\n" + question;
}

/**
 * Get random dare challenge
 */
function getRandomDareChallenge(phoneNumber) {
  // Choose safe dares for female contacts
  if (config.specialContacts && 
      phoneNumber in config.specialContacts && 
      config.specialContacts[phoneNumber].gender === 'female') {
      
    const safeDareChallenges = config.messageTemplates.truthOrDare.safeDare || config.messageTemplates.truthOrDare.dare;
    const challenge = getRandomItem(safeDareChallenges);
    return "😄 DARE 😄\n" + challenge;
  }
  
  // Regular dares for others
  const dareChallenges = config.messageTemplates.truthOrDare.dare;
  const challenge = getRandomItem(dareChallenges);
  return "😈 DARE ��\n" + challenge;
}

/**
 * Get random spicy truth question
 */
function getRandomSpicyTruthQuestion(phoneNumber) {
  const spicyTruthQuestions = config.messageTemplates.truthOrDare.spicyTruth;
  const question = getRandomItem(spicyTruthQuestions);
  return "🔥 SPICY TRUTH 🔥\n" + question;
}

/**
 * Get random spicy dare challenge
 */
function getRandomSpicyDareChallenge(phoneNumber) {
  const spicyDareChallenges = config.messageTemplates.truthOrDare.spicyDare;
  const challenge = getRandomItem(spicyDareChallenges);
  return "🔥 SPICY DARE 🔥\n" + challenge;
}

/**
 * Get random extreme dare challenge
 */
function getRandomExtremeDareChallenge(phoneNumber) {
  const extremeDareChallenges = config.messageTemplates.truthOrDare.extremeDare;
  const challenge = getRandomItem(extremeDareChallenges);
  return "⚠️ EXTREME DARE ⚠️\n" + challenge;
}

/**
 * Get a random item from an array
 */
function getRandomItem(array) {
  if (!array || array.length === 0) return "No questions available";
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if a user is currently in a game
 */
function isInGame(phoneNumber) {
  return !!(gameState[phoneNumber] && gameState[phoneNumber].isPlaying);
}

module.exports = {
  handleTruthOrDare,
  isInGame
}; 