import {
    createAnnotationAppApi,
    getAllLabelsAppApi,
    updateAnnotationAppApi,
    deleteAnnotationAppApi,
    getSessionInfoAppApi,
    isDesktopEnv, getAllSessionsAppApi, getSessionsByPatientIdAppApi,
    updateSessionStatusAppApi, exportToExcelAppApi, enableDoubleCheckAppApi, setChannelDoubleCheckedAppApi,
    deleteSessionAppApi
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
 *     channels: Array<{ channelId: number, channelNumber: number }>
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
 *         label: { labelId: number, name: string }|null
 *       }>|null,
 *       overlaps: Array<{
 *           first: number,
 *           second: number
 *       }>| null
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
 *     label: {labelId: number, name: string}|null
 *   }|null,
 *   overlaps: Array<{
 *      first: number,
 *      second: number
 *  }>| null
 * }>} A promise that resolves to the channel samples with time series data and any associated annotations.
 */

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
 * @returns {Promise<{contents: Array<{sessionId: number, patient: {id: number, name: string, gender: string}, measurementType: string, startTime: string, endTime: string, inputFileName: string, updatedAt: string}>, page: {size: number, number: number, totalElements: number, totalPages: number}}>} Paginated sessions payload.
 */
export async function fetchAllSessions() {
    if (isDesktopEnv()) {
        return await getAllSessionsAppApi();
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

/**
 * Enables double check mode for a session (Student side).
 * Sets session status to REQUEST_DOUBLE_CHECK and resets all channels.
 */
export const fetchEnableDoubleCheck = async (sessionId) => {
    if (isDesktopEnv()) {
        return await enableDoubleCheckAppApi(sessionId);
    } else {
        // TODO: Implement web version
    }
};

/**
 * Updates the double-checked status of a specific channel (Doctor side).
 */
export const fetchSetChannelDoubleChecked = async (sessionId, channelId, isDoubleChecked) => {
    if (isDesktopEnv()) {
        return await setChannelDoubleCheckedAppApi(sessionId, channelId, isDoubleChecked);
    } else {
        // TODO: Implement web version
    }
};

/**
 * Delete session by ID.
 *
 * @async
 * @function fetchDeleteSession
 * @param {number} sessionId - The ID of the session to delete.
 * @returns {Promise<number>} A promise that resolves to the sessionId of the deleted session.
 */
export async function fetchDeleteSession(sessionId) {
    if (isDesktopEnv()) {
        return await deleteSessionAppApi(sessionId)
    } else {
        // TODO: Implement web version
    }
}
