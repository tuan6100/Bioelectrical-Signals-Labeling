export async function getAllLabelsAppApi() {
    return window.biosignalApi.get.allLabels()
}

export async function createAnnotationAppApi(labelDto) {
    return window.biosignalApi.post.createAnnotation(labelDto)
}

export async function updateAnnotationAppApi(annotationId, updateFields) {
    return window.biosignalApi.put.updateAnnotation(annotationId, updateFields)
}

export async function deleteAnnotationAppApi(annotationId) {
    return window.biosignalApi.delete.annotation(annotationId)
}

export async function exportToCsvAppApi(sessionId) {
    return window.biosignalApi.head.exportToCsv(sessionId)
}

export async function exportToExcelAppApi(sessionId, channelId) {
    return window.biosignalApi.head.exportToExcel(sessionId, channelId)
}