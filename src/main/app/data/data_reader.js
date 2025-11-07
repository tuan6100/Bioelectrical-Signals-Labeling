import fs from 'fs';
import path from 'node:path';
import {app} from 'electron';

export function readFile(filePath) {
    const content = fs.readFileSync(filePath, { encoding: 'utf-16le', flag: 'r' })
        .replace(/\r\n|\r|\n/g, '\n');
    const jsonParsed = parseEmgText(content);
    saveEmgJson(jsonParsed);
    return jsonParsed
}

function parseEmgText(text) {
    text = text.replace(/\/\r?\n/g, "");
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



function getStoragePath() {
    const baseDir = app.getPath('userData');
    const storageDir = path.join(baseDir, 'Local Storage');
    fs.mkdirSync(storageDir, { recursive: true });
    return path.join(storageDir, 'data.json');
}

export function saveEmgJson(jsonData, outputPath = getStoragePath()) {
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
}



