import CRC32 from 'crc-32';
import Session from "../../persistence/dao/session.dao.js";
import { calculateCRC32 as nativeCRC32, isNativeAvailable } from "../../native/index.js";

export function checkFileImported(inputFileName, content) {
    let existingSession = Session.findSessionIdByInputFileName(inputFileName)
    if (existingSession) {
        return {
            imported: true,
            metadata: existingSession
        }
    }
    const hash = calculateCRC32(content);
    existingSession = Session.findSessionIdByContentHash(hash);
    return existingSession? {
        imported: true,
        metadata: existingSession
    } : {
        imported: false,
        metadata: hash
    };
}

function calculateCRC32(text) {
    if (isNativeAvailable) {
        return nativeCRC32(text);
    }
    const crc = CRC32.str(text);
    return (crc >>> 0).toString(16).padStart(8, '0');
}