import { ipcMain, dialog } from 'electron'
import {getChannelSignal} from "../../../domain/services/data/query/session.query.js";



ipcMain.removeHandler('channel:getSamples')
ipcMain.handle('channel:getSamples', (event, channelId) => {
    try {
        return getChannelSignal(channelId)
    } catch (error) {
        dialog.showErrorBox('Channel Samples Error', error.message || String(error))
        throw error
    }
})
