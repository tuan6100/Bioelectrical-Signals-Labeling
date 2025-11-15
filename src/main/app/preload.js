// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

// Use window.IN_DESKTOP_ENV to detect desktop app environment
contextBridge.exposeInMainWorld("IN_DESKTOP_ENV", true);

contextBridge.exposeInMainWorld("biosignalApi", {
    on: {
        sessionId: (callback) => {
            const listener = (_event, sessionId) => callback(sessionId)
            ipcRenderer.on("send:session-id", listener)
            return () => ipcRenderer.removeListener("send:session-id", listener)
        }
    },

    get: {
        sessionInfo: (sessionId) => ipcRenderer.invoke(
            "session:getInfo",
                sessionId
        ),

        channelSamples: (channelId) => ipcRenderer.invoke(
            "channel:getSamples",
            channelId
        )
    },

    post: {
        createLabel: (labelDto) => ipcRenderer.invoke(
            "label:create",
            labelDto
        ),

        exportLabel: (sessionId) => ipcRenderer.send(
            "label:export",
            sessionId
        )
    }

});

