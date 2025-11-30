export async function getAllLabelsAppApi() {
    return window.biosignalApi.get.allLabels()
}

export async function updateLabelAppApi(labelId, updateFields) {
    return window.biosignalApi.post.updateLabel(labelId, updateFields)
}

export async function deleteLabelAppApi(labelId) {
    return window.biosignalApi.post.deleteLabel(labelId)
}

export async function createAnnotationAppApi(labelDto) {
    return window.biosignalApi.post.createAnnotation(labelDto)
}

export async function updateAnnotationAppApi(annotationId, updateFields, force = false) {
    return window.biosignalApi.post.updateAnnotation(annotationId, updateFields, force)
}

export async function deleteAnnotationAppApi(annotationId) {
    return window.biosignalApi.post.deleteAnnotation(annotationId)
}

export async function exportLabelAppApi(sessionId) {
    return window.biosignalApi.post.exportLabel(sessionId)
}
