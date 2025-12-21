import {ipcMain, dialog} from "electron";
import {
    getSessionInfo,
    getSessionsByPage,
    getSessionsByPatientId
} from "../../../domain/services/data/query/session.query.js";
import {updateSessionStatus} from "../../../domain/services/data/command/session.command.js";


ipcMain.removeHandler('session:getInfo')
ipcMain.handle('session:getInfo', (event, sessionId) => {
    try {
        return getSessionInfo(sessionId)
    } catch (error) {
        dialog.showErrorBox('Error when loading workspace data of the session', error.message || String(error))
    }
})

ipcMain.removeHandler('sessions:getPage')
ipcMain.handle('sessions:getPage', (event, page, size) => {
    try {
        return getSessionsByPage(page, size)
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
    }
})