    import { BrowserWindow } from "electron";
import asTransaction from "../../../../persistence/transaction/index.js";
import {findKeyValue} from "../../../utils/json.util.js";
import {extractChannelsFromJson} from "../../../utils/channel.util.js";
import Channel from "../../../../persistence/dao/channel.dao.js";
import Session from "../../../../persistence/dao/session.dao.js";
import Patient from "../../../../persistence/dao/patient.dao.js";
import {parseVietnameseDateTime} from "../../../utils/parse-time.util.js";
import Annotation from "../../../../persistence/dao/annotation.dao.js";
import Label from "../../../../persistence/dao/label.dao.js";


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
            'NEW',
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

export function updateSessionStatus(sessionId, status) {
    asTransaction(() => {
        if (!['NEW', 'IN_PROGRESS', 'COMPLETED', 'REQUEST_DOUBLE_CHECK', 'WAIT_FOR_DOUBLE_CHECK'].includes(status)) {
            throw new Error(`Invalid session status: ${status}`)
        }
        if (status === 'COMPLETED') {
            const pendingCount = Channel.countPendingDoubleCheck(sessionId);
            if (pendingCount > 0) {
                throw new Error(`Cannot complete session. There are ${pendingCount} channels pending double check.`);
            }
        }
        const currentSession = Session.findOneById(sessionId)
        if (!currentSession) {
            throw new Error(`Session with ID ${sessionId} not found`)
        }
        if (['IN_PROGRESS', 'COMPLETED'].includes(currentSession.status) && status === 'NEW') {
            throw new Error(`Cannot change status of a completed session to ${status}`)
        }
        let isUpdated
        if (currentSession.status === 'REQUEST_DOUBLE_CHECK' && status === 'IN_PROGRESS' && currentSession) {
        }
        Session.update(sessionId, {status: status})

        notifySessionUpdate(sessionId);
    })();
}

export function persistExcelData(data) {
    return asTransaction(() => {
        const { session, annotations, channels } = data;
        const sessionId = session.session_id;
        const existingSession = Session.findOneById(sessionId);
        if (existingSession) {
            Session.update(sessionId, {
                status: session.status,
                updated_at: session.updated_at
            });
        } else {
            let patient = Patient.findOneById(session.patient_id);
            if (!patient) {
                new Patient(session.patient_id, "Unknown", "U").insert();
            }
            new Session(
                sessionId,
                session.patient_id,
                session.measurement_type,
                session.start_time,
                session.end_time,
                session.status,
                session.input_file_name,
                null,
                session.updated_at
            ).insert();
            if (channels && channels.length > 0) {
                const channelEntities = channels.map(ch => ({
                    channelId: ch.channelId,
                    sessionId: sessionId,
                    channelNumber: ch.channelNumber,
                    rawSamplesUv: ch.rawSamplesUv,
                    samplingFrequencyKhz: ch.samplingFrequencyKhz,
                    subsampledKhz: ch.subsampledKhz,
                    durationMs: ch.durationMs,
                    dataKind: 'EEG'
                }));
                for(const ch of channelEntities) {
                    const dao = new Channel(
                        ch.channelId,
                        ch.sessionId,
                        ch.channelNumber,
                        ch.rawSamplesUv,
                        ch.samplingFrequencyKhz,
                        ch.subsampledKhz,
                        ch.durationMs,
                        null
                    );
                    const stmt = Channel.db.prepare(`
                        INSERT OR REPLACE INTO channels (channel_id, session_id, channel_number, raw_samples_uv, sampling_frequency_khz, subsampled_khz, duration_ms)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                     `);
                    stmt.run(ch.channelId, ch.sessionId, ch.channelNumber, ch.rawSamplesUv, ch.samplingFrequencyKhz, ch.subsampledKhz, ch.durationMs);
                }
            }
        }
        if (annotations && annotations.length > 0) {
            const annotationsByChannel = {};
            annotations.forEach(ann => {
                const chNum = ann.channelNumber;
                if (!annotationsByChannel[chNum]) annotationsByChannel[chNum] = [];
                annotationsByChannel[chNum].push(ann);
            });

            for (const [chNum, anns] of Object.entries(annotationsByChannel)) {
                const channelId = Channel.findChannelIdBySessionIdAndChanelNumber(sessionId, chNum);
                if (channelId) {
                    Annotation.deleteByChannelId(channelId);
                    for (const ann of anns) {
                        let labelObj = Label.findOneByName(ann.labelName);
                        if (!labelObj) {
                            labelObj = new Label(null, ann.labelName).insert();
                        }
                        new Annotation(
                            null,
                            channelId,
                            labelObj.labelId,
                            ann.startTime,
                            ann.endTime,
                            ann.note
                        ).insert();
                    }
                }
            }
        }

        return sessionId;
    })();
}

export function enableDoubleCheckMode(channelId) {
    console.log("Enabling double check mode for channel:", channelId);
    asTransaction(() => {
        const sessionId = Channel.findSessionIdByChannelId(channelId)
        Session.update(sessionId, { status: 'REQUEST_DOUBLE_CHECK' });
        Channel.updateDoubleChecked(channelId, 0);
        notifySessionUpdate(sessionId);
    })();
}

export function disableDoubleCheckMode(channelId) {
    console.log("Disabling double check mode for channel:", channelId);
    asTransaction(() => {
        const sessionId = Channel.findSessionIdByChannelId(channelId)
        Session.update(sessionId, { status: 'IN_PROGRESS' });
        Channel.updateDoubleChecked(channelId, null);
        notifySessionUpdate(sessionId);
    })();
}

export function setChannelDoubleChecked(sessionId, channelId, isChecked) {
    asTransaction(() => {
        Channel.updateDoubleChecked(channelId, isChecked? 1 : 0);
        if (isChecked && Channel.countPendingDoubleCheck(sessionId) === 0) {
            Session.update(sessionId, { status: 'COMPLETED' })
        }
        notifySessionUpdate(sessionId);
    })();
}

function notifySessionUpdate(sessionId) {
    const updatedSession = Session.findOneById(sessionId);
    if (updatedSession) {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('sessions:updated');
            win.webContents.send('session:status-updated', {
                sessionId: updatedSession.sessionId,
                status: updatedSession.status,
                updatedAt: updatedSession.updatedAt
            });
        });
    }
}

export function deleteSession(sessionId) {
    return asTransaction(function (sessionId) {
        const channels = Channel.findBySessionId(sessionId);
        channels.forEach(channel => Annotation.deleteByChannelId(channel.channelId));
        Channel.deleteBySessionId(sessionId)
        Session.delete(sessionId)
        return sessionId
    })(sessionId)
}