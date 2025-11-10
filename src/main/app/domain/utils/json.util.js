export function findKeyValue(obj, pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    let result = null;
    (function search(o) {
        if (!o || typeof o !== "object") return;
        for (const [k, v] of Object.entries(o)) {
            if (regex.test(k)) result = v;
            if (typeof v === "object") search(v);
        }
    })(obj);
    return result;
}
