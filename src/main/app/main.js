// src/main/main.js
import { app, BrowserWindow, Menu, dialog, globalShortcut } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from "@biosignal/app/domain/services/file/reader/txt.reader.js"
import fs from "fs"
import {processAndPersistData} from "@biosignal/app/domain/services/data/command/session.command.js"
import * as handlers from '@biosignal/app/api/handlers'
import {updateElectronApp} from "update-electron-app";
import {db} from "@biosignal/app/persistence/connection/sqlite.connection.js";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Fix for top-level return in `src/main/app/main.js`

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
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
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
    }

    return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
    const win = createWindow()
    try {
        db.initSchema()
    } catch (e) {
        console.error(e)
    }
    // Toggle full screen
    globalShortcut.register('F11', () => {
        win.setFullScreen(!win.isFullScreen())
    })
    // Open the DevTools.
    if (process.env.NODE_ENV === 'dev') {
        globalShortcut.register('Ctrl+F12',  () => {
            win.webContents.toggleDevTools()
        })
    }
    win.webContents.session.setSpellCheckerLanguages(['en-US', 'vi'])
    app.setAppLogsPath(app.getPath("userData"))
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', async () => {
    db.close()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

updateElectronApp()

