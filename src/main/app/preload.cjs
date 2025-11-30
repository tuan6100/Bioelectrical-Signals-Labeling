// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

// Use window.IN_DESKTOP_ENV to detect desktop app environment
contextBridge.exposeInMainWorld("IN_DESKTOP_ENV", true);

contextBridge.exposeInMainWorld("biosignalApi", {
    on: {
        sessionId: (callback) => {
            const listener = (_event, sessionId) => callback(sessionId)
            ipcRenderer.on("send:session-id", listener)
            return () => ipcRenderer.removeListener("send:session-id", listener)
        },
        sessionsUpdated: (callback) => {
            const listener = (_event, args) => callback(args);
            ipcRenderer.on("sessions:updated", listener);
            return () => ipcRenderer.removeListener("sessions:updated", listener);
        },
        sessionStatusUpdated: (callback) => {
            const listener = (_event, args) => callback(args);
            ipcRenderer.on('session:status-updated', listener);
            return () => ipcRenderer.removeListener('session:status-updated', listener);
        }
    },

    get: {
        sessionInfo: (sessionId) => ipcRenderer.invoke(
            "session:getInfo",
            sessionId
        ),

        sessionsPage: (page, size) => ipcRenderer.invoke(
            "sessions:getPage", page, size
        ),

        sessionsByPatient: (patientId) => ipcRenderer.invoke(
            "sessions:getByPatient", patientId
        ),

        channelSamples: (channelId) => ipcRenderer.invoke(
            "channel:getSamples",
            channelId
        ),

        allLabels: () => ipcRenderer.invoke(
            "label:getAll"
        ),

        annotationsByChannel: (channelId) => ipcRenderer.invoke(
            "channel:getAllAnnotations",
            channelId
        )

    },

    post: {
        updateSessionStatus: (sessionId, newStatus) => ipcRenderer.invoke(
            "session:updateStatus",
            sessionId,
            newStatus
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

        createAnnotation: (labelDto) => ipcRenderer.invoke(
            "annotation:create",
            labelDto
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

});
