// load-env.js (in the ROOT directory)

import dotenv from 'dotenv';

// Load variables from the .env file in the same directory
dotenv.config();

// --- VALIDATION STEP ---
// Check if the specific API key we need was actually loaded.
if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.length === 0) {
    // If not, print a clear error and stop the application.
    console.error("===================================================================");
    console.error("FATAL ERROR: The OPENROUTER_API_KEY is not defined in your .env file.");
    console.error("Please check that your .env file exists in the root directory and");
    console.error("contains a line like: OPENROUTER_API_KEY=sk-or-v1-...");
    console.error("===================================================================");
    process.exit(1); // Exit the application with an error code.
}

// If the check passes, print the success message.
console.log('✅ Environment variables loaded and OPENROUTER_API_KEY is present.');