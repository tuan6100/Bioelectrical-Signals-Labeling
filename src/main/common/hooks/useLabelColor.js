export function getBaseColor(labelName) {
    const name = (labelName || '').trim().toLowerCase();
    if (name === 'unknown') return '#FF7F00';
    if (name === 'nghi ngờ') return '#ea513d';
    return '#4da3ff';
}