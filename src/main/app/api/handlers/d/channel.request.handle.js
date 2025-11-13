import { ipcMain } from 'electron'
import { getChannelSamples } from "../../../domain/services/data/query/session.query.js"

ipcMain.handle('channel:getSamples', (event, channelId) => {
    return getChannelSamples(channelId)
})
