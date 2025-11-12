
export function parseVietnameseDateTime(dateTimeString) {
    const parts = dateTimeString.split(' ');
    if (parts.length !== 3) {
        throw new Error(`Invalid date-time format: "${dateTimeString}"`);
    }
    const [datePart, timePart, periodPart] = parts;
    const [day, month, year] = datePart.split('/').map(Number);
    let [hours, minutes, seconds] = timePart.split(':').map(Number);
    const period = periodPart.toUpperCase();
    if (period === 'CH') {
        if (hours < 12) {
            hours += 12;
        }
    } else if (period === 'SA') {
        if (hours === 12) {
            hours = 0;
        }
    } else {
        throw new Error(`Invalid time period: "${periodPart}"`);
    }
    return new Date(year, month - 1, day, hours, minutes, seconds);
}
