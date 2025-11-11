// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

// Use window.IN_DESKTOP_ENV to check if the React app is running on electron
contextBridge.exposeInMainWorld("IN_DESKTOP_ENV", true);

contextBridge.exposeInMainWorld("electron", {
    onEmgData: (callback) =>
        ipcRenderer.on(
            "emg-data",
            (event, data) => {
                console.log("display-data event received");
                callback(data);
            }
        ),
    onStoreDataComplete: (callback) =>
        ipcRenderer.on(
            "store-data-complete",
            (event, result) => {
                console.log("store-data-complete event received:", result);
                callback(result);
            }
        ),
    onDbStatus: (callback) =>
        ipcRenderer.on(
            "db-status",
            (event, status) => {
                console.log("db-status event received:", status);
                callback(status);
            }
        ),
});

