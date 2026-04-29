import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    fetchCreateAnnotation,
    fetchDeleteAnnotation,
    fetchUpdateAnnotation
} from '../../api/index.js';

function normalizeAnnotation(ann) {
    if (!ann) return null;
    return {
        ...ann,
        annotationId: ann.annotationId ?? ann.id,
        startTimeMs: Number(ann.startTimeMs),
        endTimeMs: Number(ann.endTimeMs),
        labelName: ann.labelName || ann.name || ann.label?.name || 'Unknown'
    };
}

export const createAnnotation = createAsyncThunk(
    'annotations/create',
    async ({ channelId, startTimeMs, endTimeMs, labelName = 'Unknown', note = '' }) => {
        const created = await fetchCreateAnnotation({
            channelId,
            startTime: startTimeMs,
            endTime: endTimeMs,
            name: labelName,
            note
        });
        return normalizeAnnotation(created);
    }
);

export const updateAnnotation = createAsyncThunk(
    'annotations/update',
    async ({ annotationId, fields }) => {
        const updated = await fetchUpdateAnnotation(annotationId, fields);
        return normalizeAnnotation(updated);
    }
);

export const deleteAnnotation = createAsyncThunk(
    'annotations/delete',
    async ({ annotationId }) => {
        const ok = await fetchDeleteAnnotation(annotationId);
        return ok ? annotationId : null;
    }
);

const annotationsSlice = createSlice({
    name: 'annotations',
    initialState: {
        channelId: null,
        annotations: []
    },
    reducers: {
        replaceAll(state, action) {
            const channelId = action.payload?.channelId ?? null;
            const list = Array.isArray(action.payload?.annotations) ? action.payload.annotations : [];
            state.channelId = channelId;
            state.annotations = list.filter(Boolean).map((a) => ({
                ...a,
                annotationId: a.annotationId ?? a.id,
                startTimeMs: Number(a.startTimeMs),
                endTimeMs: Number(a.endTimeMs)
            }));
        },
        upsert(state, action) {
            const ann = action.payload?.annotation;
            if (!ann) return;
            const normalized = normalizeAnnotation(ann);
            if (!normalized?.annotationId) return;
            const idx = state.annotations.findIndex(
                (x) => (x.annotationId ?? x.id) === normalized.annotationId
            );
            if (idx >= 0) state.annotations[idx] = { ...state.annotations[idx], ...normalized };
            else state.annotations.push(normalized);
        },
        remove(state, action) {
            const annotationId = action.payload?.annotationId;
            if (annotationId == null) return;
            state.annotations = state.annotations.filter(
                (x) => (x.annotationId ?? x.id) !== annotationId
            );
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(createAnnotation.fulfilled, (state, action) => {
                const ann = action.payload;
                if (!ann?.annotationId) return;
                const idx = state.annotations.findIndex(
                    (x) => (x.annotationId ?? x.id) === ann.annotationId
                );
                if (idx >= 0) state.annotations[idx] = { ...state.annotations[idx], ...ann };
                else state.annotations.push(ann);
            })
            .addCase(updateAnnotation.fulfilled, (state, action) => {
                const ann = action.payload;
                if (!ann?.annotationId) return;
                const idx = state.annotations.findIndex(
                    (x) => (x.annotationId ?? x.id) === ann.annotationId
                );
                if (idx >= 0) state.annotations[idx] = { ...state.annotations[idx], ...ann };
                else state.annotations.push(ann);
            })
            .addCase(deleteAnnotation.fulfilled, (state, action) => {
                const annotationId = action.payload;
                if (annotationId == null) return;
                state.annotations = state.annotations.filter(
                    (x) => (x.annotationId ?? x.id) !== annotationId
                );
            });
    }
});

export const { replaceAll, upsert, remove } = annotationsSlice.actions;
export default annotationsSlice.reducer;

