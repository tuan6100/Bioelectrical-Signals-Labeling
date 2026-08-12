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
            keepUnusedDataFor: 300
        }),

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
            keepUnusedDataFor: 300
        }),

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
        }),

        updateSessionWorkspaceCache: builder.mutation({
            queryFn: () => ({ data: null }),
            onQueryStarted: async ({ sessionId, channelId, newAnnotations }, { dispatch, queryFulfilled }) => {
                const patchResult = dispatch(
                    biosignalApi.util.updateQueryData('getSessionWorkspace', sessionId, (draft) => {
                        if (draft.defaultChannel?.channelId === channelId && draft.defaultChannel?.signal) {
                            draft.defaultChannel.signal.annotations = newAnnotations;
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            }
        })
    })
});

export const {
    useGetAllSessionsQuery,
    useGetSessionWorkspaceQuery,
    useDeleteSessionMutation,
    useUpdateSessionWorkspaceCacheMutation
} = biosignalApi;

