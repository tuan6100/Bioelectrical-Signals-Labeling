import { createSlice } from '@reduxjs/toolkit';
import { replaceAll, remove } from './annotationsSlice.js';
import { setChannel } from './workspaceSlice.js';

const selectionSlice = createSlice({
    name: 'selection',
    initialState: {
        selectedAnnotationId: null
    },
    reducers: {
        selectAnnotation(state, action) {
            state.selectedAnnotationId = action.payload ?? null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(replaceAll, (state) => {
                state.selectedAnnotationId = null;
            })
            .addCase(setChannel, (state) => {
                state.selectedAnnotationId = null;
            })
            .addCase(remove, (state, action) => {
                const deletedId = action.payload?.annotationId;
                if (deletedId != null && deletedId === state.selectedAnnotationId) {
                    state.selectedAnnotationId = null;
                }
            });
    }
});

export const { selectAnnotation } = selectionSlice.actions;
export default selectionSlice.reducer;

