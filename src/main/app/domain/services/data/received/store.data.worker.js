import { parentPort, workerData } from 'worker_threads';
import { processAndStoreData } from './store.data.received.js';

// Worker thread entry point
try {
    const { json, outputPath } = workerData;

    console.log('Worker thread started processing data...');
    processAndStoreData(json, outputPath);
    console.log('Worker thread completed processing data');

    // Send success message back to main thread
    parentPort.postMessage({ success: true });
} catch (error) {
    console.error('Worker thread error:', error);
    // Send error message back to main thread
    parentPort.postMessage({
        success: false,
        error: error.message,
        stack: error.stack
    });
}

