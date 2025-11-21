export async function getSessionInfoAppApi(sessionId) {
    return window.biosignalApi.get.sessionInfo(sessionId)
}

export async function getAllSessionsAppApi(page = 1, size = 10) {
    return window.biosignalApi.get.sessionsPage(page, size)
}

export async function getSessionsByPatientIdAppApi(patientId) {
    return window.biosignalApi.get.sessionsByPatient(patientId)
}
