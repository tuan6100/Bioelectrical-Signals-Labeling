import Label from "../../../../persistence/dao/label.dao.js";


export function getAllLabels() {
    return Label.findAll();
}

