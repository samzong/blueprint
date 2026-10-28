export type ProgressLink = {
  label: string;
  url: string;
};

export type ProgressItemStatus = "done" | "active" | "next" | "blocked" | "dropped";

export type ProgressItem = {
  id: string;
  title: string;
  status: ProgressItemStatus;
  result: string;
  links: ProgressLink[];
  session?: string;
  operation?: string;
  owner?: string;
};

export type ProgressPhase = {
  id: string;
  title: string;
  items: ProgressItem[];
};

export type ProgressDecision = {
  question: string;
  context: string;
  recommendation: string;
  links: ProgressLink[];
};

export type ProgressConfig = {
  title: string;
  lang: string;
  goal: string;
  updated_at: string;
  status: "on_track" | "at_risk" | "blocked" | "done";
  decisions: ProgressDecision[];
  phases: ProgressPhase[];
};
