import {ipcMain, dialog} from "electron";
import {
    getAllSessions,
    getSessionInfo,
    getSessionsByPage,
    getSessionsByPatientId
} from "../../../domain/services/data/query/session.query.js";
import {
    updateSessionStatus,
    setChannelDoubleChecked,
    enableDoubleCheckMode
} from "../../../domain/services/data/command/session.command.js";

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

ipcMain.removeHandler('session:enableDoubleCheck')
ipcMain.handle('session:enableDoubleCheck', (event, sessionId) => {
    try {
        enableDoubleCheckMode(sessionId);
        return true;
    } catch (error) {
        dialog.showErrorBox('Enable Double Check Error', error.message || String(error));
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