import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchGetAllLabels } from '../../api/index.js';

export const loadLabelCatalog = createAsyncThunk('labels/loadAll', async () => {
    const rows = await fetchGetAllLabels();
    return Array.isArray(rows) ? rows : [];
});

const labelCatalogSlice = createSlice({
    name: 'labelCatalog',
    initialState: {
        labels: [],
        loading: false,
        error: null
    },
    reducers: {
        upsertLabel(state, action) {
            const name = (action.payload?.name || '').trim();
            if (!name) return;
            const exists = state.labels.some((l) => (l.name || '').toLowerCase() === name.toLowerCase());
            if (!exists) {
                state.labels.push({
                    labelId: action.payload?.labelId ?? Date.now(),
                    name,
                    createdAt: action.payload?.createdAt ?? new Date().toISOString()
                });
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadLabelCatalog.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadLabelCatalog.fulfilled, (state, action) => {
                state.labels = Array.isArray(action.payload) ? action.payload : [];
                state.loading = false;
                state.error = null;
            })
            .addCase(loadLabelCatalog.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error || new Error('Failed to load labels.');
            });
    }
});

export const { upsertLabel } = labelCatalogSlice.actions;
export default labelCatalogSlice.reducer;

