import { ipcMain, dialog } from 'electron'
import {getChannelSignal} from "../../../domain/services/data/query/session.query.js";
import {getAllAnnotationsByChannel} from "../../../domain/services/data/query/label.query.js";



ipcMain.removeHandler('channel:getSamples')
ipcMain.handle('channel:getSamples', (event, channelId) => {
    try {
        return getChannelSignal(channelId)
    } catch (error) {
        dialog.showErrorBox('Channel Samples Error', error.message)
    }
})

ipcMain.removeHandler('channel:getAllAnnotations')
ipcMain.handle('channel:getAllAnnotations', (event, channelId) => {
    try {
        return getAllAnnotationsByChannel(channelId)
    } catch (error) {
        dialog.showErrorBox('Channel Annotations Error', error.message)
    }
})
