import Label from "@biosignal/app/persistence/dao/label.dao.js";


export function getAllLabels() {
    return Label.findAll();
}

