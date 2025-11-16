import Label from "../../../../persistence/dao/label.dao.js";


export function getAllLabels() {
    return Label.findAll();
}


export function getLabelById(labelId) {
    return Label.findOneById(labelId);
}


export function getLabelByName(name) {
    return Label.findOneByName(name);
}

