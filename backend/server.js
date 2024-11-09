// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

// Import the Azure Speech SDK
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();
app.use(express.json());
app.use(cors());

// Endpoint to handle chat requests
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  // Validate the prompt
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt provided.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // Ensure this is a valid model name
        messages: [
          { role: 'user', content: prompt }, // Ensure 'content' is included
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 30000, // Optional: Set a timeout for the request
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error communicating with OpenAI API:', error.response ? error.response.data : error.message);

    // Return the error message from OpenAI if available
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
      res.status(error.response.status).json({ error: error.response.data.error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

// Azure TTS Endpoint using SDK
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;

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
    speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural'; // You can make this dynamic based on user selection

    // Create a PushStream
    const pushStream = sdk.AudioOutputStream.createPushStream();

    // Create an AudioConfig from the PushStream
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pushStream);

    // Create the SpeechSynthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // Array to hold audio data chunks
    let audioChunks = [];

    // Handle audio data received
    pushStream.onData = (data) => {
      audioChunks.push(Buffer.from(data));
    };

    // Handle the end of audio stream
    pushStream.onClose = () => {
      const audioBuffer = Buffer.concat(audioChunks);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });
      res.send(audioBuffer);
    };

    // Start synthesizing
    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log('Speech synthesis completed.');
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
