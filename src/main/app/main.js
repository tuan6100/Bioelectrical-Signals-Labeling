// src/main/main.js
import { app, BrowserWindow, Menu, dialog, globalShortcut } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { fileURLToPath } from 'node:url';
import { Worker } from 'worker_threads';
import db from "./persistence/connection/sqlite.connection.js";
import { readFile } from "./domain/services/file/reader/txt.reader.js";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegrationInWorker: true
        },
    });

    let lastOpenedDir = app.getPath('documents');
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                            title: 'Open Text File',
                            defaultPath: lastOpenedDir,
                            properties: ['openFile'],
                            filters: [{ name: 'Text Files', extensions: ['txt'] }],
                        });
                        if (canceled || filePaths.length === 0) return;
                        const inputPath = filePaths[0];
                        const outputBaseDir = app.getPath('userData');
                        const outputStorageDir = path.join(outputBaseDir, 'Local Storage');
                        const outputPath = path.join(outputStorageDir, 'data.json');
                        try {
                            const json  = readFile(inputPath, outputPath);
                            const workerPath = './src/main/app/domain/services/data/received/store.data.worker.js'
                            const worker = new Worker(workerPath, {
                                workerData: { json, outputPath }
                            });
                            worker.on('message', (result) => {
                                if (result.success) {
                                    console.log('Data stored successfully in worker thread');
                                    mainWindow.webContents.send("store-data-complete", { success: true });
                                } else {
                                    console.error('Worker thread failed:', result.error);
                                    mainWindow.webContents.send("store-data-complete", {
                                        success: false,
                                        error: result.error
                                    });
                                }
                            });

                            worker.on('error', (error) => {
                                console.error('Worker thread error:', error);
                                mainWindow.webContents.send("store-data-complete", {
                                    success: false,
                                    error: error.message
                                });
                            });

                            worker.on('exit', (code) => {
                                if (code !== 0) {
                                    console.error(`Worker stopped with exit code ${code}`);
                                }
                            });
                            mainWindow.webContents.send("emg-data", json);
                        } catch (err) {
                            console.error('Failed to read or process file:', err);
                        } finally {
                            lastOpenedDir = path.dirname(inputPath);
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit();
                    },
                },
            ],
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    return mainWindow
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    const win = createWindow();
    try {
        db.initSchema();
        win.webContents.send('db-status', { ok: true });
    } catch (e) {
        console.error(e);
        win.webContents.send('db-status', { ok: false, message: e.message });
    }
    // Toggle full screen
    globalShortcut.register('F11', () => {
        win.setFullScreen(!win.isFullScreen());
    })
    // Open the DevTools.
    if (process.env.BUILD_TYPE === 'dev') {
        globalShortcut.register('Ctrl+F12',  () => {
            win.webContents.toggleDevTools();
        })
    }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
