// src/main/main.js
import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { readFile } from './data/data_reader.js';
import { fileURLToPath } from 'node:url';
import db from "./persistent/connection/sqlite.connection.js";

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
                        const filePath = filePaths[0];
                        try {
                            const json  = readFile(filePath);
                            lastOpenedDir = path.dirname(filePath);
                            mainWindow.webContents.send("emg-data", json);
                        } catch (err) {
                            console.error('Failed to read file:', err);
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

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    const win = createWindow();
    try {
        db.initSchema();
        console.log('Database schema initialized.');
    } catch (err) {
        console.error('Failed to initialize database schema:', err);
        win.webContents.send('db-error', { message: 'Database initialization failed.' });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
