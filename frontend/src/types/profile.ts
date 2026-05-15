export interface UserProfile {
  id: string;
  resume_text: string | null;
  about_me: string | null;
  updated_at: string;
}

export interface UserProfileUpdate {
  resume_text?: string;
  about_me?: string;
}
