import fs from "fs";

export async function saveJson(jsonData, outputPath) {
    fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8', (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        }
    })

}