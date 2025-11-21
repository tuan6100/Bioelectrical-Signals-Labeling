import fs from "fs/promises";

export async function saveJson(jsonData, outputPath) {
    try {
        const content = JSON.stringify(jsonData, null, 2);
        await fs.writeFile(outputPath, content, { encoding: "utf-8" });
    } catch (err) {
        console.error("Error writing JSON file:", err);
        throw err;
    }
}
