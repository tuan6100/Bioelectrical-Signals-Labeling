import { findKeyValue } from "../../../utils/json.util.js"
import Patient from "../../../../persistence/dao/patient.dao.js"
import Session from "../../../../persistence/dao/session.dao.js"
import { extractChannelsFromJson, generateSamplesForChannel } from "../../../utils/channel.util.js"
import Channel from "../../../../persistence/dao/channel.dao.js"
import Sample from "../../../../persistence/dao/sample.dao.js"

// Process and store parsed data into the database. Must be called from the Electron main process.
export function processAndStoreData(data, outputPath) {
    const patientId = findKeyValue(data, 'Patient ID')
    const firstName = findKeyValue(data, 'First Name')
    const gender = findKeyValue(data, 'Gender').toString().toUpperCase().includes('MALE') ? 'M' : 'F'
    insertPatient(patientId, firstName, gender)

    let measurementType = findKeyValue(data, "Test").toString()
    measurementType = measurementType.toUpperCase().includes("ECG") ? "ECG" :
        measurementType.toUpperCase().includes("EEG") ? "EEG" :
            measurementType.toUpperCase().includes("EMG") ? "EMG" : "UNKNOWN"
    const startTime = findKeyValue(data, "Acquisition Start Time")
    const endTime = findKeyValue(data, "Acquisition End Time")
    const subsampled = findKeyValue(data, "Subsampled")
    const samplingFrequency = findKeyValue(data, "Sampling Frequency")
    const sessionId = insertSession(patientId, measurementType, startTime, endTime, subsampled, samplingFrequency, outputPath)

    const { channels } = extractChannelsFromJson(data, sessionId)
    Channel.insertBatch(channels)

    const allSamples = []
    for (const ch of channels) {
        if (!ch.rawDataString) continue
        const samples = generateSamplesForChannel(ch, ch.rawDataString)
        allSamples.push(...samples)
    }
    Sample.insertBatch(allSamples)
}

function insertPatient(patientId, firstName, gender) {
    try {
        const dao = new Patient(patientId, firstName, gender)
        dao.insert()
    } catch (error) {
        console.error('Failed to insert patient:', error)
    }
}

function insertSession(patientId, measurementType, startTime, endTime, subsampled, samplingFrequency, sourceFilePath) {
    try {
        const dao = new Session(
            patientId,
            measurementType,
            startTime,
            endTime,
            subsampled,
            samplingFrequency,
            sourceFilePath
        )
        dao.insert()
        return dao.sessionId
    } catch (error) {
        console.error('Failed to insert session:', error)
        return null
    }
}