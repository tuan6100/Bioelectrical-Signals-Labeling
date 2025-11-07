// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

// Use window.IN_DESKTOP_ENV to check if the react app is running on electron
contextBridge.exposeInMainWorld("IN_DESKTOP_ENV", true);

contextBridge.exposeInMainWorld("electron", {
    onEmgData: callback =>
        ipcRenderer.on(
            "emg-data",
            (event, data) => callback(data)),

});

