// PDFium wrapper class for managing PDF operations
class PDFiumWrapper {
    constructor() {
        this.module = null;
        this.initialized = false;
        this.currentDocument = null;
        this.pageCache = new Map();
        this.maxCacheSize = 5;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.module = PDFiumModule;
            this.module.FPDF_InitLibrary();
            this.initialized = true;
            console.log('PDFium initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PDFium:', error);
            throw error;
        }
    }

    async loadDocument(arrayBuffer) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Clean up previous document
            if (this.currentDocument) {
                this.module.FPDF_CloseDocument(this.currentDocument);
                this.currentDocument = null;
                this.pageCache.clear();
            }

            // Create a copy of the array buffer
            const buffer = new ArrayBuffer(arrayBuffer.byteLength);
            new Uint8Array(buffer).set(new Uint8Array(arrayBuffer));

            // Load the document
            this.currentDocument = this.module.FPDF_LoadMemDocument(buffer, buffer.byteLength, '');
            
            return {
                pageCount: this.module.FPDF_GetPageCount(this.currentDocument)
            };
        } catch (error) {
            console.error('Failed to load document:', error);
            throw error;
        }
    }

    async renderPage(pageNumber, scale = 1.0) {
        if (!this.currentDocument) {
            throw new Error('No document loaded');
        }

        try {
            const cacheKey = `${pageNumber}-${scale}`;
            if (this.pageCache.has(cacheKey)) {
                return this.pageCache.get(cacheKey);
            }

            // Load the page
            const page = this.module.FPDF_LoadPage(this.currentDocument, pageNumber - 1);
            if (!page) {
                throw new Error(`Failed to load page ${pageNumber}`);
            }

            // Get page dimensions
            const width = this.module.FPDF_GetPageWidth(page);
            const height = this.module.FPDF_GetPageHeight(page);

            // Create canvas with proper dimensions
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            // Get canvas context
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(canvas.width, canvas.height);

            // Create bitmap buffer
            const bitmapSize = canvas.width * canvas.height * 4;
            const bitmap = new Uint8ClampedArray(bitmapSize);

            // Render the page
            this.module.FPDF_RenderPageBitmap(
                bitmap,
                page,
                0,
                0,
                canvas.width,
                canvas.height,
                0,
                0
            );

            // Copy bitmap to image data
            imageData.data.set(bitmap);
            ctx.putImageData(imageData, 0, 0);

            // Cache the rendered page
            this.pageCache.set(cacheKey, canvas);
            this.maintainCacheSize();

            // Cleanup
            this.module.FPDF_ClosePage(page);

            return canvas;
        } catch (error) {
            console.error(`Failed to render page ${pageNumber}:`, error);
            throw error;
        }
    }

    maintainCacheSize() {
        if (this.pageCache.size > this.maxCacheSize) {
            const oldestKey = this.pageCache.keys().next().value;
            this.pageCache.delete(oldestKey);
        }
    }

    cleanup() {
        if (this.currentDocument) {
            this.module.FPDF_CloseDocument(this.currentDocument);
            this.currentDocument = null;
        }
        this.pageCache.clear();
        if (this.initialized) {
            this.module.FPDF_DestroyLibrary();
            this.initialized = false;
        }
    }
}

// Export the wrapper
if (typeof window !== 'undefined') {
    window.PDFiumWrapper = PDFiumWrapper;
}
