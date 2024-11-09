// testAzureTTS.js

require('dotenv').config();
const axios = require('axios');

const testTTS = async () => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/tts',
      { text: 'This is a test of the Azure Text-to-Speech service.' },
      { responseType: 'arraybuffer' }
    );

    // Save the audio to a file
    const fs = require('fs');
    fs.writeFileSync('test_audio.mp3', Buffer.from(response.data, 'binary'));
    console.log('Audio saved as test_audio.mp3');
  } catch (error) {
    console.error('Error during TTS test:', error.response ? error.response.data : error.message);
  }
};

testTTS();
