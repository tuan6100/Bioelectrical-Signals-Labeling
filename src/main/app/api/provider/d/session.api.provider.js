export async function getSessionInfoAppApi(sessionId) {
    return window.biosignalApi.get.sessionInfo(sessionId)
}

export async function getAllSessionsAppApi(page = 1, size = 10) {
    return window.biosignalApi.get.sessionsPage(page, size)
}

export async function getSessionsByPatientIdAppApi(patientId) {
    return window.biosignalApi.get.sessionsByPatient(patientId)
}

export async function updateSessionStatusAppApi(sessionId, newStatus) {
    return window.biosignalApi.put.updateSessionStatus(sessionId, newStatus)
}

export async function enableDoubleCheckAppApi(channelId) {
    return window.biosignalApi.put.enableDoubleCheck(channelId)
}

export async function disableDoubleCheckAppApi(channelId) {
    return window.biosignalApi.put.disableDoubleCheck(channelId)
}

export async function setChannelDoubleCheckedAppApi(sessionId, channelId, isDoubleChecked) {
    return window.biosignalApi.put.setChannelDoubleChecked(sessionId, channelId, isDoubleChecked)
}

export async function deleteSessionAppApi(sessionId) {
    return window.biosignalApi.delete.session(sessionId)
}
