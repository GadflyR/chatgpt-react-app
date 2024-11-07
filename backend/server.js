const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

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
        model: 'gpt-4o-mini', // Use a valid model name
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

app.post('/api/tts', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid text provided.' });
  }

  const subscriptionKey = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_REGION; // Ensure this is 'eastus'

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `<speak version='1.0' xml:lang='en-US'>
    <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
      ${text}
    </voice>
  </speak>`;

  const headers = {
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    'Content-Type': 'application/ssml+xml',
    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
  };

  try {
    const response = await axios.post(endpoint, ssml, {
      headers,
      responseType: 'arraybuffer',
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.length,
    });

    res.send(Buffer.from(response.data, 'binary'));
  } catch (error) {
    console.error('Azure TTS API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error generating speech audio.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
