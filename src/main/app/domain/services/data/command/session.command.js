import asTransaction from "../../../../persistence/transaction/index.js";
import {findKeyValue} from "../../../utils/json.util.js";
import {extractChannelsFromJson} from "../../../utils/channel.util.js";
import Channel from "../../../../persistence/dao/channel.dao.js";
import Session from "../../../../persistence/dao/session.dao.js";
import Patient from "../../../../persistence/dao/patient.dao.js";
import {parseVietnameseDateTime} from "../../../utils/parse-time.util.js";


export function processAndPersistData(inputFileName, data, contentHash) {
    return asTransaction(function (data, contentHash) {
        let patientId = findKeyValue(data, 'Patient ID')
        const firstName = findKeyValue(data, 'First Name')
        const gender = findKeyValue(data, 'Gender').toString().toUpperCase() === 'MALE' ? 'M' : 'F'
        patientId = insertPatient(patientId, firstName, gender)

        let measurementType = findKeyValue(data, "Test").toString()
        measurementType = measurementType.toUpperCase().includes("ECG") ? "ECG" :
            measurementType.toUpperCase().includes("EEG") ? "EEG" :
                measurementType.toUpperCase().includes("EMG") ? "EMG" : "UNKNOWN"
        const startTime = findKeyValue(data, "Acquisition Start Time")
        const endTime = findKeyValue(data, "Acquisition End Time")
        const sessionId = insertSession(patientId, measurementType, startTime, endTime, inputFileName, contentHash)

        const channels  = extractChannelsFromJson(data, sessionId)
        Channel.insertBatch(channels)
        Session.touch(sessionId)
        return sessionId
    })(data, contentHash)
}

function insertPatient(patientId, firstName, gender) {
    try {
        const findPatient = Patient.findOneById(patientId)
        if (findPatient) {
            return findPatient.patientId
        }
        const dao = new Patient(patientId, firstName, gender)
        dao.insert()
        return dao.patientId
    } catch (error) {
        console.error('Failed to insert patient:', error)
    }
}

function insertSession(patientId, measurementType, startTime, endTime, inputFileName, contentHash) {
    let parsedStartTime = startTime
    let parsedEndTime = endTime
    try {
        if (startTime.includes('SA') || startTime.includes('CH')) {
            parsedStartTime = parseVietnameseDateTime(startTime).toString()
        }
        if (endTime.includes('SA') || endTime.includes('CH')) {
            parsedEndTime = parseVietnameseDateTime(endTime).toString()
        }
        const dao = new Session(
            null,
            patientId,
            measurementType,
            parsedStartTime,
            parsedEndTime,
            inputFileName,
            contentHash
        )
        dao.insert()
        return dao.sessionId
    } catch (error) {
        console.error('Failed to insert session:', error)
        return null
    }
}