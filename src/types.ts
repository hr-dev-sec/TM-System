export interface PsychometricMetric {
  name: string;
  score: number;
  description: string;
}

export interface CompetencyMetric {
  name: string;
  score: number; // percentage out of 100
  label: string; // e.g. "Advanced (4/5)"
}

export interface IDPItem {
  title: string;
  status: "In Progress" | "Not Started" | "Completed";
  description: string;
  progress: number; // percentage out of 100
}

export interface TrainingItem {
  id: string;
  name: string;
  provider: string;
  date: string;
  type: "Leadership" | "Technical" | "Management" | "Certification";
  status: "Planned" | "In Progress" | "Completed" | "Cancelled";
  notes?: string;
}

export interface TalentProfile {
  id: string;
  name: string;
  gender?: "Laki-laki" | "Perempuan";
  title: string;
  division: string;
  location: string;
  tenure: string;
  readiness: string;
  readinessColor: "emerald" | "amber" | "rose" | "teal";
  avatar: string;
  nik?: string;
  grade?: string;
  birthDate?: string;
  age?: number;
  joinDate?: string;
  psychometric: {
    logicalReasoning: PsychometricMetric;
    leadershipPotential: PsychometricMetric;
    emotionalAgility: PsychometricMetric;
  };
  competencies: CompetencyMetric[];
  idp: IDPItem[];
  customPerformance?: "Low" | "Medium" | "High";
  customPotential?: "Low" | "Medium" | "High";
  nineBoxNotes?: string;
  trainings?: TrainingItem[];
  potentialAssessment?: PotentialAssessment;
  performanceEvaluation?: PerformanceEvaluation;
  importedEvaluasiScore?: number;
  importedEvaluasiCategory?: string;
  importedEvaluasiCode?: number;
  squareOfTalent?: number;
}

export interface PerformanceEvaluation {
  [key: string]: number;
}

export interface PotentialAssessment {
  // Psychological Test scores (a-h, range 1-3)
  kemampuanIntelektual: number; // a
  berpikirKritis: number; // b
  menyelesaikanMasalah: number; // c
  belajarCepat: number; // d
  kesadaranDiri: number; // e
  interpersonal: number; // f
  kecerdasanEmosional: number; // g
  motivasiKomitmen: number; // h

  // Competency scores (l-t, range 1-5)
  businessKnowledge: number; // l
  leadership: number; // m
  problemSolving: number; // n
  interpersonalSkill: number; // o
  strategicMindset: number; // p
  managesComplexity: number; // q
  ensuresAccountability: number; // r
  drivesVision: number; // s
  cultivateInnovation: number; // t

  // Study Background
  studyBackgroundName: string; // w
  studyBackgroundScore: number; // x (range 1-3)
  
  // Target Level
  targetLevel: "SM" | "DM"; // SM standard = 2, DM standard = 3
}

export interface RetiringPosition {
  id: string;
  positionName: string;
  currentIncumbent: string;
  retirementDate: string;
  division: string;
  urgency: "High" | "Medium" | "Low";
  targetCompetencies: string[];
  assignedSuccessorId?: string;
  suitabilityStatus?: "Primary" | "Secondary" | "Emergency";
}

export interface SavedFilter {
  id: string;
  name: string;
  searchTerm: string;
  divisionFilter: string;
  readinessFilter: string;
  description?: string;
  createdAt: string;
  isPreset?: boolean;
}

export interface DeleteConfirmModalConfig {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemSubtitle?: string;
  itemBadge?: string;
  warningText: string;
  confirmButtonText?: string;
  onConfirm: () => void;
}

export interface SupabaseNoticeModalConfig {
  isOpen: boolean;
  type: "success" | "error" | "info" | "syncing";
  title: string;
  message: string;
  details?: string;
  sqlSnippet?: string;
}

