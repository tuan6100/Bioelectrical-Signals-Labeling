// --- AUDIO HELPER ---
let currentAudioSource = null;

export function playEMGSound(samplesChunk) {
    const AudioContext = window.AudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    if (currentAudioSource) {
        currentAudioSource.stop();
        currentAudioSource.disconnect();
    }
    const frameCount = samplesChunk.length;
    if (frameCount < 2) return;
    const startTimeMs = samplesChunk[0].time;
    const endTimeMs = samplesChunk[frameCount - 1].time;
    const realDurationSec = (endTimeMs - startTimeMs) / 1000;
    if (realDurationSec <= 0) return;
    const baseSampleRate = 10000;
    const audioBuffer = audioCtx.createBuffer(1, frameCount, baseSampleRate);
    const channelData = audioBuffer.getChannelData(0);
    let maxVal = 0;
    for (let i = 0; i < frameCount; i++) {
        if (Math.abs(samplesChunk[i].value) > maxVal) maxVal = Math.abs(samplesChunk[i].value);
    }
    if (maxVal < 10) maxVal = 10;
    for (let i = 0; i < frameCount; i++) {
        let val = (samplesChunk[i].value / maxVal) * 1.5;
        channelData[i] = Math.max(-1, Math.min(1, val));
    }
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const bufferDurationSec = frameCount / baseSampleRate;
    source.playbackRate.value = bufferDurationSec / realDurationSec;
    source.connect(audioCtx.destination);
    source.start();
    currentAudioSource = source;
    source.onended = () => {
        if (currentAudioSource === source) currentAudioSource = null;
    };
}