
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple .env parser to avoid dependencies
const parseEnv = () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/VITE_GEMINI_API_KEY=(.*)/);
        return match ? match[1].trim() : null;
    } catch (e) {
        return null;
    }
};

const apiKey = parseEnv();

if (!apiKey) {
    console.error("❌ Could not find VITE_GEMINI_API_KEY in .env");
    process.exit(1);
}

console.log(`Checking API Key: ${apiKey.substring(0, 5)}...`);

const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.error) {
                console.error("❌ API Error:", response.error.message);
            } else if (response.models) {
                console.log("✅ API Connection Successful! Available Models:");
                response.models.forEach(m => {
                    if (m.name.includes('gemini')) {
                        console.log(` - ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                    }
                });
            } else {
                console.log("⚠️ Unexpected response:", response);
            }
        } catch (e) {
            console.error("❌ Failed to parse response:", data);
        }
    });

}).on('error', (err) => {
    console.error("❌ Network Error:", err.message);
});
