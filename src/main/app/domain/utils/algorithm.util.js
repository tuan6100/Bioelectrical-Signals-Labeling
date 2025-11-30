export function findNearestTimePoint(timeMs, timeSeries) {
    if (timeSeries.length === 0) return null
    if (timeSeries.length === 1) return parseFloat(timeSeries[0].toFixed(3))
    let left = 0
    let right = timeSeries.length - 1
    while (left < right) {
        const mid = Math.floor((left + right) / 2)
        if (timeSeries[mid] < timeMs) {
            left = mid + 1
        } else {
            right = mid
        }
    }
    let result
    if (left > 0) {
        const distLeft = Math.abs(timeSeries[left - 1] - timeMs)
        const distRight = Math.abs(timeSeries[left] - timeMs)
        result = distLeft <= distRight ? timeSeries[left - 1] : timeSeries[left]
    } else {
        result = timeSeries[left]
    }

    return parseFloat(result.toFixed(3))
}