// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables

const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Adjust these to match your deployment
const allowedOrigins = [
  'https://story.ibot1.net',
  'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net',
];

app.use(express.static(path.join(__dirname, '../build')));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from that origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// =========================== NEW: DALL·E IMAGE GENERATION ROUTE ===========================
app.post('/api/generateImage', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt for image generation.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        prompt, // e.g., "An epic fantasy illustration of a brave knight in a medieval city"
        n: 1,
        size: '512x512',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    // The DALL·E endpoint returns an array of images with "url" keys.
    // We only request 1, so take data[0].url
    const imageUrl = response.data.data[0].url;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error generating image via DALL·E:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to generate image.' });
  }
});

// =========================== OPENAI CHAT COMPLETION (GPT) ===========================
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt provided.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // this is the actual model
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error communicating with OpenAI API:', error.response ? error.response.data : error.message);
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
      res.status(error.response.status).json({ error: error.response.data.error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

// =========================== TEXT-TO-SPEECH (Azure) ===========================
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;

  if (!text || typeof text !== 'string') {
    console.error('Invalid text provided for TTS.');
    return res.status(400).json({ error: 'Invalid text provided.' });
  }

  const subscriptionKey = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_REGION;

  if (!subscriptionKey || !region) {
    console.error('Azure TTS key or region is not set.');
    return res.status(500).json({ error: 'Azure TTS configuration error.' });
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    speechConfig.speechSynthesisVoiceName = voice || 'en-US-JennyNeural';

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    console.log('Starting speech synthesis...');

    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log('Speech synthesis completed successfully.');

          const audioBuffer = Buffer.from(result.audioData);
          res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'no-cache',
            'Content-Disposition': `inline; filename="tts-${uuidv4()}.mp3"`,
          });
          res.send(audioBuffer);
        } else {
          console.error('Speech synthesis failed:', result.errorDetails);
          res.status(500).json({ error: 'Speech synthesis failed.' });
        }
        synthesizer.close();
      },
      (error) => {
        console.error('Speech synthesis error:', error);
        res.status(500).json({ error: 'Speech synthesis error.' });
        synthesizer.close();
      }
    );
  } catch (error) {
    console.error('Azure TTS API error:', error);
    res.status(500).json({ error: 'Error generating speech audio.' });
  }
});

// =========================== SERVE REACT FRONTEND ===========================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
