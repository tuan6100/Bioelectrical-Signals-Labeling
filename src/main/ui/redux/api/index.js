import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
    fetchAllSessions,
    fetchSessionWorkspace,
    fetchDeleteSession
} from '../../api/index.js';

export const biosignalApi = createApi({
    reducerPath: 'biosignalApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Sessions', 'SessionWorkspace'],
    endpoints: (builder) => ({
        // Fetch all sessions with optional filters
        getAllSessions: builder.query({
            queryFn: async () => {
                try {
                    const res = await fetchAllSessions();
                    const sessions = Array.isArray(res)
                        ? res
                        : (Array.isArray(res?.contents) ? res.contents : []);
                    return { data: sessions };
                } catch (error) {
                    return { error: error.message };
                }
            },
            providesTags: ['Sessions'],
            // Keep cached data for 5 minutes
            keepUnusedDataFor: 300
        }),

        // Fetch a single session workspace
        getSessionWorkspace: builder.query({
            queryFn: async (sessionId) => {
                try {
                    const data = await fetchSessionWorkspace(sessionId);
                    return { data };
                } catch (error) {
                    return { error: error.message };
                }
            },
            providesTags: (result, error, sessionId) => [
                { type: 'SessionWorkspace', id: sessionId }
            ],
            // Keep cached data for 5 minutes
            keepUnusedDataFor: 300
        }),

        // Delete a session
        deleteSession: builder.mutation({
            queryFn: async (sessionId) => {
                try {
                    const removedSessionId = await fetchDeleteSession(sessionId);
                    return { data: removedSessionId };
                } catch (error) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Sessions']
        })
    })
});

export const {
    useGetAllSessionsQuery,
    useGetSessionWorkspaceQuery,
    useDeleteSessionMutation
} = biosignalApi;

