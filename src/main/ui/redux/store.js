import { configureStore } from '@reduxjs/toolkit';
import sessionsReducer from './slices/sessionsSlice.js';
import workspaceReducer from './slices/workspaceSlice.js';
import annotationsReducer from './slices/annotationsSlice.js';
import selectionReducer from './slices/selectionSlice.js';
import { biosignalApi } from './api/index.js';

export const store = configureStore({
    reducer: {
        sessions: sessionsReducer,
        workspace: workspaceReducer,
        annotations: annotationsReducer,
        selection: selectionReducer,
        [biosignalApi.reducerPath]: biosignalApi.reducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(biosignalApi.middleware)
});

