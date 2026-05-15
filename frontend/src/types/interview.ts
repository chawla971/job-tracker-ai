export interface Interview {
  id: string;
  job_id: string;
  round_type: string;
  date_time: string;
  interviewer_name: string | null;
  prep_notes: string | null;
  post_interview_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewCreate {
  job_id: string;
  round_type: string;
  date_time: string;
  interviewer_name?: string;
  prep_notes?: string;
  post_interview_notes?: string;
}

export interface InterviewUpdate {
  round_type?: string;
  date_time?: string;
  interviewer_name?: string;
  prep_notes?: string;
  post_interview_notes?: string;
}
