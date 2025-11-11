import fs from "fs";

export function saveJson(jsonData, outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
}