// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer, shell } = require("electron");

// Use window.IN_DESKTOP_ENV to detect desktop app environment
contextBridge.exposeInMainWorld("IN_DESKTOP_ENV", true);

contextBridge.exposeInMainWorld("biosignalApi", {
    on: {
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
        importRaw: () => ipcRenderer.invoke("file:importRaw"),
        importReviewed: () => ipcRenderer.invoke("file:importReviewed"),
        openFolder: () => ipcRenderer.invoke("file:openFolder"),
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
        enableDoubleCheck: (sessionId) => ipcRenderer.invoke(
            "session:enableDoubleCheck",
            sessionId
        ),
        setChannelDoubleChecked: (sessionId, channelId, isDoubleChecked) => ipcRenderer.invoke(
            "channel:setDoubleChecked",
            sessionId,
            channelId,
            isDoubleChecked
        ),
        updateAnnotation: (annotationId, updateFields) => ipcRenderer.invoke(
            "annotation:update",
            annotationId,
            updateFields
        ),

    },


    delete: {
        deleteSession: (sessionId) => ipcRenderer.invoke(
            "session:delete",
            sessionId
        ),

        deleteAnnotation: (annotationId) => ipcRenderer.invoke(
            "annotation:delete",
            annotationId
        ),
    },
});
