// Memory management for PDFium WASM
class MemoryManager {
    constructor(wasmMemory) {
        this.memory = wasmMemory;
        this.allocations = new Map();  // Track allocations
        this.totalAllocated = 0;
        this.maxMemory = wasmMemory.buffer.byteLength;
    }

    // Allocate memory and track it
    allocate(size) {
        // Ensure we have enough memory
        if (this.totalAllocated + size > this.maxMemory) {
            throw new Error('Out of memory');
        }

        // Find free memory space
        let ptr = this.findFreeSpace(size);
        if (ptr === null) {
            throw new Error('Memory fragmentation error');
        }

        // Track the allocation
        this.allocations.set(ptr, {
            size: size,
            timestamp: Date.now()
        });
        this.totalAllocated += size;

        return ptr;
    }

    // Free allocated memory
    free(ptr) {
        const allocation = this.allocations.get(ptr);
        if (!allocation) {
            throw new Error('Invalid memory free attempt');
        }

        this.totalAllocated -= allocation.size;
        this.allocations.delete(ptr);
    }

    // Copy data into WASM memory
    copyToWasm(data) {
        const ptr = this.allocate(data.byteLength);
        new Uint8Array(this.memory.buffer).set(new Uint8Array(data), ptr);
        return ptr;
    }

    // Read data from WASM memory
    readFromWasm(ptr, size) {
        if (!this.allocations.has(ptr)) {
            throw new Error('Attempting to read from unallocated memory');
        }
        return new Uint8Array(this.memory.buffer, ptr, size);
    }

    // Find contiguous free memory space
    findFreeSpace(size) {
        // Simple first-fit algorithm
        let currentPtr = 0;
        const sortedAllocations = Array.from(this.allocations.entries())
            .sort(([a], [b]) => a - b);

        for (let i = 0; i < sortedAllocations.length; i++) {
            const [ptr, allocation] = sortedAllocations[i];
            if (ptr - currentPtr >= size) {
                return currentPtr;
            }
            currentPtr = ptr + allocation.size;
        }

        // Check if there's space after the last allocation
        if (this.maxMemory - currentPtr >= size) {
            return currentPtr;
        }

        return null;
    }

    // Cleanup old allocations
    cleanup(maxAge = 30000) { // Default 30 seconds
        const now = Date.now();
        for (const [ptr, allocation] of this.allocations.entries()) {
            if (now - allocation.timestamp > maxAge) {
                this.free(ptr);
            }
        }
    }

    // Get memory usage statistics
    getStats() {
        return {
            totalAllocated: this.totalAllocated,
            maxMemory: this.maxMemory,
            allocations: this.allocations.size,
            freeMemory: this.maxMemory - this.totalAllocated
        };
    }
}

// Export the memory manager
if (typeof window !== 'undefined') {
    window.PDFiumMemoryManager = MemoryManager;
} else {
    self.PDFiumMemoryManager = MemoryManager;
}
