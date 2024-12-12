/**
 * PDF Viewer Component
 * 
 * A self-contained PDF viewer component that provides a complete interface for viewing
 * and interacting with PDF documents. Built on top of PDF.js library.
 * 
 * Features:
 * - PDF file loading and rendering
 * - Page navigation (next/previous, direct page access)
 * - Zoom controls (preset levels and custom zoom)
 * - Page rotation
 * - Keyboard navigation support
 * - Responsive canvas rendering
 * 
 * Dependencies:
 * - PDF.js library and worker (loaded dynamically from lib/pdf.js/)
 * 
 * Usage:
 * new PDFViewer('container-id');
 * 
 * @version 1.0
 */

class PDFViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.rotation = 0; // 0, 90, 180, or 270 degrees
        this.pdfDoc = null;
        this.searchResults = null;
        this.currentSearchIndex = 0;
        // In UMD build, these components are not directly available
        // We'll handle events directly for now
        this.setupUI();
    }

    setupUI() {
        // Create viewer container
        const viewerContainer = document.createElement('div');
        viewerContainer.className = 'pdf-viewer-container';

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'pdf-toolbar';

        // Create top row
        const topRow = document.createElement('div');
        topRow.className = 'pdf-toolbar-row';

        // File controls
        const fileGroup = document.createElement('div');
        fileGroup.className = 'control-group';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.style.display = 'none';
        fileInput.id = 'pdf-file-input';

        const openButton = document.createElement('button');
        openButton.textContent = 'Open PDF';
        openButton.onclick = () => fileInput.click();

        fileGroup.appendChild(fileInput);
        fileGroup.appendChild(openButton);

        // Navigation controls
        const navGroup = document.createElement('div');
        navGroup.className = 'control-group';

        const prevButton = document.createElement('button');
        prevButton.textContent = '← Previous';
        prevButton.onclick = () => this.previousPage();

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

        navGroup.appendChild(prevButton);
        navGroup.appendChild(pageNavContainer);
        navGroup.appendChild(nextButton);

        // Zoom controls
        const zoomGroup = document.createElement('div');
        zoomGroup.className = 'control-group';

        const zoomOutButton = document.createElement('button');
        zoomOutButton.textContent = '−';
        zoomOutButton.onclick = () => this.zoom(-0.05);

        const zoomSelect = document.createElement('select');
        zoomSelect.className = 'zoom-select';

        const zoomLevels = [
            { value: 0.5, label: '50%' },
            { value: 0.6, label: '60%' },
            { value: 0.75, label: '75%' },
            { value: 0.9, label: '90%' },
            { value: 1, label: '100%' },
            { value: 1.25, label: '125%' },
            { value: 1.5, label: '150%' },
            { value: 1.75, label: '175%' },
            { value: 2, label: '200%' },
            { value: 2.5, label: '250%' }
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
        zoomInButton.onclick = () => this.zoom(0.05);

        // Custom zoom input
        const customZoomContainer = document.createElement('div');
        customZoomContainer.className = 'custom-zoom-container';

        const customZoomInput = document.createElement('input');
        customZoomInput.type = 'number';
        customZoomInput.min = '10';
        customZoomInput.max = '500';
        customZoomInput.value = '100';
        customZoomInput.className = 'custom-zoom-input';
        this.customZoomInput = customZoomInput;

        const customZoomButton = document.createElement('button');
        customZoomButton.textContent = 'Set';
        customZoomButton.onclick = () => {
            const zoomValue = parseInt(customZoomInput.value) / 100;
            if (zoomValue >= 0.1 && zoomValue <= 5) {
                this.setZoom(zoomValue);
            }
        };

        customZoomContainer.appendChild(customZoomInput);
        customZoomContainer.appendChild(customZoomButton);

        zoomGroup.appendChild(zoomOutButton);
        zoomGroup.appendChild(zoomSelect);
        zoomGroup.appendChild(zoomInButton);
        zoomGroup.appendChild(customZoomContainer);

        // Add groups to top row
        topRow.appendChild(fileGroup);
        topRow.appendChild(navGroup);
        topRow.appendChild(zoomGroup);

        // Create bottom row
        const bottomRow = document.createElement('div');
        bottomRow.className = 'pdf-toolbar-row';

        // Rotation controls
        const rotateGroup = document.createElement('div');
        rotateGroup.className = 'control-group';

        const rotateLeftButton = document.createElement('button');
        rotateLeftButton.textContent = '↻';
        rotateLeftButton.onclick = () => this.rotate(-90);

        const rotateRightButton = document.createElement('button');
        rotateRightButton.textContent = '↺';
        rotateRightButton.onclick = () => this.rotate(90);

        rotateGroup.appendChild(rotateLeftButton);
        rotateGroup.appendChild(rotateRightButton);

        // Search controls
        const searchGroup = this.createSearchControls();

        // Add groups to bottom row
        bottomRow.appendChild(rotateGroup);
        bottomRow.appendChild(searchGroup);

        // Add rows to toolbar
        toolbar.appendChild(topRow);
        toolbar.appendChild(bottomRow);

        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'pdf-canvas-container';
        this.canvasContainer = canvasContainer;

        // Add everything to the viewer
        viewerContainer.appendChild(toolbar);
        viewerContainer.appendChild(canvasContainer);
        viewerContainer.appendChild(fileInput);
        this.container.appendChild(viewerContainer);

        // Setup keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousPage();
            } else if (e.key === 'ArrowRight') {
                this.nextPage();
            }
        });

        // Setup page input enter key handler
        this.pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.goToPage(parseInt(this.pageInput.value));
            }
        });

        // Setup file input handler
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.loadPDF(file);
            }
        });

        this.initSearch();
    }

    createSearchControls() {
        const searchGroup = document.createElement('div');
        searchGroup.className = 'control-group';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Search...';

        const searchButton = document.createElement('button');
        searchButton.textContent = '🔍';
        searchButton.title = 'Search';
        searchButton.id = 'searchButton';

        const prevMatchButton = document.createElement('button');
        prevMatchButton.textContent = '↑';
        prevMatchButton.title = 'Previous match';
        prevMatchButton.id = 'prevMatch';

        const nextMatchButton = document.createElement('button');
        nextMatchButton.textContent = '↓';
        nextMatchButton.title = 'Next match';
        nextMatchButton.id = 'nextMatch';

        const clearSearchButton = document.createElement('button');
        clearSearchButton.textContent = '×';
        clearSearchButton.title = 'Clear search';
        clearSearchButton.onclick = () => {
            searchInput.value = '';
            this.clearSearch();
        };

        const resultsCount = document.createElement('span');
        resultsCount.className = 'search-results';

        searchGroup.appendChild(searchInput);
        searchGroup.appendChild(searchButton);
        searchGroup.appendChild(prevMatchButton);
        searchGroup.appendChild(nextMatchButton);
        searchGroup.appendChild(clearSearchButton);
        searchGroup.appendChild(resultsCount);

        return searchGroup;
    }

    clearSearch() {
        this.searchResults = null;
        this.currentSearchIndex = 0;
        const resultsCount = document.querySelector('.search-results');
        if (resultsCount) {
            resultsCount.textContent = '';
        }
        // Re-render current page without highlights
        if (this.currentPage) {
            this.renderPage(this.currentPage);
        }
    }

    async loadPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            this.totalPages = this.pdfDoc.numPages;
            this.pageInfo.textContent = `of ${this.totalPages}`;
            this.pageInput.max = this.totalPages;
            await this.renderPage(1);
        } catch (error) {
            console.error('Error loading PDF:', error);
        }
    }

    async renderPage(pageNum, highlightMatches = true) {
        if (!this.pdfDoc) return;

        try {
            const page = await this.pdfDoc.getPage(pageNum);
            this.currentPage = pageNum;

            const viewport = page.getViewport({ 
                scale: this.scale,
                rotation: this.rotation 
            });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;

            this.canvasContainer.innerHTML = '';
            this.canvasContainer.appendChild(canvas);
            this.canvasContainer.appendChild(textLayerDiv);

            // Render page first
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                annotationMode: 2
            };

            await page.render(renderContext).promise;

            // Then handle text layer
            const textContent = await page.getTextContent();
            
            // Render text layer
            const renderTask = pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: [],
                enhanceTextSelection: true
            });

            await renderTask.promise;

            // Add highlights after text layer is rendered
            if (this.searchResults && this.searchResults.length > 0 && highlightMatches) {
                const currentPageResults = this.searchResults.filter(r => r.pageNum === pageNum);
                const searchText = document.querySelector('.search-input')?.value?.toLowerCase();
                
                if (currentPageResults.length > 0 && searchText) {
                    textLayerDiv.querySelectorAll('span').forEach(span => {
                        if (span.textContent.toLowerCase().includes(searchText)) {
                            span.classList.add('highlight');
                        }
                    });
                }
            }

            // Update page counter
            const counter = document.querySelector('.page-counter');
            if (counter) {
                counter.textContent = `${pageNum} / ${this.pdfDoc.numPages}`;
            }

        } catch (error) {
            console.error('Error rendering page:', error);
        }
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageInfo();
            await this.renderPage(this.currentPage);
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePageInfo();
            await this.renderPage(this.currentPage);
        }
    }

    async goToPage(pageNum) {
        // Ensure pageNum is within valid range
        pageNum = Math.max(1, Math.min(pageNum, this.totalPages || 1));
        if (this.currentPage !== pageNum) {
            this.currentPage = pageNum;
            this.updatePageInfo();
            await this.renderPage(pageNum);
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
        await this.renderPage(this.currentPage);
        if (this.zoomSelect) {
            this.zoomSelect.value = scale;
        }
    }

    async zoom(delta) {
        const newScale = Math.max(0.1, Math.min(5.0, this.scale + delta));
        await this.setZoom(newScale);
    }

    rotate(degrees) {
        // Normalize to 0, 90, 180, or 270
        this.rotation = (this.rotation + degrees) % 360;
        if (this.rotation < 0) this.rotation += 360;
        this.renderPage(this.currentPage);
    }

    async search(query, options = {}) {
        if (!query || !this.pdfDoc) {
            return;
        }

        try {
            // Get all text content from current page
            const page = await this.pdfDoc.getPage(this.currentPage);
            const textContent = await page.getTextContent();

            // Clear previous highlights
            const textLayer = this.canvasContainer.querySelector('.textLayer');
            if (textLayer) {
                const highlights = textLayer.querySelectorAll('.highlight');
                highlights.forEach(h => h.classList.remove('highlight'));
            }

            // Search and highlight matches
            const matches = [];
            textContent.items.forEach((item, index) => {
                if (item.str.toLowerCase().includes(query.toLowerCase())) {
                    const textDivs = textLayer.children;
                    if (textDivs[index]) {
                        textDivs[index].classList.add('highlight');
                        matches.push(item);
                    }
                }
            });

            console.log(`Found ${matches.length} matches for "${query}" on page ${this.currentPage}`);
            return matches.length > 0;
        } catch (error) {
            console.error('Error searching PDF:', error);
            return false;
        }
    }

    async searchDocument(query) {
        if (!this.pdfDoc || !query) return;

        const results = [];
        const numPages = this.pdfDoc.numPages;

        // Search through all pages
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            // Find all matches in this page
            let match;
            const regex = new RegExp(query, 'gi');
            while ((match = regex.exec(text)) !== null) {
                results.push({
                    pageNum,
                    text: match[0],
                    index: match.index
                });
            }
        }

        // Display results count
        const resultsCount = document.querySelector('.search-results');
        if (resultsCount) {
            resultsCount.textContent = `${results.length} matches found`;
        }

        // Store results and render first match
        this.searchResults = results;
        this.currentSearchIndex = 0;

        if (results.length > 0) {
            await this.renderPage(results[0].pageNum);
        }
    }

    async nextSearchResult() {
        if (!this.searchResults || this.searchResults.length === 0) return;

        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        const result = this.searchResults[this.currentSearchIndex];
        await this.renderPage(result.pageNum);
    }

    async previousSearchResult() {
        if (!this.searchResults || this.searchResults.length === 0) return;

        this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        const result = this.searchResults[this.currentSearchIndex];
        await this.renderPage(result.pageNum);
    }

    initSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchButton = document.querySelector('#searchButton');
        const prevButton = document.querySelector('#prevMatch');
        const nextButton = document.querySelector('#nextMatch');

        if (searchInput) {
            // Only handle Enter key press
            searchInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    await this.searchDocument(searchInput.value);
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', async () => {
                const query = searchInput?.value || '';
                await this.searchDocument(query);
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => this.previousSearchResult());
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextSearchResult());
        }
    }
}

// Initialize viewer when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new PDFViewer('pdf-viewer');
});
