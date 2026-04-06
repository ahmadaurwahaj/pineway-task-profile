"use client";

import { httpClient } from "@/lib/http/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

const PROFILE_QUERY_KEY = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const result = await parseResponse(httpClient.actions.profile.$get());
      if (!result.success) throw new Error(result.error.userMessage);
      return result.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      username?: string;
      avatarUrl?: string;
      bio?: string;
      email?: string;
      displayName?: string;
    }) => {
      const result = await parseResponse(
        httpClient.actions.profile.$patch({ json: data }),
      );
      if (!result.success) throw new Error(result.error.userMessage);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
    },
  });
}
