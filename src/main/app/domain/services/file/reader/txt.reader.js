import fs from "fs"
import path from "node:path"
import {saveJson} from "../writer/json.writer.js"
import {isNatusSignature} from "./input-validation.reader.js";

function isTxt(filePath) {
    return path.extname(filePath).toLowerCase() === '.txt'
}

export function readFile(inputPath, outputPath) {
    if (!isTxt(inputPath)) {
        throw new Error("This file extension is not supported")
    }
    const content = fs.readFileSync(inputPath, {
        encoding: 'utf-16le',
        flag: 'r'
    }).replace(/\r\n|\r|\n/g, '\n')
    if (!isNatusSignature(content)) {
        throw new Error("Not Natus data")
    }
    const jsonParsed = parseText(content)
    saveJson(jsonParsed, outputPath)
    return jsonParsed
}

function parseText(text) {
    if (text.length === 0) {
        throw new Error("File must not be empty")
    }
    text = text.replace(/\/\r?\n/g, "");
    text = text.replace(/(-?\d+),(\d+)/g, "$1.$2");
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
