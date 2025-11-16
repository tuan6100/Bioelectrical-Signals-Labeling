export async function getAllLabelsAppApi() {
    return window.biosignalApi.get.allLabels()
}

export async function createLabelAppApi(labelDto) {
    return window.biosignalApi.post.createLabel(labelDto)
}

export async function updateLabelAppApi(labelId, updateFields) {
    return window.biosignalApi.post.updateLabel(labelId, updateFields)
}

export async function deleteLabelAppApi(labelId) {
    return window.biosignalApi.post.deleteLabel(labelId)
}

export async function exportLabelAppApi(sessionId) {
    return window.biosignalApi.post.exportLabel(sessionId)
}