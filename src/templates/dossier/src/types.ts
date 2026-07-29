export type EvidenceLevel = "verified" | "reported" | "inferred" | "unknown";
export type DossierLayout = "continuous" | "sectioned";

export type ReportMeta = {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  audience: string;
  status: string;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
};

export type Finding = {
  title: string;
  summary: string;
  implication: string;
  level: EvidenceLevel;
};

export type Subject = {
  id: string;
  name: string;
  label: string;
  color: string;
  summary: string;
  metrics: Metric[];
  strengths: string[];
  caveat: string;
  sourceIds: string[];
};

export type ComparisonRow = {
  criterion: string;
  values: Record<string, string>;
  evidence: string;
};

export type EvidenceImage = {
  src: string;
  alt: string;
  caption: string;
};

export type Evidence = {
  id: string;
  subjectId?: string;
  title: string;
  finding: string;
  limitation: string;
  implication: string;
  level: EvidenceLevel;
  sourceIds: string[];
  image?: EvidenceImage;
};

export type Source = {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string;
  kind: string;
  url?: string;
};

export type DossierContent = {
  layout: DossierLayout;
  meta: ReportMeta;
  metrics: Metric[];
  findings: Finding[];
  subjects: Subject[];
  comparison: {
    title: string;
    summary: string;
    rows: ComparisonRow[];
  };
  evidence: Evidence[];
  sources: Source[];
};
