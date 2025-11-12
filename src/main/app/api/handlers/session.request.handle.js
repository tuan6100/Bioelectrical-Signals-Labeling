import {ipcMain} from "electron";
import {getSessionInfo} from "../../domain/services/data/query/session.query.js";

ipcMain.handle('session:getInfo', (event, sessionId) => {
    return getSessionInfo(sessionId)
})