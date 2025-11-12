import { ipcMain } from 'electron'
import { getChannelSamples } from "../../domain/services/data/query/session.query.js"

// Align the IPC channel name with preload (channel:getSamples)
ipcMain.handle('channel:getSamples', (event, channelId) => {
    return getChannelSamples(channelId)
})
