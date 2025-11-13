import { ipcMain } from 'electron'
import {getDefaultChannelSignal} from "../../../domain/services/data/query/session.query.js"

ipcMain.handle('channel:getSamples', (event, channelId) => {
    return getDefaultChannelSignal(channelId)
})
