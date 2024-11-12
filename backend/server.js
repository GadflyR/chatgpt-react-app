const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables

const sdk = require('microsoft-cognitiveservices-speech-sdk');

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();

const allowedOrigins = ['https://story.ibot1.net', 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net'];

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const bucket = admin.storage().bucket();
const firestore = admin.firestore();

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

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt provided.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // Ensure this model name is valid
        messages: [
          { role: 'user', content: prompt }, 
        ],
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

app.post('/api/tts', async (req, res) => {
  const { text, voice, userId, storyId } = req.body;

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
      async (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log('Speech synthesis completed successfully.');

          const audioBuffer = Buffer.from(result.audioData);
          const tempAudioPath = `/tmp/${uuidv4()}.mp3`;

          // Write audio data to a temporary file
          fs.writeFileSync(tempAudioPath, audioBuffer);

          try {
            // Upload the file to Firebase Storage
            const destination = `user_stories/${userId}/story_${storyId}.mp3`;
            await bucket.upload(tempAudioPath, {
              destination,
              metadata: {
                contentType: 'audio/mpeg',
                metadata: {
                  firebaseStorageDownloadTokens: uuidv4(),
                },
              },
            });

            // Generate download URL
            const file = bucket.file(destination);
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: '03-01-2500',
            });

            // Save audio URL to Firestore
            const storyRef = firestore.collection('users').doc(userId).collection('generatedStories').doc(storyId);
            await storyRef.update({ audioUrl: url });

            // Cleanup temporary file
            fs.unlinkSync(tempAudioPath);

            // Send the audio URL back to the client
            res.json({ audioUrl: url });

          } catch (uploadError) {
            console.error('Error uploading to Firebase Storage:', uploadError);
            res.status(500).json({ error: 'Error uploading audio to storage.' });
          }

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
