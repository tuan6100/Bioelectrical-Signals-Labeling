import fs, { closeSync, openSync, readSync } from "fs";
import path from "node:path";
import {saveJson} from "../writer/json.writer.js";

function isTxt(filePath) {
    return path.extname(filePath).toLowerCase() === '.txt'
}

function getFileEncoding(filePath) {
    const byteOrderMark = Buffer.alloc(5, 0); // Generate an empty BOM.
    const fileDescriptor = openSync(filePath, 'r');
    readSync(fileDescriptor, byteOrderMark, 0, 5, 0);
    closeSync(fileDescriptor);
    let encoding;
    if (
        !encoding &&
        byteOrderMark[0] === 0xef &&
        byteOrderMark[1] === 0xbb &&
        byteOrderMark[2] === 0xbf
    ) encoding = 'utf8';
    if (!encoding && byteOrderMark[0] === 0xfe && byteOrderMark[1] === 0xff) encoding = 'utf16be';
    if (!encoding && byteOrderMark[0] === 0xff && byteOrderMark[1] === 0xfe) encoding = 'utf16le';
    if (!encoding) encoding = 'unknown';
    return encoding;
}

export function readFile(inputPath, outputPath) {
    if (!isTxt(inputPath)) {
        throw new Error("This file extension is not supported")
    }
    const content = fs.readFileSync(inputPath, { encoding: getFileEncoding(inputPath), flag: 'r' })
        .replace(/\r\n|\r|\n/g, '\n');
    const jsonParsed = parseText(content);
    saveJson(jsonParsed, outputPath);
    return jsonParsed
}

function parseText(text) {
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
