// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

// Use window.IN_DESKTOP_ENV to detect desktop app environment
contextBridge.exposeInMainWorld("IN_DESKTOP_ENV", true);

contextBridge.exposeInMainWorld("biosignalApi", {
    provide: {
        sessionId: (payload) => ipcRenderer.send("provide:session-id", payload),
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

    on: {
        sessionId: (callback) => {
            const listener = (_event, sessionId) => callback(sessionId)
            ipcRenderer.on("provide:session-id", listener)
            return () => ipcRenderer.removeListener("provide:session-id", listener)
        }
    }
});

