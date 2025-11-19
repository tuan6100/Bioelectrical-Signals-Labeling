import {ipcMain, dialog} from "electron";
import {getSessionInfo} from "../../../domain/services/data/query/session.query.js";

ipcMain.removeHandler('session:getInfo')
ipcMain.handle('session:getInfo', (event, sessionId) => {
    try {
        return getSessionInfo(sessionId)
    } catch (error) {
        dialog.showErrorBox('Session Info Error', error.message || String(error))
        throw error
    }
})