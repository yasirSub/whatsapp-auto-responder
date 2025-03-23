# WhatsApp Auto Responder

An AI-powered WhatsApp auto-response system using Google's Gemini API. This system automatically responds to WhatsApp messages using machine learning to generate natural, contextual replies.

## Features

- **Auto-responses** to messages with configurable cooldown periods
- **Gemini API integration** for AI-powered responses
- **Special contact handling** with customized response styles
- **Configurable content filters** for safe interactions
- **Personal and group chat support**
- **Truth or Dare game** integration
- **Local LLM support** via Ollama as a fallback option

## Setup Instructions

### Prerequisites

- Node.js v16.x or newer
- Google Gemini API key
- WhatsApp account

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yasirSub/whatsapp-auto-responder.git
cd whatsapp-auto-responder
```

2. Install dependencies:
```bash
npm install
```

3. Configure your API key:
   - Create a `.env` file in the root directory
   - Add your Gemini API key: `GEMINI_API_KEY=your_api_key_here`
   - Alternatively, update the `aiApiKey` in `src/config.js`

4. Configure contacts in `src/config.js`:
```javascript
allowedContacts: ["911234567890"], // Phone numbers allowed to use the auto-responder
blockedContacts: ["*"], // Block all other contacts
specialContacts: {  // Contacts with custom response styles
  "911234567890": {
    style: "explicit",
    name: "Friend", 
    gender: "male" 
  }
}
```

5. Start the auto-responder:
```bash
npm run asap
```

6. Scan the QR code with WhatsApp to log in

## Quick Commands

- `npm run asap` - Start with instant responses (no cooldown)
- `npm run start` - Start with default settings
- `npm run cli` - Start in CLI mode for advanced configuration

## Configuration

All settings can be modified in `src/config.js`:

- `enableAutoResponses`: Enable/disable automatic responses
- `cooldownPeriodMinutes`: Minimum time between responses
- `enableGroupResponses`: Enable/disable responses in group chats
- `aiProvider`: Choose between 'gemini' and 'ollama'
- `aiModel`: The model to use (e.g., 'gemini-pro')
- `aiSystemPrompt`: Instructions for the AI about how to respond
- `aiTemperature`: Controls randomness (0.0 to 1.0)

## Security & Privacy

- The application stores WhatsApp session data locally
- Your messages are processed through the Gemini API
- No message content is permanently stored

## Troubleshooting

1. If you get "Model not found" errors with Gemini, check your API version and model name
2. If you're using Ollama, ensure the selected model is installed
3. For connection issues, check your internet connection and API key

## License

MIT

## Disclaimer

This software is for educational purposes only. Be aware of WhatsApp's terms of service regarding automated messaging. 
