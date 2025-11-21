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
        ),

        allLabels: () => ipcRenderer.invoke(
            "label:getAll"
        ),

        sessionsPage: (page, size) => ipcRenderer.invoke(
            "sessions:getPage", page, size
        ),

        sessionsByPatient: (patientId) => ipcRenderer.invoke(
            "sessions:getByPatient", patientId
        )
    },

    post: {
        createLabel: (labelDto) => ipcRenderer.invoke(
            "label:create",
            labelDto
        ),

        updateLabel: (labelId, updateFields) => ipcRenderer.invoke(
            "label:update",
            labelId,
            updateFields
        ),

        deleteLabel: (labelId) => ipcRenderer.invoke(
            "label:delete",
            labelId
        ),

        updateAnnotation: (annotationId, updateFields) => ipcRenderer.invoke(
            "annotation:update",
            annotationId,
            updateFields
        ),

        deleteAnnotation: (annotationId) => ipcRenderer.invoke(
            "annotation:delete",
            annotationId
        ),

        exportLabel: (sessionId) => ipcRenderer.send(
            "label:export",
            sessionId
        )
    },

    dialog: {
        showError: (title, message) => ipcRenderer.invoke(
            "dialog:showError",
            title,
            message
        )
    }

});
