// src/main/main.js
import { app, BrowserWindow, Menu, dialog, globalShortcut } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { readFile } from "./domain/services/file/reader/txt.reader.js"
import fs from "node:fs"
import {processAndPersistData} from "./domain/services/data/command/session.command.js"
import './api/handlers/index.js'
import {db} from "./persistence/connection/sqlite.connection.js";
import autoUpdater from "electron-updater";


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.NODE_ENV === 'dev'? 'http://localhost:5173': null

if (process.argv.includes('--delete-app-data')) {
    try {
        fs.rmSync(app.getPath('appData'), { recursive: true, force: true })
        process.exit(1)
    } catch (err) {
        console.error("Failed to clear user data:", err)
    }
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: `./public/favicon/biosignal.ico`,
        ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
        titleBarOverlay: {
            color: '#2f3241',
            symbolColor: '#74b1be',
            height: 60
        },
        titleBarStyle: 'customButtonsOnHover'
    })

    let lastOpenedDir = app.getPath('documents')
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
                        })
                        if (canceled || filePaths.length === 0) return
                        const inputPath = filePaths[0]
                        const outputBaseDir = app.getPath('userData')
                        const outputStorageDir = path.join(outputBaseDir, 'Local Storage')
                        const outputPath = path.join(outputStorageDir, 'data.json')

                        readFile(inputPath, outputPath).then((resolved) => {
                            function sendSessionId (sessionId) {
                                mainWindow.webContents.send("send:session-id", { sessionId, refresh: Date.now() });
                            }
                            if (resolved.json === null) {
                                console.log(`File already imported, session ID: ${resolved.sessionCode}`)
                                sendSessionId(resolved.sessionCode)
                            } else {
                                const sessionId = processAndPersistData(resolved.inputFileName, resolved.json, resolved.sessionCode)
                                console.log(`File imported successfully, session ID: ${sessionId}`)
                                sendSessionId(sessionId)
                            }
                        }).catch(err => {
                            console.error('Failed to read or process file:', err)
                            dialog.showErrorBox('Error occurred when reading the file', err.message || String(err))
                        }).finally(() => {
                            if (process.env.NODE_ENV !== 'dev') {
                                fs.writeFile(outputPath, '', () => {})
                            }
                            lastOpenedDir = path.dirname(inputPath)
                        })
                    },
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit()
                    },
                },
            ],
        },
    ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', '..', '..', 'dist', 'index.html'))
    }

    return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    const win = createWindow()
    try {
        db.initSchema()
        win.webContents.send('db-status', {ok: true})
    } catch (e) {
        console.error(e)
        win.webContents.send('db-status', {ok: false, message: e.message})
    }
    // Toggle full screen
    globalShortcut.register('F11', () => {
        win.setFullScreen(!win.isFullScreen())
    })
    // Open the DevTools.
    // if (process.env.NODE_ENV === 'dev') {
    //     globalShortcut.register('Ctrl+F12', () => {
    //         win.webContents.toggleDevTools()
    //     })
    // }
    globalShortcut.register('Ctrl+F12', () => {
        win.webContents.toggleDevTools()
    })

})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    db.close()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('ready', async function()  {
    await autoUpdater.checkForUpdatesAndNotify();
})


