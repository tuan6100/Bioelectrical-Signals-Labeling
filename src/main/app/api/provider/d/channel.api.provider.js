export async function getChannelSamplesAppApi(channelId) {
    return window.biosignalApi.get.channelSamples(channelId)
}