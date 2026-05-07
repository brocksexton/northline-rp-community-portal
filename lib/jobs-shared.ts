export type JobPostingStatus = 'active' | 'hidden' | 'closed';
export type JobQuestionType = 'short' | 'long' | 'yesno' | 'select' | 'scale';
export type JobApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'withdrawn';
export type JobNoteVisibility = 'applicant' | 'staff';

export type JobQuestion = {
  id: string;
  label: string;
  help: string;
  type: JobQuestionType;
  required: boolean;
  options?: string[];
};

export type JobApplicationStep = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  questions: JobQuestion[];
};

export type JobPosting = {
  id: string;
  title: string;
  department: string;
  summary: string;
  description: string;
  commitment: string;
  icon: string;
  accent: string;
  status: JobPostingStatus;
  expectations: string[];
  qualities: string[];
  questions: JobQuestion[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
};

export type JobApplicationNote = {
  id: string;
  authorSteamId: string;
  authorRole: string;
  visibility: JobNoteVisibility;
  body: string;
  createdAt: string;
};

export type JobApplicationAnswer = {
  questionId: string;
  label: string;
  value: string;
};

export type JobApplication = {
  id: string;
  steamId: string;
  jobPostingId: string;
  jobTitle: string;
  status: JobApplicationStatus;
  answers: JobApplicationAnswer[];
  notes: JobApplicationNote[];
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  applicantViewedAt: string | null;
};

export type PublicJobsState = {
  postings: JobPosting[];
  applications: JobApplication[];
};

export type JobsAdminState = {
  postings: JobPosting[];
  applications: JobApplication[];
  stats: {
    totalApplications: number;
    openApplications: number;
    approvedApplications: number;
    declinedApplications: number;
    visiblePostings: number;
    hiddenPostings: number;
  };
};

export const DEFAULT_APPLICATION_STEPS: JobApplicationStep[] = [
  {
    id: 'identity', eyebrow: 'Step 1', title: 'Who are we talking to?', description: 'Start with the practical details staff need before reviewing your fit.',
    questions: [
      { id: 'display_name', label: 'Preferred display name', help: 'The name staff should use when discussing this application.', type: 'short', required: true },
      { id: 'discord_name', label: 'Discord username', help: 'Include the exact username you use in the Northline community Discord.', type: 'short', required: true },
      { id: 'timezone', label: 'Timezone', help: 'Example: EST, PST, GMT, CET, AEST.', type: 'short', required: true },
      { id: 'age_confirmed', label: 'I meet the minimum age/maturity expectations for staff.', help: 'Staff may verify this during follow-up.', type: 'yesno', required: true },
    ],
  },
  {
    id: 'experience', eyebrow: 'Step 2', title: 'Roleplay and community experience', description: 'Tell us what kind of RP environments you understand and how you have helped communities before.',
    questions: [
      { id: 'rp_experience', label: 'Summarize your RP experience.', help: 'Mention serious RP, semi-serious RP, sandbox/server moderation, or community leadership experience.', type: 'long', required: true },
      { id: 'staff_experience', label: 'Have you staffed or moderated anywhere before?', help: 'Name the type of server/community, your responsibilities, and anything you learned.', type: 'long', required: false },
      { id: 'why_northline', label: 'Why do you want to help Northline RP?', help: 'Focus on what you want to improve, protect, or build here.', type: 'long', required: true },
    ],
  },
  {
    id: 'availability', eyebrow: 'Step 3', title: 'Availability and reliability', description: 'Moderation is most useful when staff are predictable and honest about their time.',
    questions: [
      { id: 'hours_per_week', label: 'Expected weekly availability', help: 'Pick the range you can realistically maintain.', type: 'select', required: true, options: ['0-3 hours', '4-8 hours', '9-14 hours', '15+ hours'] },
      { id: 'active_windows', label: 'When are you usually active?', help: 'Mention days, times, and any schedule limits.', type: 'long', required: true },
      { id: 'has_microphone', label: 'I can use voice chat when staff situations require it.', help: 'Some situations are easier to resolve quickly by voice.', type: 'yesno', required: true },
    ],
  },
  {
    id: 'judgement', eyebrow: 'Step 4', title: 'Judgement checks', description: 'These are not trick questions. We want to see how you reason through common staff moments.',
    questions: [
      { id: 'scenario_rulebreak', label: 'A friend breaks a rule during a scene you are in. What do you do?', help: 'Explain the immediate response and what you would document afterward.', type: 'long', required: true },
      { id: 'scenario_conflict', label: 'Two players are angry and both claim the other powergamed. How do you calm it down?', help: 'Walk through your process before punishment is considered.', type: 'long', required: true },
      { id: 'confidentiality', label: 'I understand staff conversations and evidence are private unless leadership says otherwise.', help: 'This protects applicants, players, victims, and staff integrity.', type: 'yesno', required: true },
    ],
  },
  {
    id: 'fit', eyebrow: 'Step 5', title: 'Fit and final notes', description: 'Close with self-awareness. Good staff can name both strengths and growth areas.',
    questions: [
      { id: 'strengths', label: 'What would make you a strong staff member?', help: 'Be specific. Patience, logs, scene knowledge, conflict control, teaching, and consistency all matter.', type: 'long', required: true },
      { id: 'growth_area', label: 'What is one thing you are still improving?', help: 'Honest answers are stronger than perfect-sounding answers.', type: 'long', required: true },
      { id: 'final_notes', label: 'Anything else staff should know?', help: 'Optional context, references, schedule notes, or concerns.', type: 'long', required: false },
    ],
  },
];

export function allQuestionsForPosting(posting: Pick<JobPosting, 'questions'>): JobQuestion[] {
  return [...DEFAULT_APPLICATION_STEPS.flatMap((step) => step.questions), ...posting.questions];
}

export function stepsForPosting(posting: Pick<JobPosting, 'questions'>): JobApplicationStep[] {
  if (!posting.questions.length) return DEFAULT_APPLICATION_STEPS;
  return [...DEFAULT_APPLICATION_STEPS, { id: 'position-specific', eyebrow: 'Final step', title: 'Position-specific questions', description: 'These questions are tuned by staff for this exact posting.', questions: posting.questions }];
}

export function statusLabel(status: JobApplicationStatus) {
  switch (status) {
    case 'submitted': return 'Submitted';
    case 'under_review': return 'Under review';
    case 'approved': return 'Approved';
    case 'declined': return 'Declined';
    case 'withdrawn': return 'Withdrawn';
    default: return 'Submitted';
  }
}

export function postingStatusLabel(status: JobPostingStatus) {
  switch (status) {
    case 'active': return 'Active';
    case 'hidden': return 'Hidden';
    case 'closed': return 'Closed';
    default: return 'Hidden';
  }
}
