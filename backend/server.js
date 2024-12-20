const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables

const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();

const allowedOrigins = [
  'https://story.ibot1.net',
  'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net',
];

app.use(express.static(path.join(__dirname, '../build')));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Route to handle OpenAI chat requests
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt provided.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // This model name is valid
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

// Route to handle text-to-speech requests
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;

  if (!text || typeof text !== 'string') {
    console.error('Invalid text provided.');
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

          // Send the audio data back directly as a buffer
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
