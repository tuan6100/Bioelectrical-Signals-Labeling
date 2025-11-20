import {
    createLabelAppApi,
    exportLabelAppApi,
    getAllLabelsAppApi,
    updateLabelAppApi,
    deleteLabelAppApi,
    updateAnnotationAppApi,
    deleteAnnotationAppApi,
    showErrorDialogAppApi,
    getChannelSamplesAppApi,
    getSessionInfoAppApi,
    isDesktopEnv, getAllSessionsAppApi, getSessionsByPatientIdAppApi
} from "@biosignal/app/api/provider";

/**
 * Fetches session information including patient details, channels, and default channel samples for display on the dashboard.
 *
 * @async
 * @function fetchSessionDashboard
 * @param {number} sessionId - The ID of the session to fetch information for.
 * @returns {Promise<{
 *   session: {
 *     patientId: number,
 *     patientFirstName: string,
 *     patientGender: string,
 *     sessionStartTime: string,
 *     sessionEndTime: string,
 *     channels: Array<{channelId: number, channelNumber: number, dataKind: string, sweepIndex: number|null}>
 *   },
 *   defaultChannel: {
 *     channelId: number|null,
 *     name: string,
 *     signal: {
 *       samplingRateHz: number|null,
 *       durationMs: number|null,
 *       samples: Array<{time: number, value: number}>,
 *       annotations: {
 *         annotationId: number,
 *         startTimeMs: number,
 *         endTimeMs: number,
 *         note: string|null,
 *         timeline: Date
 *         label: {labelId: number, name: string}|null
 *       }|null
 *     }|null
 *   }
 * }>} A promise that resolves to the session dashboard data including patient info, channels list, and default averaged channel samples.
 */
export async function fetchSessionDashboard(sessionId) {
    if (isDesktopEnv()) {
        return await getSessionInfoAppApi(sessionId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Fetches channel samples data including time series, sampling rate, duration, and annotations.
 *
 * @async
 * @function fetchChannelSamples
 * @param {number} channelId - The ID of the channel to fetch samples for.
 * @returns {Promise<{
 *   samplingRateHz: number|null,
 *   durationMs: number|null,
 *   samples: Array<{time: number, value: number}>,
 *   annotations: {
 *     annotationId: number,
 *     startTimeMs: number,
 *     endTimeMs: number,
 *     note: string|null,
 *     timeline: Date
 *     label: {labelId: number, name: string}|null
 *   }|null
 * }>} A promise that resolves to the channel samples with time series data and any associated annotations.
 * @throws {Error} If channelId is null or undefined.
 */
export async function fetchChannelSamples(channelId) {
    if (isDesktopEnv()) {
        return await getChannelSamplesAppApi(channelId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Creates a new label on the samples.
 *
 * @async
 * @function fetchCreateLabel
 * @param {Object} labelDto - The data transfer object containing label details.
 * @param {number} labelDto.channelId - The ID of the channel the label is associated with.
 * @param {number} labelDto.startTime - The start time of the label in milliseconds.
 * @param {number} labelDto.endTime - The end time of the label in milliseconds.
 * @param {string} labelDto.name - The name of the label.
 * @param {string} [labelDto.note] - An optional note for the label.
 * @param {string} labelDto.timeline - The timeline date for when the label was created.
 * @returns {Promise<{annotationId: number, channelId: number, labelId: number, labelName: string, startTimeMs: number, endTimeMs: number, note: string|null}>}
 */


export async function fetchCreateLabel(labelDto) {
    if (isDesktopEnv()) {
        return await createLabelAppApi(labelDto);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Gets all labels from the database.
 *
 * @async
 * @function fetchGetAllLabels
 * @returns {Promise<Array<{labelId: number, name: string, createdAt: string}>>} A promise that resolves to an array of all labels.
 */
export async function fetchGetAllLabels() {
    if (isDesktopEnv()) {
        return await getAllLabelsAppApi();
    } else {
        // TODO: Implement web version
    }
}

/**
 * Updates a label by ID.
 *
 * @async
 * @function fetchUpdateLabel
 * @param {number} labelId - The ID of the label to update.
 * @param {Object} updateFields - Fields to update (e.g., {name: 'newName'}).
 * @returns {Promise<{labelId: number, name: string, createdAt: string}|null>} A promise that resolves to the updated label or null if not found.
 */
export async function fetchUpdateLabel(labelId, updateFields) {
    if (isDesktopEnv()) {
        return await updateLabelAppApi(labelId, updateFields);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Deletes a label by ID.
 *
 * @async
 * @function fetchDeleteLabel
 * @param {number} labelId - The ID of the label to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if deleted successfully, false otherwise.
 */
export async function fetchDeleteLabel(labelId) {
    if (isDesktopEnv()) {
        return await deleteLabelAppApi(labelId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Exports all labels in a given session ID.
 *
 * @async
 * @function fetchExportLabel
 * @param {number} sessionId - The ID of the session to export labels for.
 * @returns {Promise<Object>} A promise that resolves to the exported labels.
 */
export async function fetchExportLabel(sessionId) {
    if (isDesktopEnv()) {
        return await exportLabelAppApi(sessionId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Updates an annotation by ID (changes label name, time range, or note).
 *
 * @async
 * @function fetchUpdateAnnotation
 * @param {number} annotationId - The ID of the annotation to update.
 * @param {Object} updateFields - Fields to update (e.g., {labelName: 'newName', note: 'new note'}).
 * @returns {Promise<{annotationId: number, channelId: number, labelId: number, labelName: string, startTimeMs: number, endTimeMs: number, note: string|null, timeline: Date}>} A promise that resolves to the updated annotation.
 */
export async function fetchUpdateAnnotation(annotationId, updateFields) {
    if (isDesktopEnv()) {
        return await updateAnnotationAppApi(annotationId, updateFields);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Deletes an annotation by ID.
 *
 * @async
 * @function fetchDeleteAnnotation
 * @param {number} annotationId - The ID of the annotation to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if deleted successfully, false otherwise.
 */
export async function fetchDeleteAnnotation(annotationId) {
    if (isDesktopEnv()) {
        return await deleteAnnotationAppApi(annotationId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Shows a native error dialog box.
 *
 * @async
 * @function fetchShowErrorDialog
 * @param {string} title - The title of the error dialog.
 * @param {string} message - The error message to display.
 * @returns {Promise<void>} A promise that resolves when the dialog is closed.
 */
export async function fetchShowErrorDialog(title, message) {
    if (isDesktopEnv()) {
        return await showErrorDialogAppApi(title, message);
    } else {
        alert(`${title}\n\n${message}`);
    }
}

/**
 * Fetches a paginated list of sessions.
 * Each item contains session metadata and nested patient info.
 * @async
 * @function fetchAllSessions
 * @param {number} [page=1] - 1-based page index.
 * @param {number} [size=10] - Items per page.
 * @returns {Promise<{contents: Array<{sessionId: number, patient: {id: number, name: string, gender: string}, measurementType: string, startTime: string, endTime: string, inputFileName: string, updatedAt: string}>, page: {size: number, number: number, totalElements: number, totalPages: number}}>} Paginated sessions payload.
 */
export async function fetchAllSessions(page = 1, size = 10) {
    if (isDesktopEnv()) {
        return await getAllSessionsAppApi(page, size);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Fetches all sessions that belong to a given patient.
 *
 * @async
 * @function fetchSessionsByPatientId
 * @param {number} patientId - The unique patient identifier.
 * @returns {Promise<Array<{
 *   sessionId: number,
 *   patientId: number,
 *   measurementType: string,
 *   startTime: string,
 *   endTime: string,
 *   inputFileName: string,
 *   updatedAt: string
 * }>>} A promise that resolves to an array of the patient's sessions (possibly empty).
 */
export async function fetchSessionsByPatientId(patientId) {
    if (isDesktopEnv()) {
        return await getSessionsByPatientIdAppApi(patientId);
    } else {
        // TODO: Implement web version
    }
}
