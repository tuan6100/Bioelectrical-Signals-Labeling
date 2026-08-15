import {app, BrowserWindow, dialog, globalShortcut} from 'electron'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import fs from 'fs';
import './api/handlers/index.js'
import {db} from "./persistence/connection/sqlite.connection.js";
import pkg from 'electron-updater';
import {initSchema, isDbInitialized, migrateSchema} from "./domain/utils/version-management.util.js";
import log from 'electron-log';
import appConfig from "./config.js";
import {lookup} from "node:dns/promises";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


log.initialize()
log.transports.file.getFile()
Object.assign(console, log.functions)

const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.NODE_ENV === 'dev' ? 'http://localhost:5173' : null

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1280,
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
        title: 'Biosignal Labeling app version ' + app.getVersion(),
        titleBarStyle: 'customButtonsOnHover'
    })

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', '..', '..', 'dist', 'index.html'))
    }

    mainWindow.setMenu(null)

    //spell checker
    mainWindow.webContents.session.setSpellCheckerLanguages(['en-US', 'vi', 'fr'])

    return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async() => {
    try {
        renameApp();
        autoUpdater.autoDownload = false;
        autoUpdater.autoRunAppAfterInstall = true
        if (process.env.NODE_ENV === 'dev') {
            const updateForDevEnv =  appConfig.has('update.force') ? Boolean(appConfig.get('update.force')) : false
            if (updateForDevEnv) {
                autoUpdater.forceDevUpdateConfig = updateForDevEnv
                autoUpdater.updateConfigPath = path.join(__dirname, '..', '..','..', 'dev-app-update.yml')
            }
        }
        await autoUpdater.checkForUpdates()
        if (!isDbInitialized()) {
            console.log('Database not initialized')
            initSchema()
        } else {
            await migrateSchema();
        }

        const win = createWindow()

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

    } catch (error) {
        console.error('Error during app initialization:', error)
        dialog.showErrorBox('Initialization Error', `Failed to initialize app: ${error.message}`)
        app.quit()
    }
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    try {
        db.close()
    } catch (error) {
        console.error('Error closing database:', error)
    }
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

async function checkInternet() {
    try {
        await lookup('google.com')
        return true;
    } catch (error) {
        return false;
    }
}

const { autoUpdater } = pkg

checkInternet().then(() => {


}).catch(() => console.warn("Network is unreachable. Skip update check"))


autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBoxSync({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. The application will now restart to apply the update.',
        buttons: ['OK']
    })
    migrateSchema().finally(() => {
        autoUpdater.quitAndInstall()
    })
})
