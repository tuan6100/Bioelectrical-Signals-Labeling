export async function getSessionInfoAppApi(sessionId) {
    return window.biosignalApi.get.sessionInfo(sessionId)
}



