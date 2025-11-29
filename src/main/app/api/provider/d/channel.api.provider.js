export async function getChannelSamplesAppApi(channelId) {
    return window.biosignalApi.get.channelSamples(channelId)
}

export async function getAnnotationsByChannelAppApi(channelId) {
    return window.biosignalApi.get.annotationsByChannel(channelId)
}