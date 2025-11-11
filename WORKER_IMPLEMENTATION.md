# Worker Thread Implementation for Data Processing

## Overview
The `processAndStoreData` function now runs in a separate worker thread to prevent blocking the main Electron process during database operations.

## Architecture

### Files Created/Modified:

1. **store.data.worker.js** (NEW)
   - Worker thread entry point
   - Receives JSON data and output path
   - Calls `processAndStoreData`
   - Reports success/failure back to main thread

2. **main.js** (MODIFIED)
   - Creates worker thread instead of calling function directly
   - Listens for worker messages
   - Sends completion status to renderer

3. **preload.js** (MODIFIED)
   - Added `onStoreDataComplete` listener
   - Added `onDbStatus` listener

## How It Works

### Main Process Flow:
```javascript
1. User opens file via menu
2. File is read and parsed (readFile)
3. Worker thread is spawned with JSON data
4. Renderer receives data immediately for display (emg-data channel)
5. Worker processes and stores data in background
6. Worker sends completion message
7. Renderer receives completion status (store-data-complete channel)
```

### Using in Renderer (React):

```javascript
useEffect(() => {
    if (window.electron) {
        // Listen for data to display
        window.electron.onEmgData((data) => {
            console.log('Display this data:', data);
            setJsonData(data);
        });
        
        // Listen for storage completion
        window.electron.onStoreDataComplete((result) => {
            if (result.success) {
                console.log('Data stored successfully in database');
            } else {
                console.error('Storage failed:', result.error);
            }
        });
        
        // Listen for database initialization status
        window.electron.onDbStatus((status) => {
            if (status.ok) {
                console.log('Database initialized');
            } else {
                console.error('Database error:', status.message);
            }
        });
    }
}, []);
```

## Benefits

1. **Non-blocking**: UI remains responsive during large data imports
2. **Parallel processing**: Database operations don't freeze the main thread
3. **Error isolation**: Worker errors don't crash the main process
4. **Immediate feedback**: Users see data while it's being stored

## Error Handling

The worker catches all errors and sends them back to the main thread:
```javascript
{
    success: false,
    error: "Error message",
    stack: "Stack trace"
}
```

## Performance

- Large datasets can be processed without UI lag
- Multiple workers can be spawned for batch operations (future enhancement)
- Database operations are isolated from rendering

