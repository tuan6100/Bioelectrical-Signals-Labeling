import { dialog } from "electron";

export function confirmOverlap() {
    const result = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Overlapping Detected',
        message: 'The annotation time range overlaps with an existing annotation?',
    });
    return  result === 0;
}