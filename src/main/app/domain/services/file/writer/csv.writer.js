import fs from "fs";
import path from "path";

export async function saveLabelsToCSV(labelsData, directory, fileName) {
    const filePath = path.join(directory, fileName);
    let csvContent = "Label Name,Samples,Note\n";
    labelsData.forEach(item => {
        const labelName = item.labelName || "";
        const samples = item.samplesSlice ? item.samplesSlice.join(";") : "";
        const note = item.note || "";

        const escapedLabelName = `"${labelName.replace(/"/g, '""')}"`;
        const escapedSamples = `"${samples}"`;
        const escapedNote = `"${note.replace(/"/g, '""')}"`;
        csvContent += `${escapedLabelName},${escapedSamples},${escapedNote}\n`;
    });
    await fs.writeFile(filePath, csvContent, (err) => {
        if (err) {
            throw err
        }
    });
    return filePath;
}