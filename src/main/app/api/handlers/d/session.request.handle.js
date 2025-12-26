import {ipcMain, dialog, app, BrowserWindow} from "electron";
import {
    getAllSessions,
    getSessionInfo,
    getSessionsByPatientId
} from "../../../domain/services/data/query/session.query.js";
import {
    updateSessionStatus,
    setChannelDoubleChecked,
    enableDoubleCheckMode, deleteSession, disableDoubleCheckMode
} from "../../../domain/services/data/command/session.command.js";
import Store from "electron-store";
import path from "node:path";
import {processTxtFiles} from "../../../domain/services/file/reader/txt.reader.js";
import {processExcelFiles} from "../../../domain/services/file/reader/excel.reader.js";
import fs from "node:fs";

ipcMain.removeHandler('session:getInfo')
ipcMain.handle('session:getInfo', (event, sessionId) => {
    try {
        return getSessionInfo(sessionId)
    } catch (error) {
        dialog.showErrorBox('Error when loading workspace data of the session', error.message || String(error))
    }
})

ipcMain.removeHandler('sessions:getPage')
ipcMain.handle('sessions:getPage', (event) => {
    try {
        return getAllSessions()
    } catch (error) {
        dialog.showErrorBox('Sessions Page Error', error.message || String(error))
    }
})

ipcMain.removeHandler('sessions:getByPatient')
ipcMain.handle('sessions:getByPatient', (event, patientId) => {
    try {
        return getSessionsByPatientId(patientId)
    } catch (error) {
        dialog.showErrorBox('Sessions By Patient Error', error.message || String(error))
    }
})

ipcMain.removeHandler('session:updateStatus')
ipcMain.handle('session:updateStatus', (event, sessionId, newStatus) => {
    try {
        updateSessionStatus(sessionId, newStatus)
    } catch (error) {
        dialog.showErrorBox('Update Session Status Error', error.message || String(error))
        throw error
    }
})

ipcMain.removeHandler('channel:enableDoubleCheck')
ipcMain.handle('channel:enableDoubleCheck', (event, channelId) => {
    try {
        enableDoubleCheckMode(channelId);
        return true;
    } catch (error) {
        dialog.showErrorBox('Enable Double Check Error', error.message || String(error));
        throw error;
    }
});

ipcMain.removeHandler('channel:disableDoubleCheck')
ipcMain.handle('channel:disableDoubleCheck', (event, channelId) => {
    try {
        disableDoubleCheckMode(channelId);
        return true;
    } catch (error) {
        dialog.showErrorBox('Disable Double Check Error', error.message || String(error));
        throw error;
    }
});

ipcMain.removeHandler('channel:setDoubleChecked')
ipcMain.handle('channel:setDoubleChecked', (event, sessionId, channelId, isChecked) => {
    try {
        setChannelDoubleChecked(sessionId, channelId, isChecked);
        return true;
    } catch (error) {
        console.error('Set Channel Double Checked Error', error);
        throw error;
    }
});

ipcMain.removeHandler('session:delete')
ipcMain.handle('session:delete', (event, sessionId) => {
    try {
        deleteSession(sessionId);
        return true;
    } catch (error) {
        dialog.showErrorBox('Delete Session Error', error.message || String(error));
        throw error;
    }
});

ipcMain.removeHandler('file:importRaw')
ipcMain.handle("file:importRaw", async (event) => {
    const window = BrowserWindow.getFocusedWindow()
    const store = new Store();
    const defaultDir = app.getPath('documents');
    let lastOpenedDir = store.get('userPreferences.lastRawDir') ?? defaultDir;
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Import Raw Signal Files',
        defaultPath: lastOpenedDir,
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
    })
    if (canceled || filePaths.length === 0) return;
    store.set('userPreferences.lastRawDir', path.dirname(filePaths[0]));
    await processTxtFiles(window, filePaths);
});

ipcMain.removeHandler('file:importReviewed')
ipcMain.handle("file:importReviewed", async (event) => {
    const window = BrowserWindow.getFocusedWindow()
    const store = new Store();
    const defaultDir = app.getPath('documents');
    let lastOpenedDir = store.get('userPreferences.lastExcelDir') ?? defaultDir;
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Import Reviewed Excel Files',
        defaultPath: lastOpenedDir,
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    })
    if (canceled || filePaths.length === 0) return;
    store.set('userPreferences.lastExcelDir', path.dirname(filePaths[0]));
    await processExcelFiles(window, filePaths);
});

ipcMain.removeHandler('file:openFolder')
ipcMain.handle("file:openFolder", async (event) => {
    const window = BrowserWindow.getFocusedWindow()
    const store = new Store()
    const defaultDir = app.getPath('documents')
    let lastOpenedDir = store.get('userPreferences.lastOpenedDir')?? defaultDir
    const getAllFiles = async (dir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true })
        const files = await Promise.all(entries.map(entry => {
            const res = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                return getAllFiles(res)
            }
            return res.endsWith('.txt') ? res : null
        }))
        return files.flat().filter(Boolean)
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Open Folder',
        defaultPath: lastOpenedDir,
        properties: ['openDirectory'],
    })
    if (canceled || !filePaths || filePaths.length === 0) {
        return
    }
    const folderPath = filePaths[0]
    lastOpenedDir = folderPath
    try {
        const filesInFolder = await getAllFiles(folderPath)
        const txtFiles = filesInFolder.filter(f => typeof f === 'string' && f.toLowerCase().endsWith('.txt'))
        const xlsxFiles = filesInFolder.filter(f => typeof f === 'string' && f.toLowerCase().endsWith('.xlsx'))
        if (txtFiles.length === 0 && xlsxFiles.length === 0) {
            await dialog.showMessageBox(window, {
                type: 'info',
                title: 'No Supported Files Found',
                message: 'The selected folder and its subdirectories contain no .txt or .xlsx files.',
            })
            return
        }
        store.set('userPreferences.lastOpenedDir', lastOpenedDir)
        if (txtFiles.length > 0) {
            await processTxtFiles(window, txtFiles)
        }
        if (xlsxFiles.length > 0) {
            await processExcelFiles(window, xlsxFiles)
        }
    } catch (err) {
        console.error('Error reading folder:', err)
        dialog.showErrorBox('Error Reading Folder', `An error occurred while reading the folder: ${err.message}`)
    }
});