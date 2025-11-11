export function isNatusSignature(fileContent) {
    const firstLines = fileContent.split(/\r?\n/).slice(0, 5).join("\n")
    const signatureRegex = /^Viking v\.\d+\.\d+\.\d+\.\d+ - © \d{4} Natus$/i
    return signatureRegex.test(firstLines)
}