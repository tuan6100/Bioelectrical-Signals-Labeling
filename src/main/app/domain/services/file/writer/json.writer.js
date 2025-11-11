import fs from "fs";
import {app} from "electron";

export function saveJson(jsonData, outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
}