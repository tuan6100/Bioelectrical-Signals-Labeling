import {
    createLabelAppApi,
    exportLabelAppApi,
    getAllLabelsAppApi,
    updateLabelAppApi,
    deleteLabelAppApi,
    getChannelSamplesAppApi,
    getSessionInfoAppApi,
    isDesktopEnv
} from "../../app/api/provider";

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
 *         label: {labelId: number, name: string, type: string}|null
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
 *     label: {labelId: number, name: string, type: string}|null
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
