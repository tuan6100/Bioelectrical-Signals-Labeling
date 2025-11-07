export function findKeyValue(obj, pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    let result = null;
    (function search(o) {
        if (!o || typeof o !== "object") return;
        for (const [key, value] of Object.entries(o)) {
            if (regex.test(key)) result = value;
            if (typeof value === "object") search(value);
        }
    })(obj);
    return result;
}
