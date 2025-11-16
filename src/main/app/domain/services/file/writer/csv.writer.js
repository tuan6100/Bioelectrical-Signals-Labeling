import fs from "fs/promises";

export async function saveLabelsToCSV(labelsData, filePath) {
    let csvContent = "Label Name,Samples,Note\n";
    console.log("labelsData:", JSON.stringify(labelsData));
    labelsData.forEach(item => {
        const labelName = item.labelName || "";
        const samples = item.samplesSlice
            ? (Array.isArray(item.samplesSlice) ? item.samplesSlice.join(";") : String(item.samplesSlice))
            : "";
        const note = item.note || "";
        const escapedLabelName = `"${labelName.replace(/"/g, '""')}"`;
        const escapedSamples = `"${samples}"`;
        const escapedNote = `"${note.replace(/"/g, '""')}"`;
        csvContent += `${escapedLabelName},${escapedSamples},${escapedNote}\n`;
    });
    await fs.writeFile(filePath, csvContent, 'utf8');
    return filePath;
}