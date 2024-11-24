class PDFViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.pdfDoc = null;
        this.setupUI();
        this.loadPDFjs();
    }

    async loadPDFjs() {
        // Load PDF.js dynamically
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            // Configure worker
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        };
        document.head.appendChild(script);
    }

    setupUI() {
        // Create viewer container
        const viewerContainer = document.createElement('div');
        viewerContainer.className = 'pdf-viewer-container';

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'pdf-toolbar';

        // File input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.style.display = 'none';
        fileInput.id = 'pdf-file-input';

        const openButton = document.createElement('button');
        openButton.textContent = 'Open PDF';
        openButton.onclick = () => fileInput.click();

        // Navigation controls
        const prevButton = document.createElement('button');
        prevButton.textContent = '← Previous';
        prevButton.onclick = () => this.previousPage();

        // Page navigation with input
        const pageNavContainer = document.createElement('div');
        pageNavContainer.className = 'page-nav-container';

        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.min = '1';
        pageInput.value = '1';
        pageInput.className = 'page-input';
        this.pageInput = pageInput;

        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = 'of 0';
        this.pageInfo = pageInfo;

        const goButton = document.createElement('button');
        goButton.textContent = 'Go';
        goButton.onclick = () => this.goToPage(parseInt(pageInput.value));

        pageNavContainer.appendChild(pageInput);
        pageNavContainer.appendChild(pageInfo);
        pageNavContainer.appendChild(goButton);

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next →';
        nextButton.onclick = () => this.nextPage();

        // Zoom controls
        const zoomContainer = document.createElement('div');
        zoomContainer.className = 'zoom-container';

        const zoomOutButton = document.createElement('button');
        zoomOutButton.textContent = '−';
        zoomOutButton.onclick = () => this.zoom(-0.25);

        const zoomSelect = document.createElement('select');
        zoomSelect.className = 'zoom-select';
        const zoomLevels = [
            { value: 0.5, label: '50%' },
            { value: 0.75, label: '75%' },
            { value: 0.9, label: '90%' },
            { value: 1, label: '100%' },
            { value: 1.25, label: '125%' },
            { value: 1.5, label: '150%' },
            { value: 1.75, label: '175%' },
            { value: 2, label: '200%' }
        ];
        
        zoomLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.value;
            option.textContent = level.label;
            if (level.value === 1) option.selected = true;
            zoomSelect.appendChild(option);
        });

        zoomSelect.onchange = (e) => this.setZoom(parseFloat(e.target.value));
        this.zoomSelect = zoomSelect;

        const zoomInButton = document.createElement('button');
        zoomInButton.textContent = '+';
        zoomInButton.onclick = () => this.zoom(0.25);

        zoomContainer.appendChild(zoomOutButton);
        zoomContainer.appendChild(zoomSelect);
        zoomContainer.appendChild(zoomInButton);

        // Add elements to toolbar
        toolbar.appendChild(openButton);
        toolbar.appendChild(prevButton);
        toolbar.appendChild(pageNavContainer);
        toolbar.appendChild(nextButton);
        toolbar.appendChild(zoomContainer);

        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'pdf-canvas-container';
        this.canvasContainer = canvasContainer;

        // Add everything to the viewer
        viewerContainer.appendChild(toolbar);
        viewerContainer.appendChild(canvasContainer);
        viewerContainer.appendChild(fileInput);
        this.container.appendChild(viewerContainer);

        // Setup file input handler
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.loadPDF(file);
            }
        });

        // Setup keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousPage();
            } else if (e.key === 'ArrowRight') {
                this.nextPage();
            }
        });

        // Setup page input enter key handler
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.goToPage(parseInt(pageInput.value));
            }
        });
    }

    async loadPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPage = 1;
            this.updatePageInfo();
            await this.renderCurrentPage();
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Failed to load PDF. Please try another file.');
        }
    }

    async renderCurrentPage() {
        if (!this.pdfDoc) return;

        try {
            // Get the page
            const page = await this.pdfDoc.getPage(this.currentPage);

            // Calculate viewport
            const viewport = page.getViewport({ scale: this.scale });

            // Prepare canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Clear previous content and add new canvas
            this.canvasContainer.innerHTML = '';
            this.canvasContainer.appendChild(canvas);
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageInfo();
            await this.renderCurrentPage();
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePageInfo();
            await this.renderCurrentPage();
        }
    }

    async goToPage(pageNum) {
        // Ensure pageNum is within valid range
        pageNum = Math.max(1, Math.min(pageNum, this.totalPages || 1));
        if (this.currentPage !== pageNum) {
            this.currentPage = pageNum;
            this.updatePageInfo();
            await this.renderCurrentPage();
        }
    }

    updatePageInfo() {
        if (this.pageInfo) {
            this.pageInfo.textContent = `of ${this.totalPages}`;
        }
        if (this.pageInput) {
            this.pageInput.value = this.currentPage;
            this.pageInput.max = this.totalPages;
        }
    }

    async setZoom(scale) {
        this.scale = scale;
        await this.renderCurrentPage();
        if (this.zoomSelect) {
            this.zoomSelect.value = scale;
        }
    }

    async zoom(delta) {
        const newScale = Math.max(0.1, Math.min(5.0, this.scale + delta));
        await this.setZoom(newScale);
    }
}

// Initialize viewer when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new PDFViewer('pdf-viewer');
});
