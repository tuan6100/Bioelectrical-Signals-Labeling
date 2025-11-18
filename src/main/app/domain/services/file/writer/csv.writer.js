import fs from "fs/promises";
import { shell } from "electron";

export async function saveLabelsToCSV(labelsData, filePath) {
    let csvContent = "Label Name,Samples,Unit,Note\n";
    labelsData.forEach(item => {
        const labelName = item.labelName || "";
        const rawSlice = item.samplesSlice;
        let scaledSamples = "";
        if (Array.isArray(rawSlice)) {
            const arr = rawSlice.map(v => {
                const n = Number(v);
                return Number.isFinite(n) ? (n * 0.001).toFixed(4) : String(v);
            });
            scaledSamples = arr.join(";");
        } else if (typeof rawSlice === 'string' && rawSlice.trim() !== '') {
            const parts = rawSlice.split(/[;,]/);
            const arr = parts.map(p => {
                const n = Number(p);
                return Number.isFinite(n) ? (n * 0.001).toFixed(4) : p.trim();
            });
            scaledSamples = arr.join(";");
        }
        const unit = "mV";
        const note = item.note || "";
        const escapedLabelName = `"${labelName.replace(/"/g, '""')}"`;
        const escapedSamples = `"${scaledSamples.replace(/"/g, '""')}"`;
        const escapedUnit = `"${unit}"`;
        const escapedNote = `"${note.replace(/"/g, '""')}"`;
        csvContent += `${escapedLabelName},${escapedSamples},${escapedUnit},${escapedNote}\n`;
    });
    await fs.writeFile(filePath, csvContent, 'utf8');
    const openResult = await shell.openPath(filePath);
    if (openResult) {
        console.warn(`Failed to open exported file: ${openResult}`);
    }
    return filePath;
}