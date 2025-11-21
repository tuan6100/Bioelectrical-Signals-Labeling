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

export async function updateAnnotationAppApi(annotationId, updateFields) {
    return window.biosignalApi.post.updateAnnotation(annotationId, updateFields)
}

export async function deleteAnnotationAppApi(annotationId) {
    return window.biosignalApi.post.deleteAnnotation(annotationId)
}

export async function exportLabelAppApi(sessionId) {
    return window.biosignalApi.post.exportLabel(sessionId)
}

export async function showErrorDialogAppApi(title, message) {
    return window.biosignalApi.dialog.showError(title, message)
}
