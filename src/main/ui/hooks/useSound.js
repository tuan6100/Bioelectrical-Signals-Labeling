let currentAudioSource = null

export function makeSound(samplesChunk, samplingRateHz) {
    const AudioContext = window.AudioContext
    if (!AudioContext) return
    const audioCtx = new AudioContext()
    if (currentAudioSource) {
        currentAudioSource.stop()
        currentAudioSource.disconnect()
    }
    const chunkLen = samplesChunk.length
    if (chunkLen < 2) return
    const startTimeMs = samplesChunk[0].time
    const endTimeMs = samplesChunk[chunkLen - 1].time
    const realDurationSec = (endTimeMs - startTimeMs) / 1000
    if (realDurationSec <= 0) return
    const requiredFrames = Math.floor(realDurationSec * samplingRateHz)
    if (requiredFrames <= 0) return
    const audioBuffer = audioCtx.createBuffer(1, requiredFrames, samplingRateHz)
    const channelData = audioBuffer.getChannelData(0)
    let maxVal = 0
    for (let i = 0; i < chunkLen; i++) {
        if (Math.abs(samplesChunk[i].value) > maxVal) {
            maxVal = Math.abs(samplesChunk[i].value)
        }
    }
    if (maxVal < 10) maxVal = 10
    for (let i = 0; i < requiredFrames; i++) {
        const progress = i / (requiredFrames - 1)
        const originalIndexFloat = progress * (chunkLen - 1)
        const idx1 = Math.floor(originalIndexFloat)
        const idx2 = Math.ceil(originalIndexFloat)
        const fraction = originalIndexFloat - idx1
        const val1 = samplesChunk[idx1].value
        const val2 = samplesChunk[idx2].value
        const interpolatedValue = val1 + (val2 - val1) * fraction
        const valNormalized = (interpolatedValue / maxVal) * 1.5
        channelData[i] = Math.max(-1, Math.min(1, valNormalized))
    }
    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioCtx.destination)
    source.start()
    currentAudioSource = source
    source.onended = () => {
        if (currentAudioSource === source) currentAudioSource = null
    }
}