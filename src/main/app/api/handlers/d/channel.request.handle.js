import { ipcMain } from 'electron'
import {getChannelSignal} from "../../../domain/services/data/query/session.query.js"

ipcMain.handle('channel:getSamples', (event, channelId) => {
    return getChannelSignal(channelId)
})
