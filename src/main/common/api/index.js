import {
    createLabelAppApi,
    exportLabelAppApi,
    getChannelSamplesAppApi,
    getSessionInfoAppApi,
    isDesktopEnv
} from "../../app/api/provider";

/**
 * Fetches session information for a given session ID.
 *
 * @async
 * @function fetchSessionInfo
 * @param {number} sessionId - The ID of the session to fetch information for.
 * @returns {Promise<Object>} A promise that resolves to the session information.
 */
export async function fetchSessionInfo(sessionId) {
    if (isDesktopEnv()) {
        return await getSessionInfoAppApi(sessionId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Fetches channel samples for a given channel ID.
 *
 * @async
 * @function fetchChannelSamples
 * @param {number} channelId - The ID of the channel to fetch samples for.
 * @returns {Promise<Object>} A promise that resolves to the channel samples.
 */
export async function fetchChannelSamples(channelId) {
    if (isDesktopEnv()) {
        return await getChannelSamplesAppApi(channelId);
    } else {
        // TODO: Implement web version
    }
}

/**
 * Creates a new label .
 *
 * @async
 * @function fetchCreateLabel
 * @param {Object} labelDto - The data transfer object containing label details,
 * includes channelId, startTime, endTime, name and maybe its note.
 * @returns {Promise<Object>} A promise that resolves to the created label.
 */
export async function fetchCreateLabel(labelDto) {
    if (isDesktopEnv()) {
        return await createLabelAppApi(labelDto);
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
