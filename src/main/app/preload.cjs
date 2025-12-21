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
        },
        // ADD THIS NEW LISTENER
        sessionDoubleCheckedUpdated: (callback) => {
            const listener = (_event, args) => callback(args);
            ipcRenderer.on('session:double-checked-updated', listener);
            return () => ipcRenderer.removeListener('session:double-checked-updated', listener);
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

        allLabels: () => ipcRenderer.invoke(
            "label:getAll"
        ),
    },

    head: {
        exportToCsv: (sessionId) => ipcRenderer.send(
            "label:exportCsv",
            sessionId
        ),

        exportToExcel: (sessionId, channelId) => ipcRenderer.send(
            "label:exportExcel",
            sessionId, channelId
        ),
    },

    post: {
        createAnnotation: (labelDto) => ipcRenderer.invoke(
            "annotation:create",
            labelDto
        ),
    },

    put: {
        updateSessionStatus: (sessionId, newStatus) => ipcRenderer.invoke(
            "session:updateStatus",
            sessionId,
            newStatus
        ),
        // ADD THIS NEW FUNCTION
        updateSessionDoubleChecked: (sessionId, isDoubleChecked) => ipcRenderer.invoke(
            "session:updateDoubleChecked",
            sessionId,
            isDoubleChecked
        ),

        updateAnnotation: (annotationId, updateFields) => ipcRenderer.invoke(
            "annotation:update",
            annotationId,
            updateFields
        ),

    },


    delete: {
        deleteAnnotation: (annotationId) => ipcRenderer.invoke(
            "annotation:delete",
            annotationId
        ),
    }
});
