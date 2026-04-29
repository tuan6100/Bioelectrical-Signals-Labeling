import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchSessionWorkspace } from '../../api/index.js';
import { replaceAll } from './annotationsSlice.js';

let ipcInitialized = false;

function formatAnnotations(list) {
    if (!Array.isArray(list)) return [];
    return list.map((a) => ({
        annotationId: a.annotationId,
        startTimeMs: a.startTimeMs ?? a.startTime,
        endTimeMs: a.endTimeMs ?? a.endTime,
        labelName: a.label?.name || a.labelName || 'Unknown',
        note: a.note || null,
        needsRevision: !!a.needsRevision,
        label: a.label || null
    }));
}

function extractSignalAnnotations(signal) {
    const ann = signal?.annotations;
    if (!ann) return [];
    return formatAnnotations(Array.isArray(ann) ? ann : [ann]);
}

export const loadWorkspace = createAsyncThunk(
    'workspace/load',
    async ({ sessionId }, { dispatch }) => {
        const data = await fetchSessionWorkspace(sessionId);
        const session = data?.session || null;
        const channels = session?.channels || [];
        const defaultChannelId = data?.defaultChannel?.channelId || (channels.length ? channels[0].channelId : null);
        const defaultSignal = data?.defaultChannel?.signal || null;
        const annotations = extractSignalAnnotations(defaultSignal);
        dispatch(replaceAll({ channelId: defaultChannelId, annotations }));
        return {
            sessionId,
            session,
            channels,
            channelId: defaultChannelId,
            defaultSignal
        };
    }
);

export const initWorkspaceIpc = () => (dispatch) => {
    if (ipcInitialized) return;
    ipcInitialized = true;
    if (window.biosignalApi?.on?.sessionStatusUpdated) {
        window.biosignalApi.on.sessionStatusUpdated((updatedSession) => {
            dispatch(sessionStatusUpdated(updatedSession));
        });
    }
    if (window.biosignalApi?.on?.sessionDoubleCheckedUpdated) {
        window.biosignalApi.on.sessionDoubleCheckedUpdated((updatedSession) => {
            dispatch(sessionDoubleCheckUpdated(updatedSession));
        });
    }
};

const workspaceSlice = createSlice({
    name: 'workspace',
    initialState: {
        sessionId: null,
        loading: false,
        error: null,
        session: null,
        channels: [],
        channelId: null,
        defaultSignal: null
    },
    reducers: {
        setChannel(state, action) {
            state.channelId = action.payload ?? null;
        },
        sessionStatusUpdated(state, action) {
            const upd = action.payload;
            if (!upd?.sessionId || upd.sessionId !== state.sessionId) return;
            if (!state.session) return;
            state.session = {
                ...state.session,
                sessionStatus: upd.status,
                updatedAt: upd.updatedAt
            };
        },
        sessionDoubleCheckUpdated(state, action) {
            const upd = action.payload;
            if (!upd?.sessionId || upd.sessionId !== state.sessionId) return;
            if (!state.session) return;
            state.session = {
                ...state.session,
                isDoubleChecked: upd.isDoubleChecked,
                updatedAt: upd.updatedAt
            };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadWorkspace.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.sessionId = action.meta.arg?.sessionId ?? null;
            })
            .addCase(loadWorkspace.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                state.sessionId = action.payload?.sessionId ?? null;
                state.session = action.payload?.session ?? null;
                state.channels = action.payload?.channels ?? [];
                state.channelId = action.payload?.channelId ?? null;
                state.defaultSignal = action.payload?.defaultSignal ?? null;
            })
            .addCase(loadWorkspace.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error;
            });
    }
});

export const {
    setChannel,
    sessionStatusUpdated,
    sessionDoubleCheckUpdated
} = workspaceSlice.actions;

export default workspaceSlice.reducer;

