import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchAllSessions, fetchDeleteSession } from '../../api/index.js';

let ipcInitialized = false;

function normalizeSessionsResponse(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.contents)) return res.contents;
    return [];
}

export const loadSessions = createAsyncThunk('sessions/loadAll', async () => {
    const res = await fetchAllSessions();
    return normalizeSessionsResponse(res);
});

export const deleteSession = createAsyncThunk('sessions/delete', async (sessionId) => {
    const removedSessionId = await fetchDeleteSession(sessionId);
    return removedSessionId;
});

export const initSessionsIpc = () => (dispatch) => {
    if (ipcInitialized) return;
    ipcInitialized = true;

    if (window.biosignalApi?.on?.sessionStatusUpdated) {
        window.biosignalApi.on.sessionStatusUpdated((updatedSession) => {
            dispatch(sessionStatusUpdated(updatedSession));
        });
    }

    if (window.biosignalApi?.on?.sessionsUpdated) {
        window.biosignalApi.on.sessionsUpdated(() => {
            dispatch(loadSessions());
        });
    }
};

const sessionsSlice = createSlice({
    name: 'sessions',
    initialState: {
        sessions: [],
        loading: false,
        error: '',
        hasLoaded: false
    },
    reducers: {
        sessionStatusUpdated(state, action) {
            const updated = action.payload;
            if (!updated?.sessionId) return;
            state.sessions = state.sessions.map((s) =>
                s.sessionId === updated.sessionId
                    ? { ...s, status: updated.status, updatedAt: updated.updatedAt }
                    : s
            );
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadSessions.pending, (state) => {
                state.loading = true;
                state.error = '';
            })
            .addCase(loadSessions.fulfilled, (state, action) => {
                state.sessions = Array.isArray(action.payload) ? action.payload : [];
                state.loading = false;
                state.error = '';
                state.hasLoaded = true;
            })
            .addCase(loadSessions.rejected, (state) => {
                state.loading = false;
                state.error = 'Failed to load sessions.';
                state.hasLoaded = true;
            })
            .addCase(deleteSession.fulfilled, (state, action) => {
                const removedSessionId = action.payload;
                if (removedSessionId == null) return;
                state.sessions = state.sessions.filter((s) => s.sessionId !== removedSessionId);
            });
    }
});

export const { sessionStatusUpdated } = sessionsSlice.actions;
export default sessionsSlice.reducer;

