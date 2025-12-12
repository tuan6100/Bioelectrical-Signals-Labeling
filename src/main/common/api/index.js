import {
    createAnnotationAppApi,
    getAllLabelsAppApi,
    updateAnnotationAppApi,
    deleteAnnotationAppApi,
    getChannelSamplesAppApi,
    getSessionInfoAppApi,
    isDesktopEnv, getAllSessionsAppApi, getSessionsByPatientIdAppApi, getAnnotationsByChannelAppApi,
    updateSessionStatusAppApi, exportToExcelAppApi
} from '../../app/api/provider';

/**
 * Fetches session information including patient details, channels, and default channel samples for display on the dashboard.
 *
 * @async
 * @function fetchSessionWorkspace
 * @param {number} sessionId - The ID of the session to fetch information for.
 * @returns {Promise<{
 *   session: {
 *     sessionId: number,
 *     patientId: number,
 *     patientFirstName: string,
 *     patientGender: string,
 *     sessionStartTime: string,
 *     sessionEndTime: string,
 *     sessionStatus: string,
 *     channels: Array<{ channelId: number, channelNumber: number, dataKind: string }>
 *   },
 *   defaultChannel: {
 *     channelId: number|null,
 *     name: string,
 *     signal: {
 *       samplingRateHz: number|null,
 *       durationMs: number|null,
 *       samples: Array<{ time: number, value: number }>,
 *       annotations: Array<{
 *         annotationId: number,
 *         startTimeMs: number,
 *         endTimeMs: number,
 *         note: string|null,
 *         timeline: Date,
 *         label: { labelId: number, name: string }|null
 *       }>|null
 *     }|null
 *   }
 * }>} A promise that resolves to the session data including patient info, channels list, and default averaged channel samples.
 */
export async function fetchSessionWorkspace(sessionId) {
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
 */
export async function fetchChannelSamples(channelId) {
    if (isDesktopEnv()) {
        return await getChannelSamplesAppApi(channelId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Fetches all annotations for a specific channel.
 * @async
 * @function fetchGetChannelAnnotations
 * @param {number} channelId - The ID of the channel to fetch annotations for.
 * @returns {Promise<Array<{
 *     annotationId: number,
 *     startTime: number,
 *     endTime: number,
 *     note: string|null,
 *     label: {
 *         id: number,
 *         name: string
 *     }
 * }>>}
 */
export async function fetchChannelAnnotations(channelId) {
    if (isDesktopEnv()) {
        // previously returned channel samples by mistake; use annotations API
        return await getAnnotationsByChannelAppApi(channelId);
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
 * Exports all labels of a specific channel to a csv file with a given channel ID.
 *
 * @async
 * @function fetchExportAllLabelInSession
 * @param {number} sessionId - The ID of the session to export labels for.
 * @param {number} channelId - The ID of the session to export labels for.
 * @param {string} extension - The file extension for export ('xlsx', 'csv').
 */
export async function fetchExportAllLabelInChannel(sessionId, channelId, extension) {
    if (isDesktopEnv()) {
        if (extension === 'xlsx') {
            return await exportToExcelAppApi(sessionId, channelId)
        }
    } else {
        // TODO: Implement web version
    }
}

/**
 * Creates a new label on the samples.
 *
 * @async
 * @function fetchCreateAnnotation
 * @param {Object} labelDto - The data transfer object containing label details.
 * @param {number} labelDto.channelId - The ID of the channel the label is associated with.
 * @param {number} labelDto.startTime - The start time of the label in milliseconds.
 * @param {number} labelDto.endTime - The end time of the label in milliseconds.
 * @param {string} labelDto.name - The name of the label.
 * @param {string} [labelDto.note] - An optional note for the label.
 * @param {string} labelDto.timeline - The timeline date for when the label was created.
 * @returns {Promise<{annotationId: number, channelId: number, labelId: number, labelName: string, startTimeMs: number, endTimeMs: number, note: string|null}>}
 */
export async function fetchCreateAnnotation(labelDto) {
    if (isDesktopEnv()) {
        return await createAnnotationAppApi(labelDto);
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

/**
 * Updates the status of a session.
 *
 * @async
 * @function fetchUpdateSessionStatus
 * @param {number} sessionId - The id of the session to update.
 * @param {string} newStatus - The new status to set ('NEW', 'IN_PROGRESS', 'COMPLETED').
 * @returns {Promise<VoidFunction>}
 */
export async function fetchUpdateSessionStatus(sessionId, newStatus) {
    if (isDesktopEnv()) {
        return await updateSessionStatusAppApi(sessionId, newStatus);
    } else {
        // TODO: Implement web version
    }
}
