const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 5173;

// Serve static files from the dist directory
// When bundled with pkg, __dirname is the snapshot directory, but path.join(__dirname, 'dist') points to the virtual filesystem correctly if we use path.join.
app.use(express.static(path.join(__dirname, 'dist')));

// Start the server
app.listen(port, async () => {
  console.log(`==========================================`);
  console.log(` 85C Daily Report - Local Server`);
  console.log(` Server is running at http://localhost:${port}`);
  console.log(` Please do not close this window while using the app.`);
  console.log(`==========================================`);
  
  try {
    // Open the browser automatically on Windows
    exec(`start http://localhost:${port}`);
  } catch (error) {
    console.log(`Failed to open browser automatically. Please open http://localhost:${port} manually.`);
  }
});
