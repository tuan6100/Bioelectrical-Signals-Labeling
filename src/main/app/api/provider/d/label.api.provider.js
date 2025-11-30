export async function getAllLabelsAppApi() {
    return window.biosignalApi.get.allLabels()
}

export async function updateLabelAppApi(labelId, updateFields) {
    return window.biosignalApi.put.updateLabel(labelId, updateFields)
}

export async function deleteLabelAppApi(labelId) {
    return window.biosignalApi.delete.deleteLabel(labelId)
}

export async function createAnnotationAppApi(labelDto) {
    return window.biosignalApi.post.createAnnotation(labelDto)
}

export async function updateAnnotationAppApi(annotationId, updateFields, force = false) {
    return window.biosignalApi.put.updateAnnotation(annotationId, updateFields, force)
}

export async function deleteAnnotationAppApi(annotationId) {
    return window.biosignalApi.put.deleteAnnotation(annotationId)
}

export async function exportToCsvAppApi(sessionId) {
    return window.biosignalApi.head.exportToCsv(sessionId)
}

export async function exportToExcelAppApi(channelId) {
    return window.biosignalApi.head.exportToExcel(channelId)
}