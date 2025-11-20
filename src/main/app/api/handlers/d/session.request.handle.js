import {ipcMain, dialog} from "electron";
import {
    getSessionsByPage,
    getSessionInfo,
    getSessionsByPatientId
} from "@biosignal/app/domain/services/data/query/session.query.js";

ipcMain.removeHandler('session:getInfo')
ipcMain.handle('session:getInfo', (event, sessionId) => {
    try {
        return getSessionInfo(sessionId)
    } catch (error) {
        dialog.showErrorBox('Session Info Error', error.message || String(error))
        throw error
    }
})

ipcMain.removeHandler('sessions:getPage')
ipcMain.handle('sessions:getPage', (event, page, size) => {
    try {
        return getSessionsByPage(page, size)
    } catch (error) {
        dialog.showErrorBox('Sessions Page Error', error.message || String(error))
        throw error
    }
})

ipcMain.removeHandler('sessions:getByPatient')
ipcMain.handle('sessions:getByPatient', (event, patientId) => {
    try {
        return getSessionsByPatientId(patientId)
    } catch (error) {
        dialog.showErrorBox('Sessions By Patient Error', error.message || String(error))
        throw error
    }
})