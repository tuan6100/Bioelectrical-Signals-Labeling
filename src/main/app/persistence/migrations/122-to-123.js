import appConfig from "../../config.js";
import Label from "../dao/label.dao.js";

export function migrate122to123(db) {
    if (db.getVersion() !== 122) {
        return
    }
    const findCommonLabel = db.prepare('SELECT label_id FROM labels WHERE labels.name == ?')
    const isCommonLabelExist = findCommonLabel.get("Bình thường")
    if (isCommonLabelExist == null) {
        const commonLabel = new Label(null, "Bình thường")
        commonLabel.insert()
    } else {
        console.log("Found label named \'Bình thường \', skipped migration")
    }
    db.setVersion(appConfig.get('database.version'))
}