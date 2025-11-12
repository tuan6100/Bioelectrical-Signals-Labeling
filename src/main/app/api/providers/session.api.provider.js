export async function provideSessionAppApi(payload) {
    window.biosignalApi.provide.sessionId(payload)
}

export async function getSessionInfoAppApi(sessionId) {
    return window.biosignalApi.get.sessionInfo(sessionId)
}

export async function getChannelSamplesAppApi(channelId) {
    return window.biosignalApi.get.channelSamples(channelId)
}