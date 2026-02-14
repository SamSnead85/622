// ============================================
// useApiQuery — Declarative data fetching hook
// ============================================
//
// Wraps apiFetch with React state management so components don't
// need to manually manage loading/error/data states.
//
// Usage:
//   const { data, isLoading, error, refetch } = useApiQuery<CommentsResponse>(
//       postId ? API.comments(postId) : null,
//       { transform: (raw) => mapServerComments(raw.comments) }
//   );

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

// ── Types ───────────────────────────────────────────

export interface UseApiQueryOptions<TRaw, TData> {
    /** Transform the raw API response into the desired shape */
    transform?: (raw: TRaw) => TData;
    /** If false, the query will not execute. Default: true */
    enabled?: boolean;
    /** If true, will not show loading state on refetch (only on initial load) */
    keepPreviousData?: boolean;
}

export interface UseApiQueryResult<TData> {
    /** The transformed data, or null if not yet loaded */
    data: TData | null;
    /** True during the initial load (not during refetch if keepPreviousData is true) */
    isLoading: boolean;
    /** True during any fetch (initial or refetch) */
    isFetching: boolean;
    /** Error message, or null if no error */
    error: string | null;
    /** Manually trigger a refetch */
    refetch: () => Promise<void>;
}

// ── Hook ────────────────────────────────────────────

export function useApiQuery<TData = unknown, TRaw = TData>(
    endpoint: string | null,
    options?: UseApiQueryOptions<TRaw, TData>
): UseApiQueryResult<TData> {
    const { transform, enabled = true, keepPreviousData = false } = options ?? {};

    const [data, setData] = useState<TData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track the latest request to prevent stale responses
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchData = useCallback(async (isRefetch = false) => {
        if (!endpoint || !enabled) return;

        const currentRequestId = ++requestIdRef.current;

        if (!isRefetch || !keepPreviousData) {
            setIsLoading(true);
        }
        setIsFetching(true);
        setError(null);

        try {
            const raw = await apiFetch<TRaw>(endpoint);

            // Ignore stale responses
            if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return;

            const result = transform ? transform(raw) : (raw as unknown as TData);
            setData(result);
        } catch (err: unknown) {
            if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return;

            const message =
                err instanceof Error ? err.message : 'Something went wrong';
            setError(message);
        } finally {
            if (isMountedRef.current && currentRequestId === requestIdRef.current) {
                setIsLoading(false);
                setIsFetching(false);
            }
        }
    }, [endpoint, enabled, transform, keepPreviousData]);

    // Fetch on mount and when endpoint/enabled changes
    useEffect(() => {
        if (endpoint && enabled) {
            fetchData(false);
        } else {
            // Reset state when disabled
            setData(null);
            setIsLoading(false);
            setIsFetching(false);
            setError(null);
        }
    }, [endpoint, enabled, fetchData]);

    const refetch = useCallback(async () => {
        await fetchData(true);
    }, [fetchData]);

    return { data, isLoading, isFetching, error, refetch };
}

// ── useApiMutation ──────────────────────────────────
//
// For POST/PUT/DELETE operations with optimistic update support.
//
// Usage:
//   const { mutate, isLoading } = useApiMutation<CreateCommentResponse>(
//       API.comments(postId),
//       { method: 'POST', onSuccess: (data) => addComment(data) }
//   );
//   await mutate({ content: 'Hello!' });

export interface UseApiMutationOptions<TResponse> {
    /** HTTP method. Default: 'POST' */
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Called with the response data on success */
    onSuccess?: (data: TResponse) => void;
    /** Called with the error on failure */
    onError?: (error: Error) => void;
    /** Called after both success and failure */
    onSettled?: () => void;
}

export interface UseApiMutationResult<TResponse, TBody = Record<string, unknown>> {
    /** Execute the mutation */
    mutate: (body?: TBody) => Promise<TResponse | null>;
    /** True while the mutation is in flight */
    isLoading: boolean;
    /** Error from the last mutation attempt */
    error: string | null;
    /** Reset the error state */
    reset: () => void;
}

export function useApiMutation<TResponse = unknown, TBody = Record<string, unknown>>(
    endpoint: string,
    options?: UseApiMutationOptions<TResponse>
): UseApiMutationResult<TResponse, TBody> {
    const { method = 'POST', onSuccess, onError, onSettled } = options ?? {};

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const mutate = useCallback(
        async (body?: TBody): Promise<TResponse | null> => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await apiFetch<TResponse>(endpoint, {
                    method,
                    ...(body != null && { body: JSON.stringify(body) }),
                });

                if (!isMountedRef.current) return response;

                onSuccess?.(response);
                return response;
            } catch (err: unknown) {
                const apiError = err instanceof Error ? err : new Error('Mutation failed');

                if (isMountedRef.current) {
                    setError(apiError.message);
                }

                onError?.(apiError);
                return null;
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
                onSettled?.();
            }
        },
        [endpoint, method, onSuccess, onError, onSettled]
    );

    const reset = useCallback(() => {
        setError(null);
    }, []);

    return { mutate, isLoading, error, reset };
}
