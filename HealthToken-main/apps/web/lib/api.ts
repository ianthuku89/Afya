'use client';
import { useSession } from 'next-auth/react';
import useSWR, { SWRConfiguration } from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useAuthFetcher() {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;

    const fetcher = async (url: string) => {
        const res = await fetch(`${API_BASE}${url}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        const json = await res.json();
        return json.data;
    };

    return { fetcher, token, isAuthenticated: !!token };
}

export function useAdminAPI(path: string, config?: SWRConfiguration) {
    const { fetcher, token } = useAuthFetcher();
    return useSWR(token ? path : null, fetcher, { refreshInterval: 10000, ...config });
}
