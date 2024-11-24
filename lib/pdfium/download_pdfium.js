const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PDFIUM_VERSION = 'chromium/5394';
const DOWNLOAD_URL = `https://github.com/bblanchon/pdfium-binaries/releases/latest/download/pdfium-windows-x64.zip`;
const DOWNLOAD_DIR = path.join(__dirname, 'build');
const WASM_FILE = path.join(__dirname, 'pdfium.wasm');
const JS_FILE = path.join(__dirname, 'pdfium.js');

// Create build directory if it doesn't exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

console.log('Downloading PDFium binaries...');

// Download PDFium binaries
const file = fs.createWriteStream(path.join(DOWNLOAD_DIR, 'pdfium.zip'));
https.get(DOWNLOAD_URL, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Failed to download PDFium: ${response.statusCode}`);
        process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('Download complete. Extracting...');

        try {
            // Extract the zip file
            execSync(`powershell Expand-Archive -Path "${path.join(DOWNLOAD_DIR, 'pdfium.zip')}" -DestinationPath "${DOWNLOAD_DIR}" -Force`);
            console.log('Extraction complete.');

            // Copy the WASM file
            fs.copyFileSync(
                path.join(DOWNLOAD_DIR, 'pdfium.wasm'),
                WASM_FILE
            );

            // Copy the JavaScript file
            fs.copyFileSync(
                path.join(DOWNLOAD_DIR, 'pdfium.js'),
                JS_FILE
            );

            console.log('PDFium files installed successfully!');
        } catch (error) {
            console.error('Error during extraction:', error);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('Error downloading PDFium:', err);
    process.exit(1);
});
