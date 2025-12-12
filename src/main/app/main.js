// src/main/main.js
import {app, BrowserWindow, Menu, globalShortcut, dialog} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import './api/handlers/index.js'
import {db} from "./persistence/connection/sqlite.connection.js";
import pkg from 'electron-updater';
import {setMenuTemplate} from "./presentation/menu.js";
const { autoUpdater } = pkg;


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.NODE_ENV === 'dev'? 'http://localhost:5173': null
const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            spellcheck: true,
        },
        icon: `./public/favicon/biosignal.ico`,
        titleBarOverlay: {
            color: '#2f3241',
            symbolColor: '#74b1be',
            height: 60
        },
        titleBarStyle: 'customButtonsOnHover'
    })

    const defaultDir = app.getPath('documents')
    const menu = Menu.buildFromTemplate(setMenuTemplate(mainWindow, defaultDir))
    Menu.setApplicationMenu(menu)

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', '..', '..', 'dist', 'index.html'))
    }

    //spell checker
    mainWindow.webContents.session.setSpellCheckerLanguages(['en-US', 'vi', 'fr',])

    return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async() => {
    autoUpdater.autoDownload = true
    autoUpdater.autoRunAppAfterInstall = true
    autoUpdater.allowPrerelease = true
    if (process.env.NODE_ENV === 'dev') {
        autoUpdater.forceDevUpdateConfig = true
        autoUpdater.updateConfigPath = path.join(__dirname, '..', '..','..', 'dev-app-update.yml')
    } else {
        // Only check for updates in production
        await autoUpdater.checkForUpdatesAndNotify()
    }
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

    //Open the DevTools.
    if (process.env.NODE_ENV === 'dev') {
        globalShortcut.register('Ctrl+F12', async () => {
            win.webContents.toggleDevTools()
        })
    }


})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    db.close()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Auto Updater Events
autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBoxSync({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. The application will now restart to apply the update.',
        buttons: ['OK']
    })
    autoUpdater.quitAndInstall();
});



