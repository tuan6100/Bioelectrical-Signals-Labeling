import { isNatusSignature as nativeIsNatusSignature, isNativeAvailable } from "../../native/index.js";

export function isNatusSignature(fileContent) {
    if (!fileContent || typeof fileContent !== 'string') {
        return false;
    }
    if (isNativeAvailable) {
        return nativeIsNatusSignature(fileContent);
    }
    const firstLines = fileContent.split(/\r?\n/).slice(0, 5).join("\n");
    const signatureRegex = /Viking v\.\d+(?:\.\d+)* - © \d{4} Natus/i;
    return signatureRegex.test(firstLines);
}

