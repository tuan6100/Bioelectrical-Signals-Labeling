import {dialog} from "electron";

export function confirmOverlap() {
    const result = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Overlapping Detected',
        message: 'The annotation time range overlaps with an existing annotation?',
    });
    return  result === 0;
}

export function warnDetetionBeforeExport(inputFileName) {
    return dialog.showMessageBoxSync({
        type: 'warning',
        buttons: ['Export current session', 'Don\'t export', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: `Delete Session ${inputFileName}`,
        message: 'This session has not been exported yet. Do you want to export it to backup your data?',
    });
}

export function warnDetetionBeforeComplete(inputFileName) {
    return dialog.showMessageBoxSync({
        type: 'warning',
        buttons: ['Delete', 'Cancel'],
        title: `Delete Session ${inputFileName}`,
        message: 'This session has not been completed yet. Do you want to export it to backup your data?',
    });
}