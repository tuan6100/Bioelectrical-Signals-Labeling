import { findNearestTimePoint as nativeFindNearestTimePoint, isNativeAvailable } from "../../binding/index.js";

export function findNearestTimePoint(timeMs, timeSeries) {
    if (isNativeAvailable) {
        const start = performance.now()
        const result = nativeFindNearestTimePoint(timeMs, timeSeries)
        const end = performance.now();
        console.debug(`Time taken to execute native findNearestTimePoint function is ${end - start}ms.`)
        return result;
    }
    const start = performance.now()
    if (!timeSeries || timeSeries.length === 0) {
        return null;
    }
    let left = 0;
    let right = timeSeries.length - 1;
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (timeSeries[mid] < timeMs) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    let res = left > 0 ? (Math.abs(timeSeries[left - 1] - timeMs) <= Math.abs(timeSeries[left] - timeMs) ?
        timeSeries[left - 1] : timeSeries[left]) :
        timeSeries[left];
    const result =  parseFloat(res.toFixed(3));
    const end = performance.now();
    console.debug(`Time taken to execute nodejs findNearestTimePoint function is ${end - start}ms.`)
    return result;
}
