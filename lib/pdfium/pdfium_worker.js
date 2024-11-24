// PDFium Web Worker for PDF operations
importScripts('memory_manager.js');

let pdfium = null;
let memoryManager = null;
let currentDocument = null;

// Initialize PDFium WASM module
async function initializePDFium() {
    try {
        // Load PDFium WASM module
        const response = await fetch('pdfium.wasm');
        if (!response.ok) {
            throw new Error('Failed to load PDFium WASM module');
        }
        
        const wasmBinary = await response.arrayBuffer();
        
        // Initialize WASM module with custom memory
        const memory = new WebAssembly.Memory({ 
            initial: 256,  // 16MB initial
            maximum: 2048  // 128MB maximum
        });

        // Initialize the module with imports
        const wasmModule = await WebAssembly.instantiate(wasmBinary, {
            env: {
                memory,
                // Add any required import functions here
                abort: () => { throw new Error('WASM aborted'); }
            }
        });
        
        pdfium = wasmModule.instance.exports;
        memoryManager = new PDFiumMemoryManager(memory);

        // Initialize PDFium library
        const result = pdfium.FPDF_InitLibrary();
        if (result !== 1) {
            throw new Error('Failed to initialize PDFium library');
        }
        
        return { success: true };
    } catch (error) {
        console.error('PDFium initialization error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// Load a PDF document
async function loadPDF(pdfData) {
    try {
        if (!pdfium || !memoryManager) {
            throw new Error('PDFium not initialized');
        }
        
        // Clean up previous document if any
        if (currentDocument) {
            pdfium.FPDF_CloseDocument(currentDocument);
            currentDocument = null;
        }
        
        // Copy PDF data to WASM memory
        const pdfPtr = memoryManager.copyToWasm(pdfData);
        
        // Load document
        currentDocument = pdfium.FPDF_LoadMemDocument(pdfPtr, pdfData.byteLength, null);
        if (!currentDocument) {
            const error = pdfium.FPDF_GetLastError();
            throw new Error(`Failed to load PDF document (error code: ${error})`);
        }
        
        // Get page count
        const pageCount = pdfium.FPDF_GetPageCount(currentDocument);
        
        // Free the PDF data memory
        memoryManager.free(pdfPtr);
        
        return {
            success: true,
            data: { pageCount }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Render a page to an ImageData object
async function renderPage(pageNumber, scale = 1.0) {
    try {
        if (!currentDocument) {
            throw new Error('No PDF document loaded');
        }
        
        // Load the page
        const page = pdfium.FPDF_LoadPage(currentDocument, pageNumber - 1);
        if (!page) {
            throw new Error('Failed to load page');
        }
        
        try {
            // Get page dimensions
            const width = Math.floor(pdfium.FPDF_GetPageWidth(page) * scale);
            const height = Math.floor(pdfium.FPDF_GetPageHeight(page) * scale);
            
            // Create bitmap buffer
            const stride = ((width * 4) + 3) & ~3; // 4 bytes per pixel, aligned to 4 bytes
            const bufferSize = stride * height;
            const buffer = memoryManager.allocate(bufferSize);
            
            try {
                // Render the page
                const result = pdfium.FPDF_RenderPageBitmap(
                    buffer,
                    page,
                    0, 0,
                    width, height,
                    0, // rotation
                    pdfium.FPDF_ANNOT | pdfium.FPDF_LCD_TEXT // flags
                );
                
                if (result !== 1) {
                    throw new Error('Failed to render page');
                }
                
                // Create ImageData from the rendered buffer
                const imageData = new ImageData(
                    new Uint8ClampedArray(memoryManager.readFromWasm(buffer, bufferSize)),
                    width,
                    height
                );
                
                return {
                    success: true,
                    data: imageData
                };
            } finally {
                memoryManager.free(buffer);
            }
        } finally {
            pdfium.FPDF_ClosePage(page);
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle cleanup
function cleanup() {
    try {
        if (currentDocument) {
            pdfium.FPDF_CloseDocument(currentDocument);
            currentDocument = null;
        }
        
        if (pdfium) {
            pdfium.FPDF_DestroyLibrary();
            pdfium = null;
        }
        
        if (memoryManager) {
            memoryManager.cleanup();
            memoryManager = null;
        }
        
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Message handler
self.onmessage = async function(e) {
    const { type, data } = e.data;
    let response;
    
    try {
        switch (type) {
            case 'init':
                response = await initializePDFium();
                break;
                
            case 'loadPDF':
                response = await loadPDF(data.pdfData);
                break;
                
            case 'renderPage':
                response = await renderPage(data.pageNumber, data.scale);
                break;
                
            case 'cleanup':
                response = cleanup();
                break;
                
            default:
                response = {
                    success: false,
                    error: 'Unknown message type'
                };
        }
    } catch (error) {
        response = {
            success: false,
            error: error.message
        };
    }
    
    self.postMessage({
        type,
        ...response
    });
};
