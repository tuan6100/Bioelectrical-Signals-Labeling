export async function createLabelAppApi(labelDto) {
    return window.biosignalApi.post.createLabel(labelDto)
}

export async function exportLabelAppApi(sessionId) {
    return window.biosignalApi.post.exportLabel(sessionId)
}