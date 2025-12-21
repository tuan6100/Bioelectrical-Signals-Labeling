import fs from "fs/promises"
import path from "node:path"
import {saveJson} from "../writer/json.writer.js"
import {isNatusSignature} from "../../../utils/natus.validation.util.js";
import {checkFileImported} from "../../../utils/check-imported.util.js";

function isTxt(filePath) {
    return path.extname(filePath).toLowerCase() === '.txt'
}

export async function readFile(inputPath, outputPath) {
    if (!isTxt(inputPath)) {
        throw new Error("This file extension is not supported")
    }
    let content = await fs.readFile(inputPath, {
        encoding: 'utf-16le',
        flag: 'r'
    })
    content = content.replace(/\r\n|\r|\n/g, '\n')
    if (!isNatusSignature(content)) {
        throw new Error("Not Natus data")
    }
    const inputFileName = path.basename(inputPath)
    const result = checkFileImported(inputFileName, content)
    if (result.imported) {
        return {
            inputFileName: null,
            json: null,
            sessionCode: result.metadata
        }
    }
    const jsonParsed = parseText(content)
    await saveJson(jsonParsed, outputPath)
    return {
        inputFileName: inputFileName,
        json: jsonParsed,
        sessionCode: result.metadata
    }
}


function parseText(text) {
    text = text.replace(/\/\r?\n/g, ",");
    text = text.replace(/(-?\d+),(\d{2})/g, "$1.$2");
    const lines = text.split(/\r?\n/);
    const result = {};
    let currentObj = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith(";")) continue;
        if (line.startsWith("...")) continue;
        const sectionMatch = line.match(/^\[([\d.]+)\s*-\s*([^\]]+)]/);
        if (sectionMatch) {
            const [, pathStr, name] = sectionMatch;
            const rest = line.slice(sectionMatch[0].length).trim();
            currentObj = setDeepByName(result, pathStr, name);
            if (rest) {
                const kvInline = rest.match(/^([^=]+)=(.*)$/);
                if (kvInline) {
                    const [, key, value] = kvInline;
                    currentObj[key.trim()] = value.trim();
                }
            }
            continue;
        }
        const kvMatch = line.match(/^([^=]+)=(.*)$/);
        if (kvMatch) {
            const [, key, value] = kvMatch;
            if (currentObj) currentObj[key.trim()] = value.trim();
            else result[key.trim()] = value.trim();
        }
    }
    return result;
}


function setDeepByName(obj, pathStr, sectionName) {
    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!current[p]) current[p] = {};
        current = current[p];
    }
    const lastPart = sectionName;
    if (!current[lastPart]) current[lastPart] = {};
    return current[lastPart];
}
