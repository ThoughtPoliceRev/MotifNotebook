// PDFium setup and initialization script
class PDFiumSetup {
    constructor() {
        this.wasmUrl = 'https://github.com/paulcuth/pdf.js-wasm/raw/master/build/pdf.wasm';
        this.jsUrl = 'https://github.com/paulcuth/pdf.js-wasm/raw/master/build/pdf.js';
    }

    async downloadFile(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download from ${url}: ${response.statusText}`);
        }
        return response.arrayBuffer();
    }

    async setupPDFium() {
        try {
            console.log('Downloading PDFium WASM module...');
            const wasmBinary = await this.downloadFile(this.wasmUrl);
            
            console.log('Downloading PDFium JavaScript bindings...');
            const jsCode = await this.downloadFile(this.jsUrl);
            
            // Convert ArrayBuffer to text for JS code
            const decoder = new TextDecoder('utf-8');
            const jsText = decoder.decode(jsCode);
            
            // Save the files
            await this.saveFiles(wasmBinary, jsText);
            
            console.log('PDFium setup completed successfully');
            return true;
        } catch (error) {
            console.error('PDFium setup failed:', error);
            return false;
        }
    }

    async saveFiles(wasmBinary, jsCode) {
        // Create Blob objects
        const wasmBlob = new Blob([wasmBinary], { type: 'application/wasm' });
        const jsBlob = new Blob([jsCode], { type: 'application/javascript' });
        
        // Create download links
        const wasmUrl = URL.createObjectURL(wasmBlob);
        const jsUrl = URL.createObjectURL(jsBlob);
        
        // Create and trigger downloads
        this.triggerDownload(wasmUrl, 'pdfium.wasm');
        this.triggerDownload(jsUrl, 'pdfium.js');
        
        // Cleanup URLs
        URL.revokeObjectURL(wasmUrl);
        URL.revokeObjectURL(jsUrl);
    }

    triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Export the setup utility
window.PDFiumSetup = PDFiumSetup;
