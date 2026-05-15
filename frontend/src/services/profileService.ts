import { api } from "@/lib/api";
import type { UserProfile, UserProfileUpdate } from "@/types/profile";

export const profileService = {
  get: () => api.get<UserProfile>("/api/profile"),
  update: (data: UserProfileUpdate) => api.post<UserProfile>("/api/profile", data),
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.postForm<UserProfile>("/api/profile/resume/upload", form);
  },
};
