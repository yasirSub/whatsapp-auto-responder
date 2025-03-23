/**
 * Message templates for different communication styles
 * Used to generate appropriate responses based on contact preferences
 */
module.exports = {
  // Casual - Friendly and informal
  casual: [
    "Hey there! What's up?",
    "Just chilling, what about you?",
    "Cool, let's talk later!",
    "Sounds good to me",
    "Lol, that's funny",
    "I'm a bit busy, can I get back to you later?",
    "Awesome!",
    "Sorry, was afk",
    "No worries!",
    "What's going on?",
    "Yeah, I'm around"
  ],

  // Formal - Professional and courteous
  formal: [
    "Hello, how may I assist you today?",
    "Thank you for your message.",
    "I appreciate your patience.",
    "I hope this message finds you well.",
    "Please let me know if you require any further information.",
    "I will look into this matter promptly.",
    "Best regards.",
    "I apologize for the inconvenience.",
    "I am currently unavailable, but will respond at my earliest convenience.",
    "Thank you for your understanding."
  ],

  // Flirty - Playful and lighthearted
  flirty: [
    "Thinking of you today...",
    "You have the best smile",
    "Miss talking to you",
    "You're always on my mind",
    "Can't wait to see you again",
    "You just made my day better",
    "Love that about you",
    "You're something special, you know that?",
    "Always brightening my day",
    "How did I get so lucky to know you?"
  ],

  // Romantic - For significant others
  romantic: [
    "Missing you so much right now",
    "You mean everything to me",
    "Can't stop thinking about you",
    "Every moment with you is precious",
    "You make my heart skip a beat",
    "I'm the luckiest person to have you in my life",
    "Forever yours",
    "You are my everything",
    "I cherish every moment we spend together",
    "My heart belongs to you"
  ],

  // Polite - Respectful and courteous
  polite: [
    "Thanks for reaching out",
    "I hope you're having a great day",
    "It's nice to hear from you",
    "That's very kind of you",
    "I appreciate your message",
    "I'll be happy to help",
    "Please take care",
    "Wishing you well",
    "Thank you for thinking of me",
    "I'm grateful for your understanding"
  ],

  // Business - Work-related
  business: [
    "I'll review the proposal and get back to you shortly",
    "Let's schedule a meeting to discuss this further",
    "I've noted your requirements",
    "The deadline is approaching, let's prioritize accordingly",
    "Please find the requested information attached",
    "I'll coordinate with the team on this",
    "Let's touch base next week on this matter",
    "I'll prepare the necessary documentation",
    "Your input on this project would be valuable",
    "Let's align on the key deliverables"
  ],

  // Friendly - Warm and personal
  friendly: [
    "How's life treating you?",
    "It's been too long! How are you?",
    "Really miss our chats",
    "Let's catch up soon",
    "Always great to hear from you",
    "You won't believe what happened today",
    "How's your family doing?",
    "Got any plans for the weekend?",
    "Remember that time when we...",
    "You always know how to make me smile"
  ],

  // Explicit - Special category for consenting adults
  explicit: [
    "Hey, how are you doing today?",
    "Looking forward to seeing you soon",
    "What's on your mind?",
    "Just wanted to check in with you",
    "Thinking about you right now",
    "How's your day been?",
    "I miss our conversations",
    "You're special to me",
    "Let's plan something fun together soon",
    "Always happy to hear from you"
  ],
  
  // Safe responses - Used for female contacts or when safety mode is active
  safe: [
    "Hey, how are you doing today?",
    "Nice to hear from you!",
    "I'm pretty busy right now, can I get back to you later?",
    "Thanks for your message",
    "What's new with you?",
    "Good to hear from you",
    "Let's catch up sometime",
    "Hope you're doing well",
    "Sorry, can't talk much right now",
    "Take care!"
  ]
}; 