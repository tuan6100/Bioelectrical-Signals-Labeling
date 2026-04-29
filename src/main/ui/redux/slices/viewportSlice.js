import { createSlice } from '@reduxjs/toolkit';

const INITIAL_ZOOM_MS = 100;

function clampViewport(vp) {
    const startMs = Math.max(0, Number(vp.startMs));
    const endMs = Math.max(Number(vp.endMs), startMs + 1);
    return { startMs, endMs };
}

const viewportSlice = createSlice({
    name: 'viewport',
    initialState: {
        byChannel: {}
    },
    reducers: {
        setViewport(state, action) {
            const channelId = action.payload?.channelId;
            const viewport = action.payload?.viewport;
            if (channelId == null || !viewport) return;
            state.byChannel[channelId] = clampViewport(viewport);
        },
        resetViewport(state, action) {
            const channelId = action.payload?.channelId;
            const durationMs = Number(action.payload?.durationMs);
            if (channelId == null) return;
            const endMs = Number.isFinite(durationMs) && durationMs > 0
                ? Math.min(durationMs, INITIAL_ZOOM_MS)
                : INITIAL_ZOOM_MS;
            state.byChannel[channelId] = { startMs: 0, endMs };
        }
    }
});

export const { setViewport, resetViewport } = viewportSlice.actions;
export { INITIAL_ZOOM_MS };
export default viewportSlice.reducer;

