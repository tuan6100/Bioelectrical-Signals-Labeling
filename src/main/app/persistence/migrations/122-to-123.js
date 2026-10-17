import appConfig from "../../config.js";
import Label from "../dao/label.dao.js";

const missingLabels = ["Bình thường", "Nghi ngờ"]

export function migrate122to123(db) {
    if (db.getVersion() !== 122) {
        return
    }
    const findLabelStatement = db.prepare('SELECT label_id FROM labels WHERE labels.name == ?')
    missingLabels
        .filter(label => {
            const found = findLabelStatement.get(label)
            return found == null
        })
        .forEach(label => {
            const commonLabel = new Label(null, label)
            commonLabel.insert()
        })
    db.setVersion(appConfig.get('database.version'))
}