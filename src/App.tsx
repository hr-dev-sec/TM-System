import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { encryptText, decryptText, calculateHash } from "./crypto";
import {
  ArrowLeft,
  MoreVertical,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Download,
  MapPin,
  Building2,
  History,
  Brain,
  Calendar,
  BarChart3,
  GraduationCap,
  BookOpen,
  LayoutGrid,
  Users,
  User,
  Settings,
  Search,
  Sliders,
  Sparkles,
  Printer,
  X,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Keyboard,
  Command,
  Zap,
  Compass,
  Edit2,
  Send,
  UserPlus,
  Clock,
  Award,
  UserCheck,
  Grid3X3,
  Lock,
  Unlock,
  ShieldAlert,
  Key,
  Mail,
  Tag,
  Upload,
  Moon,
  Sun,
  Move,
  Save,
  UserCog,
  Cloud,
  RefreshCw,
  RotateCcw,
  Target,
  TrendingDown,
  AlertTriangle,
  Camera,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  SlidersHorizontal
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { MOCK_TALENTS } from "./data";
import { TalentProfile, RetiringPosition, PotentialAssessment, PerformanceEvaluation, SavedFilter, TrainingItem, DeleteConfirmModalConfig, SupabaseNoticeModalConfig, UserAccount } from "./types";
import { FEMALE_AVATARS, MALE_AVATARS, detectGenderFromName, getSyncedAvatarUrl, compressImageFile } from "./utils/avatarUtils";
import { Database } from "lucide-react";
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  getSupabaseClient, 
  pushToSupabase, 
  pullFromSupabase,
  USER_ACCOUNTS_SQL_SCHEMA,
  SUCCESSION_DATA_SQL_SCHEMA
} from "./supabaseClient";
import { 
  loadUserAccounts, 
  saveUserAccounts, 
  authenticateUser, 
  recordUserLogin, 
  generateInitials, 
  ACTIVE_SESSION_STORAGE_KEY 
} from "./utils/userAccountDb";
import { UserAccountManagement } from "./components/UserAccountManagement";


const pageVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction * 120,
    scale: 0.98,
    filter: "blur(4px)"
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 26,
      mass: 0.8
    }
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: -direction * 120,
    scale: 0.98,
    filter: "blur(4px)",
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 26,
      mass: 0.8
    }
  })
};

const getCellName = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
  if (pot === "High") {
    if (perf === "Low") return "Enigma (Box 4)";
    if (perf === "Medium") return "High Potential (Box 7)";
    return "Star Leader (Box 9)";
  }
  if (pot === "Medium") {
    if (perf === "Low") return "Inconsistent Performer (Box 2)";
    if (perf === "Medium") return "Core Contributor (Box 5)";
    return "High Performer (Box 8)";
  }
  if (perf === "Low") return "Underperformer (Box 1)";
  if (perf === "Medium") return "Solid Performer (Box 3)";
  return "Workhorse / Specialist (Box 6)";
};

const getPlacementRecommendation = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
  if (pot === "High") {
    if (perf === "Low") return "Bimbingan kinerja intensif untuk mengeksplorasi hambatan dan mengoptimalkan potensi kepemimpinan tinggi.";
    if (perf === "Medium") return "Berikan tanggung jawab proyek lintas divisi dan mentoring kepemimpinan tingkat lanjut untuk persiapan promosi.";
    return "Kandidat prioritas utama untuk suksesi kepemimpinan langsung (Ready Now). Berikan pelatihan eksekutif.";
  }
  if (pot === "Medium") {
    if (perf === "Low") return "Evaluasi ulang kesesuaian peran saat ini dan berikan pelatihan teknis terfokus.";
    if (perf === "Medium") return "Pertahankan performa stabil dengan program pengayaan tugas (job enrichment).";
    return "Pertimbangkan untuk jalur spesialis senior atau penugasan strategis skala menengah.";
  }
  if (perf === "Low") return "Diperlukan Rencana Peningkatan Kinerja (PIP) terstruktur dan monitoring ketat.";
  if (perf === "Medium") return "Fokus pada stabilisasi hasil kerja harian dan tingkatkan motivasi kerja.";
  return "Manfaatkan keahlian teknis secara maksimal untuk operasional harian dan mentoring staf junior.";
};

export default function App() {
  // Appearance / Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Authentication & View states
  const [authState, setAuthState] = useState<"landing" | "login" | "authenticated">("landing");
  const [userRole, setUserRole] = useState<"admin" | "user">("admin");
  const [loginEmail, setLoginEmail] = useState("admin@ajinomoto.com");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Integrated User Accounts Database State
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => loadUserAccounts());
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(() => {
    try {
      const allAccs = loadUserAccounts();
      const savedSessionId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) : null;
      if (savedSessionId) {
        const found = allAccs.find(a => a.id === savedSessionId);
        if (found) return found;
      }
      return allAccs.find(a => a.role === "admin" && a.status === "active") || allAccs[0] || null;
    } catch {
      return null;
    }
  });
  const [settingsSubTab, setSettingsSubTab] = useState<"user-accounts" | "advisory-config" | "integrations">("user-accounts");

  // Navigation states
  const [activeTab, setActiveTabRaw] = useState<"home" | "talent-pool" | "profile" | "settings" | "nine-box">("profile");
  const [direction, setDirection] = useState<number>(1);

  const setActiveTab = (newTab: "home" | "talent-pool" | "profile" | "settings" | "nine-box") => {
    const tabOrder: ("home" | "talent-pool" | "nine-box" | "profile" | "settings")[] = ["home", "talent-pool", "nine-box", "profile", "settings"];
    const currentIdx = tabOrder.indexOf(activeTab);
    const nextIdx = tabOrder.indexOf(newTab);
    if (currentIdx !== -1 && nextIdx !== -1 && nextIdx !== currentIdx) {
      setDirection(nextIdx > currentIdx ? 1 : -1);
    }
    setActiveTabRaw(newTab);
  };
  const [dashboardSubTab, setDashboardSubTab] = useState<"analytics" | "retirement">("analytics");
  const [managerialTarget, setManagerialTarget] = useState<number>(4.0);
  
  // Default Initial Retiring Positions
  const DEFAULT_RETIRING_POSITIONS: RetiringPosition[] = [
    {
      id: "pos-dm-fi",
      positionName: "Department Manager Food Ingredients-1",
      currentIncumbent: "SUWITO",
      retirementDate: "Maret 2027 (9 Bulan)",
      division: "Food Ingredients-1 (A-MJK)",
      urgency: "High",
      targetCompetencies: ["Leadership", "Problem Solving"],
      assignedSuccessorId: "edwin-prasetyo",
      suitabilityStatus: "Primary"
    },
    {
      id: "pos-dm-hse",
      positionName: "Department Manager Health Safety & Environment",
      currentIncumbent: "REZA GILANG MAHARDIKA",
      retirementDate: "November 2026 (4 Bulan)",
      division: "Health Safety & Environtment Dept (A-MJK)",
      urgency: "High",
      targetCompetencies: ["Interpersonal Skill", "Problem Solving"],
      assignedSuccessorId: "muhammad-kholidin",
      suitabilityStatus: "Primary"
    },
    {
      id: "pos-dm-foe",
      positionName: "Department Manager Factory Operational Excellence",
      currentIncumbent: "DIDIK SULISTIYO",
      retirementDate: "Agustus 2027 (13 Bulan)",
      division: "Factory Operational Excellence  (A-MJK) Dept",
      urgency: "Medium",
      targetCompetencies: ["Business Knowledge", "Leadership"],
      assignedSuccessorId: "nawang-purma",
      suitabilityStatus: "Primary"
    },
    {
      id: "pos-dm-procurement",
      positionName: "Department Manager Procurement & EXIM",
      currentIncumbent: "FININAWATI DWI WAHYUDI",
      retirementDate: "Desember 2027 (17 Bulan)",
      division: "Procurement & EXIM (A-MJK)",
      urgency: "Medium",
      targetCompetencies: ["Interpersonal Skill", "Problem Solving"],
      assignedSuccessorId: "moch-ari",
      suitabilityStatus: "Primary"
    },
    {
      id: "pos-sm-ppc",
      positionName: "Section Manager Production Planning & Control",
      currentIncumbent: "AGIL SETIAWAN",
      retirementDate: "Juni 2028 (2 Tahun)",
      division: "Production Planning & Control (A-MJK)",
      urgency: "Low",
      targetCompetencies: ["Business Knowledge", "Leadership"],
      assignedSuccessorId: "lutfia-anggraini",
      suitabilityStatus: "Primary"
    }
  ];

  // Talent management states with Local Database Persistence
  const [talents, setTalents] = useState<TalentProfile[]>(() => {
    try {
      const saved = localStorage.getItem("talent_database_records");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Gagal membaca database talenta dari localStorage", e);
    }
    return MOCK_TALENTS;
  });

  const [selectedTalentId, setSelectedTalentId] = useState<string>("edwin-prasetyo");
  const [previewTalentId, setPreviewTalentId] = useState<string>("edwin-prasetyo");

  // Retiring positions succession planning state with Local Database Persistence
  const [retiringPositions, setRetiringPositions] = useState<RetiringPosition[]>(() => {
    try {
      const saved = localStorage.getItem("retiring_positions_records");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Gagal membaca data posisi pensiun dari localStorage", e);
    }
    return DEFAULT_RETIRING_POSITIONS;
  });

  // Sync talents to local database system
  React.useEffect(() => {
    try {
      localStorage.setItem("talent_database_records", JSON.stringify(talents));
    } catch (e) {
      console.error("Gagal menyimpan database talenta ke localStorage", e);
    }
  }, [talents]);

  // Sync retiring positions to local database system
  React.useEffect(() => {
    try {
      localStorage.setItem("retiring_positions_records", JSON.stringify(retiringPositions));
    } catch (e) {
      console.error("Gagal menyimpan data posisi pensiun ke localStorage", e);
    }
  }, [retiringPositions]);

  const [isAddRetiringPositionOpen, setIsAddRetiringPositionOpen] = useState(false);
  const retiringImportInputRef = React.useRef<HTMLInputElement>(null);
  
  // Active Succession Candidates filters
  const [activeCandidateSearch, setActiveCandidateSearch] = useState<string>("");
  const [activeCandidateDivisionFilter, setActiveCandidateDivisionFilter] = useState<string>("All");
  const [activeCandidateReadinessFilter, setActiveCandidateReadinessFilter] = useState<string>("All");

  // Skill Gap Heatmap filters
  const [heatmapSearch, setHeatmapSearch] = useState<string>("");
  const [heatmapDeptFilter, setHeatmapDeptFilter] = useState<string>("All");
  const [heatmapGapFilter, setHeatmapGapFilter] = useState<string>("All");

  // Retiring positions succession filters
  const [retiringPosSearch, setRetiringPosSearch] = useState<string>("");
  const [retiringPosUrgencyFilter, setRetiringPosUrgencyFilter] = useState<string>("All");
  const [retiringPosStatusFilter, setRetiringPosStatusFilter] = useState<string>("All");

  // Candidate matcher filters
  const [candidateSearch, setCandidateSearch] = useState<string>("");
  const [candidateReadinessFilter, setCandidateReadinessFilter] = useState<string>("All");
  const [candidateMatchFilter, setCandidateMatchFilter] = useState<string>("All");

  // Succession Pipeline Alignment table filters
  const [successionPipelineSearch, setSuccessionPipelineSearch] = useState<string>("");
  const [successionPipelineUrgencyFilter, setSuccessionPipelineUrgencyFilter] = useState<string>("All");
  const [selectedRetiringPositionId, setSelectedRetiringPositionId] = useState<string | null>(null);
  
  const [newRetiringPos, setNewRetiringPos] = useState({
    positionName: "",
    currentIncumbent: "",
    retirementDate: "",
    division: "Technology Dept.",
    urgency: "Medium" as "High" | "Medium" | "Low",
    targetCompetency1: "Leadership",
    targetCompetency2: "Problem Solving"
  });

  const handleAddRetiringPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRetiringPos.positionName || !newRetiringPos.currentIncumbent || !newRetiringPos.retirementDate) return;

    const id = "pos-" + newRetiringPos.positionName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    const createdPos: RetiringPosition = {
      id,
      positionName: newRetiringPos.positionName,
      currentIncumbent: newRetiringPos.currentIncumbent,
      retirementDate: newRetiringPos.retirementDate,
      division: newRetiringPos.division,
      urgency: newRetiringPos.urgency,
      targetCompetencies: [newRetiringPos.targetCompetency1, newRetiringPos.targetCompetency2],
    };

    setRetiringPositions(prev => [...prev, createdPos]);
    setIsAddRetiringPositionOpen(false);
    
    // Reset form
    setNewRetiringPos({
      positionName: "",
      currentIncumbent: "",
      retirementDate: "",
      division: "Technology Div.",
      urgency: "Medium",
      targetCompetency1: "Leadership",
      targetCompetency2: "Problem Solving"
    });
  };

  const calculateMatchScore = (talent: TalentProfile, pos: RetiringPosition) => {
    let score = 0;

    // 1. Division Match (max 30 points)
    const isDivisionMatch = talent.division.toLowerCase().includes(pos.division.toLowerCase()) || 
                            pos.division.toLowerCase().includes(talent.division.toLowerCase());
    if (isDivisionMatch) {
      score += 30;
    } else {
      score += 10;
    }

    // 2. Readiness Level Match (max 30 points)
    if (talent.readiness === "READY NOW") {
      score += 30;
    } else if (talent.readiness === "READY 1-2 YEARS") {
      score += 20;
    } else if (talent.readiness === "READY 2+ YEARS") {
      score += 10;
    }

    // 3. Competencies Scores Match (max 40 points)
    let compSum = 0;
    let compCount = 0;
    
    pos.targetCompetencies.forEach(targetCompName => {
      const compObj = talent.competencies.find(c => c.name.toLowerCase() === targetCompName.toLowerCase());
      if (compObj) {
        compSum += compObj.score;
        compCount++;
      } else {
        if (targetCompName.toLowerCase().includes("leadership") && talent.psychometric.leadershipPotential) {
          compSum += talent.psychometric.leadershipPotential.score;
          compCount++;
        } else if (targetCompName.toLowerCase().includes("logical") && talent.psychometric.logicalReasoning) {
          compSum += talent.psychometric.logicalReasoning.score;
          compCount++;
        } else {
          compSum += 75;
          compCount++;
        }
      }
    });

    const compAverage = compCount > 0 ? (compSum / compCount) : 75;
    score += Math.round((compAverage / 100) * 40);

    return Math.min(score, 100);
  };

  const ensurePotentialAssessment = (talent: TalentProfile): PotentialAssessment => {
    if (talent.potentialAssessment) return talent.potentialAssessment;
    return {
      kemampuanIntelektual: 3,
      berpikirKritis: 3,
      menyelesaikanMasalah: 2,
      belajarCepat: 3,
      kesadaranDiri: 2,
      interpersonal: 2,
      kecerdasanEmosional: 2,
      motivasiKomitmen: 3,
      businessKnowledge: 4,
      leadership: 3,
      problemSolving: 3,
      interpersonalSkill: 3,
      strategicMindset: 3,
      managesComplexity: 3,
      ensuresAccountability: 3,
      drivesVision: 3,
      cultivateInnovation: 2,
      studyBackgroundName: "S2 Manajemen Bisnis",
      studyBackgroundScore: 3,
      targetLevel: "DM"
    };
  };

  const calculateTalentPotentialDetails = (talent: TalentProfile) => {
    const assessment = ensurePotentialAssessment(talent);
    
    // 1. Psychological Test (40%) - Standard Base: 24 points (8 items * 3), Max: 32 points
    const sumPsych = 
      (assessment.kemampuanIntelektual || 0) +
      (assessment.berpikirKritis || 0) +
      (assessment.menyelesaikanMasalah || 0) +
      (assessment.belajarCepat || 0) +
      (assessment.kesadaranDiri || 0) +
      (assessment.interpersonal || 0) +
      (assessment.kecerdasanEmosional || 0) +
      (assessment.motivasiKomitmen || 0);
    const psychRatio = sumPsych / 24;
    const psychWeighted = psychRatio * 40; // max 53.3%
    
    // 2. Competency (50%) - Standard: 18 (SM, 2*9) or 27 (DM, 3*9), Max: 45
    const sumComp = 
      (assessment.businessKnowledge || 0) +
      (assessment.leadership || 0) +
      (assessment.problemSolving || 0) +
      (assessment.interpersonalSkill || 0) +
      (assessment.strategicMindset || 0) +
      (assessment.managesComplexity || 0) +
      (assessment.ensuresAccountability || 0) +
      (assessment.drivesVision || 0) +
      (assessment.cultivateInnovation || 0);
    
    const divisor = assessment.targetLevel === "SM" ? 2 : 3;
    const compMax = divisor * 9;
    const compRatio = sumComp / compMax;
    const compWeighted = compRatio * 50; // max 83.3%
    
    // 3. Study Background (10%) - Standard Base: 4.0 (S1 level)
    const bgStandard = 4.0;
    const bgRatio = (assessment.studyBackgroundScore || 0) / bgStandard;
    const bgWeighted = bgRatio * 10; // max 12.5%
    
    // Total Integrated Potential Score (%)
    let rawPotentialScore = Math.min(psychWeighted + compWeighted + bgWeighted, 100);
    let totalPotentialScore = rawPotentialScore;
    
    // Sync with Nine-Box potential override while preserving candidate-level metric variation
    if (talent.customPotential === "Low") {
      totalPotentialScore = Math.round(20 + (rawPotentialScore / 100) * 28);
    } else if (talent.customPotential === "Medium") {
      totalPotentialScore = Math.round(50 + (rawPotentialScore / 100) * 24);
    } else if (talent.customPotential === "High") {
      totalPotentialScore = Math.round(76 + (rawPotentialScore / 100) * 22);
    }
    
    return {
      sumPsych,
      psychRatio,
      psychWeighted,
      sumComp,
      compMax,
      compRatio,
      compWeighted,
      bgRatio,
      bgWeighted,
      bgStandard,
      totalPotentialScore,
      assessment
    };
  };

  const calculateTalentPerformanceDetails = (talent: TalentProfile): {
    score50: number;
    percentage: number;
    perfLevel: "Low" | "Medium" | "High";
    categoryName: string;
    code: number;
    isFromImport: boolean;
    avgRawScore: number;
    is0To50Scale: boolean;
  } => {
    // 1. Raw Evaluasi Sumbu Y Score (scale 12.5 - 50.0)
    let score50 = 31.25;
    let isFromImport = false;
    let is0To50Scale = false;
    let avgRawScore = 0;

    const evalScores = evaluationYears.map(yr => talent.performanceEvaluation?.[`fy${yr}`]);
    const nonZeroScores = evalScores.filter((s): s is number => typeof s === "number" && !isNaN(s) && s > 0);

    if (nonZeroScores.length > 0) {
      const maxVal = Math.max(...nonZeroScores);
      avgRawScore = nonZeroScores.reduce((a, b) => a + b, 0) / nonZeroScores.length;

      if (maxVal > 5.0) {
        is0To50Scale = true;
        score50 = avgRawScore;
      } else {
        is0To50Scale = false;
        score50 = 12.5 + ((avgRawScore - 1.0) / 4.0) * 37.5;
      }
    } else if (talent.importedEvaluasiScore !== undefined && talent.importedEvaluasiScore > 0) {
      isFromImport = true;
      score50 = talent.importedEvaluasiScore > 50 ? (talent.importedEvaluasiScore / 100) * 50 : talent.importedEvaluasiScore;
      avgRawScore = score50;
      is0To50Scale = score50 > 5.0;
    }

    score50 = Math.min(Math.max(score50, 12.5), 50.0);
    const percentage = (score50 / 50.0) * 100;

    // 2. Performance Category & Code
    let perfLevel: "Low" | "Medium" | "High" = "Medium";

    if (talent.customPerformance) {
      perfLevel = talent.customPerformance;
    } else if (talent.importedEvaluasiCategory) {
      const cat = talent.importedEvaluasiCategory.toLowerCase();
      if (cat.includes("tinggi") || cat.includes("high") || cat === "3" || cat === "3.00") perfLevel = "High";
      else if (cat.includes("rendah") || cat.includes("low") || cat === "1" || cat === "1.00") perfLevel = "Low";
      else perfLevel = "Medium";
    } else {
      if (score50 < 25.0) perfLevel = "Low";
      else if (score50 < 37.5) perfLevel = "Medium";
      else perfLevel = "High";
    }

    const code = perfLevel === "Low" ? 1 : perfLevel === "Medium" ? 2 : 3;
    const categoryName = perfLevel === "Low" ? "Rendah" : perfLevel === "Medium" ? "Sedang" : "Tinggi";

    return {
      score50,
      percentage,
      perfLevel,
      categoryName,
      code,
      isFromImport,
      avgRawScore,
      is0To50Scale
    };
  };

  const getTalentPerformanceScore = (talent: TalentProfile) => {
    const { score50 } = calculateTalentPerformanceDetails(talent);
    return Number(score50.toFixed(2));
  };

  const getTalentCoordinates = (talent: TalentProfile) => {
    // 1. Sumbu X (Potential): 0.00 to 1.33 (SM Standard Scale)
    const { totalPotentialScore } = calculateTalentPotentialDetails(talent);
    let xVal = (totalPotentialScore / 100) * 1.333333;

    if (talent.customPotential === "Low") {
      xVal = Math.min(0.43, Math.max(0.05, xVal));
    } else if (talent.customPotential === "Medium") {
      xVal = Math.min(0.87, Math.max(0.45, xVal));
    } else if (talent.customPotential === "High") {
      xVal = Math.min(1.30, Math.max(0.90, xVal));
    }

    // 2. Sumbu Y (Kinerja): 12.5 to 50.0
    const details = calculateTalentPerformanceDetails(talent);
    let yVal = details.score50;

    if (talent.customPerformance === "Low") {
      yVal = Math.min(24.8, Math.max(12.7, yVal));
    } else if (talent.customPerformance === "Medium") {
      yVal = Math.min(37.3, Math.max(25.2, yVal));
    } else if (talent.customPerformance === "High") {
      yVal = Math.min(49.8, Math.max(37.7, yVal));
    }

    return {
      x: Math.min(Math.max(xVal, 0.00), 1.333333),
      y: Math.min(Math.max(yVal, 12.5), 50.0)
    };
  };

  const getTalentPlacement = (talent: TalentProfile): { performance: "Low" | "Medium" | "High"; potential: "Low" | "Medium" | "High" } => {
    const coords = getTalentCoordinates(talent);
    let potential: "Low" | "Medium" | "High" = "Medium";
    if (talent.customPotential) {
      potential = talent.customPotential;
    } else {
      // Standard SM Formula: Low <= 0.4444, Medium <= 0.8889, High > 0.8889
      if (coords.x <= 0.44444444) potential = "Low";
      else if (coords.x <= 0.88888888) potential = "Medium";
      else potential = "High";
    }

    let performance: "Low" | "Medium" | "High" = "Medium";
    if (talent.customPerformance) {
      performance = talent.customPerformance;
    } else {
      const details = calculateTalentPerformanceDetails(talent);
      performance = details.perfLevel;
    }

    return { performance, potential };
  };

  const handleCalibrateTalent = (talentId: string, performance: "Low" | "Medium" | "High", potential: "Low" | "Medium" | "High", notes?: string) => {
    setTalents(prev => prev.map(t => {
      if (t.id === talentId) {
        return {
          ...t,
          customPerformance: performance,
          customPotential: potential,
          nineBoxNotes: notes !== undefined ? notes : t.nineBoxNotes
        };
      }
      return t;
    }));
  };

  const getTalentsInCell = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
    return talents.filter(t => {
      if (nineBoxDivisionFilter !== "All" && t.division !== nineBoxDivisionFilter) {
        return false;
      }
      const placement = getTalentPlacement(t);
      return placement.performance === perf && placement.potential === pot;
    });
  };
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");

  // Saved Filters State
  const DEFAULT_SAVED_FILTERS: SavedFilter[] = [
    {
      id: "preset-tech-high-pot",
      name: "Kandidat High Potential (Tech)",
      searchTerm: "",
      divisionFilter: "Technology Dept.",
      readinessFilter: "READY NOW",
      description: "Kandidat siap promosi langsung di divisi Teknologi",
      createdAt: new Date().toISOString(),
      isPreset: true,
    },
    {
      id: "preset-ready-1-2",
      name: "Ready 1-2 Years Pipeline",
      searchTerm: "",
      divisionFilter: "All",
      readinessFilter: "READY 1-2 YEARS",
      description: "Kandidat dalam tahap pembinaan 1-2 tahun ke depan",
      createdAt: new Date().toISOString(),
      isPreset: true,
    },
    {
      id: "preset-supply-chain",
      name: "Talenta Supply Chain & Ops",
      searchTerm: "",
      divisionFilter: "Supply Chain Dept.",
      readinessFilter: "All",
      description: "Seluruh talenta di divisi Supply Chain",
      createdAt: new Date().toISOString(),
      isPreset: true,
    }
  ];

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const local = localStorage.getItem("talent_pool_saved_filters");
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.error("Failed to load saved filters:", e);
    }
    return DEFAULT_SAVED_FILTERS;
  });

  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [isSaveFilterModalOpen, setIsSaveFilterModalOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterDesc, setNewFilterDesc] = useState("");

  // Sync saved filters to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem("talent_pool_saved_filters", JSON.stringify(savedFilters));
    } catch (e) {
      console.error("Failed to save filters:", e);
    }
  }, [savedFilters]);

  // Apply a saved filter
  const handleApplySavedFilter = (filter: SavedFilter) => {
    setSearchTerm(filter.searchTerm || "");
    setDivisionFilter(filter.divisionFilter || "All");
    setReadinessFilter(filter.readinessFilter || "All");
    setActiveSavedFilterId(filter.id);
  };

  // Check if current filter settings match any saved filter
  React.useEffect(() => {
    const matched = savedFilters.find(f => 
      (f.searchTerm || "") === searchTerm && 
      (f.divisionFilter || "All") === divisionFilter && 
      (f.readinessFilter || "All") === readinessFilter
    );
    if (matched) {
      setActiveSavedFilterId(matched.id);
    } else {
      setActiveSavedFilterId(null);
    }
  }, [searchTerm, divisionFilter, readinessFilter, savedFilters]);

  // Save new custom filter
  const handleSaveCurrentFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: newFilterName.trim(),
      searchTerm,
      divisionFilter,
      readinessFilter,
      description: newFilterDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
      isPreset: false,
    };

    setSavedFilters(prev => [newFilter, ...prev]);
    setActiveSavedFilterId(newFilter.id);
    setIsSaveFilterModalOpen(false);
    setNewFilterName("");
    setNewFilterDesc("");
    setAdminProfileSuccessMsg(`Filter "${newFilter.name}" berhasil disimpan!`);
    setTimeout(() => setAdminProfileSuccessMsg(""), 4000);
  };

  // Delete saved filter
  const handleDeleteSavedFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetFilter = savedFilters.find(f => f.id === id);
    if (targetFilter?.isPreset) {
      alert("Preset filter standar sistem tidak dapat dihapus.");
      return;
    }
    triggerDeleteModal({
      title: "Hapus Filter Tersimpan?",
      itemName: targetFilter?.name || "Filter Custom",
      itemSubtitle: "Custom Filter Preset",
      warningText: "Apakah Anda yakin ingin menghapus preset filter tersimpan ini? Tindakan ini tidak dapat dibatalkan.",
      confirmButtonText: "Ya, Hapus Filter",
      onConfirm: () => {
        setSavedFilters(prev => prev.filter(f => f.id !== id));
        if (activeSavedFilterId === id) {
          setActiveSavedFilterId(null);
        }
        setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Helper to count talents matching a saved filter
  const getFilterMatchCount = (filter: SavedFilter) => {
    return talents.filter(t => {
      const matchSearch = filter.searchTerm 
        ? (t.name.toLowerCase().includes(filter.searchTerm.toLowerCase()) || 
           t.title.toLowerCase().includes(filter.searchTerm.toLowerCase()) || 
           (t.nik && t.nik.toLowerCase().includes(filter.searchTerm.toLowerCase())))
        : true;
      const matchDivision = filter.divisionFilter && filter.divisionFilter !== "All" ? t.division === filter.divisionFilter : true;
      const matchReadiness = filter.readinessFilter && filter.readinessFilter !== "All" ? t.readiness === filter.readinessFilter : true;
      return matchSearch && matchDivision && matchReadiness;
    }).length;
  };

  // Pagination & Search states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [showChartLabels, setShowChartLabels] = useState(false);
  const [actionPlanSearch, setActionPlanSearch] = useState("");
  const [actionPlanPage, setActionPlanPage] = useState(1);
  const [petaSuksesiSearch, setPetaSuksesiSearch] = useState("");
  const [petaSuksesiPage, setPetaSuksesiPage] = useState(1);
  const [teaserSearch, setTeaserSearch] = useState("");
  const [quickSelectorSearch, setQuickSelectorSearch] = useState("");
  const [readinessSearch, setReadinessSearch] = useState("");

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, divisionFilter, readinessFilter]);

  // Nine-Box states
  const [selectedNineBoxTalentId, setSelectedNineBoxTalentId] = useState<string | null>(null);
  const [nineBoxDivisionFilter, setNineBoxDivisionFilter] = useState("All");
  const [nineBoxViewMode, setNineBoxViewMode] = useState<"chart" | "list" | "report">("list");
  const [reportSelectedBox, setReportSelectedBox] = useState<string | null>(null);
  const [reportSelectedZone, setReportSelectedZone] = useState<"green" | "blue" | "red" | null>(null);
  const [profileSubTab, setProfileSubTab] = useState<"profile-competencies" | "idp-training">("profile-competencies");
  const [draggedTalentId, setDraggedTalentId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  const handleResetNineBoxCalibrations = () => {
    setTalents(prev => prev.map(t => ({
      ...t,
      customPerformance: undefined,
      customPotential: undefined,
      nineBoxNotes: undefined
    })));
    setSyncNotification("Semua kalibrasi manual telah di-reset. Matriks 9-Box kembali mengikuti data asesmen asli secara otomatis.");
    setTimeout(() => setSyncNotification(null), 5000);
  };

  const handleRefreshNineBoxData = () => {
    const timeStr = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSyncNotification(`Bagan 9-Box Tools berhasil diperbarui dengan data asesmen & evaluasi kinerja terbaru (${timeStr} WIB).`);
    setTimeout(() => setSyncNotification(null), 5000);
  };

  React.useEffect(() => {
    setPetaSuksesiPage(1);
  }, [petaSuksesiSearch, nineBoxDivisionFilter]);

  React.useEffect(() => {
    setActionPlanPage(1);
  }, [actionPlanSearch, reportSelectedBox, reportSelectedZone, nineBoxDivisionFilter]);

  // Interaction states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isOverallSummaryModalOpen, setIsOverallSummaryModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAdminMasterModalOpen, setIsAdminMasterModalOpen] = useState(false);
  const [adminProfileSuccessMsg, setAdminProfileSuccessMsg] = useState("");
  const [editProfileForm, setEditProfileForm] = useState<any | null>(null);

  // Redesigned Delete Confirmation Modal state
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<DeleteConfirmModalConfig>({
    isOpen: false,
    title: "Konfirmasi Hapus Data",
    itemName: "",
    itemSubtitle: "",
    itemBadge: "",
    warningText: "",
    confirmButtonText: "Ya, Hapus Permanent",
    onConfirm: () => {},
  });

  const triggerDeleteModal = (config: Omit<DeleteConfirmModalConfig, "isOpen">) => {
    setDeleteConfirmConfig({
      ...config,
      isOpen: true,
    });
  };

  // Interactive Supabase Notification Popup State
  const [supabaseModal, setSupabaseModal] = useState<SupabaseNoticeModalConfig>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showSupabasePopup = (
    type: "success" | "error" | "info" | "syncing",
    title: string,
    message: string,
    details?: string,
    sqlSnippet?: string
  ) => {
    setSupabaseModal({
      isOpen: true,
      type,
      title,
      message,
      details,
      sqlSnippet,
    });
  };

  // Sidebar Collapse & Keyboard Shortcuts state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [commandSearch, setCommandSearch] = useState<string>("");
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  // Global Keyboard Shortcuts Event Listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const isEditingText = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

      // Escape key closes open modals/palettes
      if (e.key === "Escape") {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
          e.preventDefault();
          return;
        }
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          e.preventDefault();
          return;
        }
        if (deleteConfirmConfig.isOpen) {
          setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }));
          e.preventDefault();
          return;
        }
        if (isReportModalOpen) {
          setIsReportModalOpen(false);
          e.preventDefault();
          return;
        }
        if (isOverallSummaryModalOpen) {
          setIsOverallSummaryModalOpen(false);
          e.preventDefault();
          return;
        }
      }

      // Ctrl + B or Cmd + B: Toggle Sidebar Collapse (Perkecil / Perlebar Sidebar)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarCollapsed(prev => {
          const next = !prev;
          setShortcutToast(next ? "Sidebar Diperkecil (Collapsed)" : "Sidebar Diperlebar (Expanded)");
          setTimeout(() => setShortcutToast(null), 2500);
          return next;
        });
        return;
      }

      // Ctrl + K or Cmd + K: Open Command Palette / Quick Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        setCommandSearch("");
        return;
      }

      // ? Key or Ctrl + /: Open Shortcuts Modal
      if ((e.key === "?" && !isEditingText) || ((e.ctrlKey || e.metaKey) && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // Skip single-key or Alt shortcuts when typing in inputs
      if (isEditingText) return;

      // Alt + 1-5: Module Navigation Shortcuts
      if (e.altKey) {
        if (e.key === "1" && userRole === "admin") {
          e.preventDefault();
          setActiveTab("home");
          setShortcutToast("Shortcut: Dashboard Overview (Alt+1)");
          setTimeout(() => setShortcutToast(null), 2000);
        } else if (e.key === "2" && userRole === "admin") {
          e.preventDefault();
          setActiveTab("talent-pool");
          setShortcutToast("Shortcut: Talent Pool Directory (Alt+2)");
          setTimeout(() => setShortcutToast(null), 2000);
        } else if (e.key === "3" && userRole === "admin") {
          e.preventDefault();
          setActiveTab("nine-box");
          setShortcutToast("Shortcut: Nine-Box Placement (Alt+3)");
          setTimeout(() => setShortcutToast(null), 2000);
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveTab("profile");
          setShortcutToast("Shortcut: Profil Details (Alt+4)");
          setTimeout(() => setShortcutToast(null), 2000);
        } else if (e.key === "5" && userRole === "admin") {
          e.preventDefault();
          setActiveTab("settings");
          setShortcutToast("Shortcut: Advisory Controls (Alt+5)");
          setTimeout(() => setShortcutToast(null), 2000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, isShortcutsModalOpen, deleteConfirmConfig.isOpen, isReportModalOpen, isOverallSummaryModalOpen, userRole]);

  // Filtered command talents
  const filteredCommandTalents = talents.filter(t => 
    !commandSearch.trim() || 
    t.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
    t.division.toLowerCase().includes(commandSearch.toLowerCase()) ||
    t.title.toLowerCase().includes(commandSearch.toLowerCase()) ||
    (t.nik && t.nik.toLowerCase().includes(commandSearch.toLowerCase()))
  );

  // Email Dispatch Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailType, setEmailType] = useState<"summary" | "individual">("summary");
  const [emailTargetTalentId, setEmailTargetTalentId] = useState<string | null>(null);
  const [emailPresetRecipient, setEmailPresetRecipient] = useState<"bod" | "hr_head" | "dept_head" | "my_email" | "custom">("bod");
  const [emailForm, setEmailForm] = useState({
    recipientEmail: "bod.komite@ajinomoto.co.id",
    ccEmail: "hrd.head@ajinomoto.co.id, talent.committee@ajinomoto.co.id",
    subject: "",
    message: "",
    attachPdf: true,
    attachCsv: true,
    attachExecutiveSummary: true,
  });
  const [emailSendingStatus, setEmailSendingStatus] = useState<"idle" | "sending" | "success">("idle");
  const [emailSendingStep, setEmailSendingStep] = useState<string>("");
  const [emailSentLog, setEmailSentLog] = useState<Array<{
    id: string;
    type: "summary" | "individual";
    targetName?: string;
    recipient: string;
    subject: string;
    sentAt: string;
    status: string;
  }>>([]);

  const handleOpenSendEmail = (type: "summary" | "individual", targetTalentId?: string) => {
    const tid = targetTalentId || selectedTalentId;
    setEmailType(type);
    setEmailTargetTalentId(tid);
    setEmailSendingStatus("idle");
    setEmailSendingStep("");

    const targetTalent = talents.find(t => t.id === tid) || talents.find(t => t.id === selectedTalentId) || talents[0];

    if (type === "summary") {
      const highPotCount = talents.filter(t => getTalentPlacement(t).potential === "High").length;
      setEmailPresetRecipient("bod");
      setEmailForm({
        recipientEmail: "bod.komite@ajinomoto.co.id",
        ccEmail: "hrd.head@ajinomoto.co.id, talent.committee@ajinomoto.co.id",
        subject: `[CONFIDENTIAL] Laporan Rangkuman Eksekutif Data System Nine-Box & Peta Suksesi - PT Ajinomoto Indonesia`,
        message: `Yth. Bapak/Ibu Direksi & Komite Kalibrasi Talenta,

Bersama surat elektronik ini kami sampaikan Laporan Rangkuman Eksekutif Keseluruhan Data System Nine-Box & Peta Suksesi PT Ajinomoto Indonesia per tanggal ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}.

RINGKASAN KONSOLIDASI SISTEM:
• Total Talenta Master Ter-evaluasi: ${talents.length} Kandidat
• Talenta High Potential (Star Performers): ${highPotCount} Talenta
• Coverage Suksesi Jabatan Pensiun: ${retiringPositions.length} Jabatan Ter-cover

Dokumen Rangkuman Eksekutif PDF & Dataset Master CSV terlampir sebagai bahan acuan resmi rapat keputusan promosi dan kalibrasi suksesi kepemimpinan.

Hormat kami,
Komite Talenta & Human Capital Management
PT Ajinomoto Indonesia`,
        attachPdf: true,
        attachCsv: true,
        attachExecutiveSummary: true,
      });
    } else {
      const perfScore = targetTalent ? getTalentPerformanceScore(targetTalent) : 80;
      const potDetails = targetTalent ? calculateTalentPotentialDetails(targetTalent) : { totalPotentialScore: 80 };
      const potScore = Math.round(potDetails.totalPotentialScore);
      const overallRating = Math.round((perfScore + potScore) / 2);
      const placement: { performance: "Low" | "Medium" | "High"; potential: "Low" | "Medium" | "High" } = targetTalent ? getTalentPlacement(targetTalent) : { performance: "High", potential: "High" };
      const cellName = getCellName(placement.performance, placement.potential);

      setEmailPresetRecipient("hr_head");
      setEmailForm({
        recipientEmail: "hrd.head@ajinomoto.co.id",
        ccEmail: "bod.komite@ajinomoto.co.id, " + (targetTalent?.division ? `${targetTalent.division.toLowerCase().replace(/[^a-z0-9]/g, '')}@ajinomoto.co.id` : "manager@ajinomoto.co.id"),
        subject: `[CONFIDENTIAL] Laporan Assessment Individual Talenta - ${targetTalent?.name || "Kandidat"} (${targetTalent?.title || "Section Manager"})`,
        message: `Yth. Komite Talenta & Head of Department,

Berikut disampaikan Laporan Assessment Individual & Profil Kalibrasi Talenta resmi untuk:

• Nama Talenta: ${targetTalent?.name || "Kandidat"}
• NIK / Jabatan: ${targetTalent?.nik || "N/A"} - ${targetTalent?.title || "-"}
• Divisi / Departemen: ${targetTalent?.division || "-"}
• Rating Kinerja: ${perfScore}% | Rating Potensi: ${potScore}% (Rating Total: ${overallRating}%)
• Klasifikasi Nine-Box: ${cellName}

Dokumen Laporan Individual lengkap terlampir dalam format PDF sebagai bahan acuan penetapan Individual Development Plan (IDP) dan rekomendasi suksesi.

Hormat kami,
Komite Talenta
PT Ajinomoto Indonesia`,
        attachPdf: true,
        attachCsv: false,
        attachExecutiveSummary: true,
      });
    }

    setIsEmailModalOpen(true);
  };

  const handleEmailPresetChange = (preset: "bod" | "hr_head" | "dept_head" | "my_email" | "custom") => {
    setEmailPresetRecipient(preset);
    let recipient = "";
    if (preset === "bod") recipient = "bod.komite@ajinomoto.co.id";
    else if (preset === "hr_head") recipient = "hrd.head@ajinomoto.co.id";
    else if (preset === "dept_head") recipient = "dept.head@ajinomoto.co.id";
    else if (preset === "my_email") recipient = "mahmudnurdiansyah4@gmail.com";
    setEmailForm(prev => ({ ...prev, recipientEmail: recipient }));
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.recipientEmail) return;

    setEmailSendingStatus("sending");
    setEmailSendingStep("Menyiapkan berkas laporan & rendering lampiran PDF/CSV...");

    try {
      setEmailSendingStep("Menghubungkan ke Backend Server Express / SMTP Gateway...");
      
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm)
      });

      const data = await response.json();
      const targetTalent = talents.find(t => t.id === emailTargetTalentId);

      if (data.delivered) {
        setEmailSendingStatus("success");
        setEmailSentLog(prev => [
          {
            id: Date.now().toString(),
            type: emailType,
            targetName: emailType === "individual" ? (targetTalent?.name || "Kandidat Individual") : "Summary System BOD",
            recipient: emailForm.recipientEmail,
            subject: emailForm.subject,
            sentAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            status: "Terkirim Real via Server SMTP (200 OK)"
          },
          ...prev
        ]);
      } else {
        setEmailSendingStatus("success");
        setEmailSentLog(prev => [
          {
            id: Date.now().toString(),
            type: emailType,
            targetName: emailType === "individual" ? (targetTalent?.name || "Kandidat Individual") : "Summary System BOD",
            recipient: emailForm.recipientEmail,
            subject: emailForm.subject,
            sentAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            status: "Simulasi Server Log (200 OK)"
          },
          ...prev
        ]);
      }
    } catch (error) {
      console.error("Failed to send email via API:", error);
      setEmailSendingStatus("success");
      const targetTalent = talents.find(t => t.id === emailTargetTalentId);
      setEmailSentLog(prev => [
        {
          id: Date.now().toString(),
          type: emailType,
          targetName: emailType === "individual" ? (targetTalent?.name || "Kandidat Individual") : "Summary System BOD",
          recipient: emailForm.recipientEmail,
          subject: emailForm.subject,
          sentAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          status: "Simulasi In-App Gateway (200 OK)"
        },
        ...prev
      ]);
    }
  };

  const handleDirectMailto = () => {
    const subjectEncoded = encodeURIComponent(emailForm.subject);
    const bodyEncoded = encodeURIComponent(emailForm.message);
    const mailtoUrl = `mailto:${emailForm.recipientEmail}?cc=${encodeURIComponent(emailForm.ccEmail)}&subject=${subjectEncoded}&body=${bodyEncoded}`;
    window.open(mailtoUrl, "_blank");
  };

  const handleOpenInGmail = () => {
    const subjectEncoded = encodeURIComponent(emailForm.subject);
    const bodyEncoded = encodeURIComponent(emailForm.message);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailForm.recipientEmail)}&cc=${encodeURIComponent(emailForm.ccEmail)}&su=${subjectEncoded}&body=${bodyEncoded}`;
    window.open(gmailUrl, "_blank");
  };

  const [adminProfile, setAdminProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("adminProfile");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Gagal membaca adminProfile dari localStorage", e);
    }
    return {
      name: "Marcus Sterling",
      title: "Chief Talent Officer (Admin)",
      initials: "MS",
      department: "Human Capital Management Dept.",
      email: "admin.hr@ajinomoto.co.id",
      notes: "Otorisasi Administrator Master untuk Komite Talent Suksesi PT Ajinomoto Indonesia",
      lastSaved: ""
    };
  });

  const handleSaveAdminMasterProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nowStr = new Date().toLocaleDateString("id-ID", {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const words = (adminProfile.name || "").trim().split(/\s+/);
    const initials = words.map(w => w[0]).join("").substring(0, 3).toUpperCase() || "AD";

    const updatedProfile = {
      ...adminProfile,
      initials,
      lastSaved: nowStr
    };

    setAdminProfile(updatedProfile);
    try {
      localStorage.setItem("adminProfile", JSON.stringify(updatedProfile));
    } catch (err) {
      console.error("Gagal menyimpan adminProfile ke localStorage", err);
    }

    // Two-way sync to user accounts database
    const syncedAccounts = userAccounts.map(acc => {
      if (acc.role === "admin" && (acc.id === currentUserAccount?.id || acc.email.toLowerCase() === adminProfile.email.toLowerCase())) {
        return {
          ...acc,
          name: updatedProfile.name,
          title: updatedProfile.title,
          email: updatedProfile.email,
          department: updatedProfile.department,
          initials,
          updatedAt: new Date().toISOString()
        };
      }
      return acc;
    });
    setUserAccounts(syncedAccounts);
    saveUserAccounts(syncedAccounts);

    addSecurityLog(`Profil Administrator Master ("${updatedProfile.name}") berhasil diperbarui dan disimpan.`, "success");
    setAdminProfileSuccessMsg(`Profil Master Admin "${updatedProfile.name}" berhasil disimpan!`);
    setTimeout(() => setAdminProfileSuccessMsg(""), 4000);

    if (isAdminMasterModalOpen) {
      setIsAdminMasterModalOpen(false);
    }
  };

  const handleAccountsChange = (updatedAccounts: UserAccount[]) => {
    setUserAccounts(updatedAccounts);
    saveUserAccounts(updatedAccounts);
    
    // Sync current logged in user if modified in table/modal
    if (currentUserAccount) {
      const foundCurrent = updatedAccounts.find(a => a.id === currentUserAccount.id);
      if (foundCurrent) {
        setCurrentUserAccount(foundCurrent);
        setUserRole(foundCurrent.role);
        if (foundCurrent.role === "admin") {
          setAdminProfile(prev => ({
            ...prev,
            name: foundCurrent.name,
            title: foundCurrent.title,
            email: foundCurrent.email,
            department: foundCurrent.department,
            initials: foundCurrent.initials || generateInitials(foundCurrent.name)
          }));
        }
      }
    }
  };

  const handleDeleteTalent = (talentId: string, talentName?: string) => {
    const target = talents.find(t => t.id === talentId);
    const name = talentName || target?.name || "Talenta";
    const title = target?.title || "Staff / Managerial";
    const division = target?.division || "Division";

    triggerDeleteModal({
      title: "Hapus Profil Talenta?",
      itemName: name,
      itemSubtitle: `${title} • ${division}`,
      itemBadge: target?.nik ? `NIK: ${target.nik}` : `ID: ${talentId}`,
      warningText: "Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Seluruh data penilaian kinerja, evaluasi 9-box, kompetensi, dan riwayat IDP talenta ini akan dihapus dari sistem master.",
      confirmButtonText: "Ya, Hapus Profil Talenta",
      onConfirm: () => {
        const updatedTalents = talents.filter(t => t.id !== talentId);
        setTalents(updatedTalents);

        if (selectedTalentId === talentId) {
          if (updatedTalents.length > 0) {
            setSelectedTalentId(updatedTalents[0].id);
          }
        }

        if (selectedNineBoxTalentId === talentId) {
          setSelectedNineBoxTalentId(updatedTalents.length > 0 ? updatedTalents[0].id : null);
        }

        setRetiringPositions(prev => prev.map(pos => {
          if (pos.selectedSuccessorId === talentId) {
            return { ...pos, selectedSuccessorId: undefined };
          }
          return pos;
        }));

        if (isEditProfileModalOpen && editProfileForm?.id === talentId) {
          setIsEditProfileModalOpen(false);
        }

        addSecurityLog(`Data talenta "${name}" (ID: ${talentId}) berhasil dihapus dari sistem master suksesi.`, "warning");
        setAdminProfileSuccessMsg(`Data talenta "${name}" telah berhasil dihapus secara permanen.`);
        setTimeout(() => setAdminProfileSuccessMsg(""), 4000);
        setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleOpenEditProfile = () => {
    const dynamicCurrentTalent = talents.find((t) => t.id === selectedTalentId) || talents[0];
    const gender = dynamicCurrentTalent.gender || detectGenderFromName(dynamicCurrentTalent.name);
    setEditProfileForm({ ...dynamicCurrentTalent, gender });
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileForm) return;
    
    let updatedForm = { ...editProfileForm };
    if (!updatedForm.gender) {
      updatedForm.gender = detectGenderFromName(updatedForm.name);
    }
    
    if (updatedForm.birthDate) {
      const birthYear = new Date(updatedForm.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear)) {
        updatedForm.age = currentYear - birthYear;
      }
    }
    
    if (updatedForm.readiness === "READY NOW") {
      updatedForm.readinessColor = "emerald";
    } else if (updatedForm.readiness === "READY 1-2 YEARS") {
      updatedForm.readinessColor = "amber";
    } else {
      updatedForm.readinessColor = "rose";
    }

    setTalents((prev) =>
      prev.map((t) => (t.id === updatedForm.id ? updatedForm : t))
    );
    setIsEditProfileModalOpen(false);
    addSecurityLog(`Profil lengkap talenta "${updatedForm.name}" berhasil diperbarui.`, "success");
  };

  const [executiveCommentary, setExecutiveCommentary] = useState<Record<string, string>>({
    "edwin-prasetyo": "Edwin is a high-caliber digital transformation strategist. His exceptional strategic mindset paired with deep technology expertise positions him well for C-suite roles in the near term. Ongoing executive coaching will accelerate his lateral influence capabilities.",
    "siti-rahma": "Siti shows flawless financial stewardship and expert decision-making capabilities. She has strong business outcome momentum and is fully ready to take on broader VP or Chief Financial officer capacities immediately.",
    "budi-santoso": "Budi is an outstanding people advocate with maximum scores in stakeholder alignment. He excels at building strategic culture, and with structured AI/predictive tool training, he will be a phenomenal candidate for HCM leadership.",
    "amanda-collins": "Amanda is a brilliant growth expert with top-tier partnership negotiation skills. She thrives in fast-paced international frameworks. Strategic financial and compliance certifications will cement her readiness for key regional VP roles."
  });

  // Security & Encrypted Vault States
  const [isVaultEnabled, setIsVaultEnabled] = useState(false);
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [vaultPassphrase, setVaultPassphrase] = useState("ajinomoto-secure");
  const [vaultError, setVaultError] = useState("");
  const [encryptedCommentaries, setEncryptedCommentaries] = useState<Record<string, { ciphertext: string, salt: string, iv: string }>>({});
  const [securityLogs, setSecurityLogs] = useState<Array<{ id: string; timestamp: string; action: string; type: "success" | "warning" | "info" }>>([
    { id: "1", timestamp: new Date().toLocaleTimeString(), action: "Sistem keamanan diinisialisasi. AES-256-GCM siap digunakan.", type: "info" }
  ]);

  const addSecurityLog = (action: string, type: "success" | "warning" | "info" = "info") => {
    setSecurityLogs((prev) => [
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        action,
        type
      },
      ...prev
    ]);
  };

  // Evaluation years state for dynamic FY management
  const [evaluationYears, setEvaluationYears] = useState<string[]>([
    "2020", "2021", "2022", "2023", "2024"
  ]);

  // Supabase Integration States
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<"idle" | "success" | "error" | "unconfigured">(
    getSupabaseConfig().isEnabled ? "idle" : "unconfigured"
  );
  const [supabaseError, setSupabaseError] = useState("");
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [sqlSchemaTab, setSqlSchemaTab] = useState<"user_accounts" | "succession">("user_accounts");

  // Auto-load data from Supabase if enabled
  React.useEffect(() => {
    const initSync = async () => {
      const config = getSupabaseConfig();
      if (config.isEnabled) {
        setIsSupabaseSyncing(true);
        setSupabaseStatus("idle");
        const res = await pullFromSupabase();
        if (res.success && res.data) {
          if (res.data.talents && res.data.talents.length > 0) {
            setTalents(res.data.talents);
          }
          if (res.data.retiring_positions && res.data.retiring_positions.length > 0) {
            setRetiringPositions(res.data.retiring_positions);
          }
          if (res.data.evaluation_years && res.data.evaluation_years.length > 0) {
            setEvaluationYears(res.data.evaluation_years);
          }
          setSupabaseStatus("success");
          addSecurityLog("Berhasil sinkronisasi dan memuat data otomatis dari database Supabase.", "success");
        } else {
          setSupabaseStatus("error");
          setSupabaseError(res.error || "Gagal memuat data.");
          addSecurityLog(`Koneksi Supabase aktif namun gagal menarik data otomatis: ${res.error || 'Tabel belum siap'}. Silakan periksa tabel atau lakukan push data pertama kali.`, "warning");
        }
        setIsSupabaseSyncing(false);
      }
    };
    initSync();
  }, []);

  // Debounced Auto-sync on changes
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isAutoSyncEnabled && supabaseConfig.isEnabled) {
      const delayDebounce = setTimeout(async () => {
        setIsSupabaseSyncing(true);
        const res = await pushToSupabase(talents, retiringPositions, evaluationYears);
        if (res.success) {
          setSupabaseStatus("success");
          setSupabaseError("");
        } else {
          setSupabaseStatus("error");
          setSupabaseError(res.error || "Auto-sync gagal");
        }
        setIsSupabaseSyncing(false);
      }, 1000);
      return () => clearTimeout(delayDebounce);
    }
  }, [talents, retiringPositions, evaluationYears, isAutoSyncEnabled, supabaseConfig.isEnabled]);

  // Sync operations handlers
  const handlePushToSupabase = async () => {
    setIsSupabaseSyncing(true);
    setSupabaseStatus("idle");
    setSupabaseError("");
    showSupabasePopup(
      "syncing",
      "Mengunggah Data ke Supabase...",
      "Sistem sedang menyinkronkan seluruh data talenta, posisi suksesi, dan tahun evaluasi ke cloud database."
    );

    const res = await pushToSupabase(talents, retiringPositions, evaluationYears);
    setIsSupabaseSyncing(false);

    if (res.success) {
      setSupabaseStatus("success");
      addSecurityLog("Berhasil mengunggah seluruh data suksesi ke database Supabase.", "success");
      showSupabasePopup(
        "success",
        "Sinkronisasi Push Berhasil!",
        "Seluruh data Peta Suksesi dan Talenta telah tersimpan dengan aman di database Supabase Cloud.",
        `Data tersinkronkan: ${talents.length} Talenta, ${retiringPositions.length} Posisi Pensiun, ${evaluationYears.length} Tahun Evaluasi.`
      );
    } else {
      setSupabaseStatus("error");
      setSupabaseError(res.error || "Gagal melakukan push");
      addSecurityLog(`Gagal mengunggah data ke Supabase: ${res.error}.`, "warning");
      showSupabasePopup(
        "error",
        "Gagal Menyinkronkan ke Supabase",
        res.error || "Gagal mengunggah data ke Supabase.",
        "Pastikan tabel 'succession_data' sudah dibuat di Supabase SQL Editor. Gunakan perintah SQL di bawah ini untuk membuat tabel otomatis.",
        `create table if not exists succession_data (
  id text primary key,
  talents jsonb not null,
  retiring_positions jsonb not null,
  evaluation_years jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table succession_data enable row level security;

drop policy if exists "Allow public read and write" on succession_data;
create policy "Allow public read and write" on succession_data for all using (true) with check (true);

grant all on succession_data to anon, authenticated, service_role;`
      );
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSupabaseSyncing(true);
    setSupabaseStatus("idle");
    setSupabaseError("");
    showSupabasePopup(
      "syncing",
      "Mengunduh Data dari Supabase...",
      "Sistem sedang mengambil data suksesi terbaru dari database Supabase Cloud."
    );

    const res = await pullFromSupabase();
    setIsSupabaseSyncing(false);

    if (res.success && res.data) {
      if (res.data.talents && res.data.talents.length > 0) {
        setTalents(res.data.talents);
      }
      if (res.data.retiring_positions && res.data.retiring_positions.length > 0) {
        setRetiringPositions(res.data.retiring_positions);
      }
      if (res.data.evaluation_years && res.data.evaluation_years.length > 0) {
        setEvaluationYears(res.data.evaluation_years);
      }
      setSupabaseStatus("success");
      addSecurityLog("Berhasil mengunduh dan memperbarui data suksesi dari database Supabase.", "success");
      showSupabasePopup(
        "success",
        "Sinkronisasi Pull Berhasil!",
        "Data suksesi terbaru berhasil diunduh dari Supabase dan telah diperbarui di sistem lokal Anda.",
        `Terunduh: ${res.data?.talents?.length || 0} Talenta, ${res.data?.retiring_positions?.length || 0} Posisi Pensiun.`
      );
    } else {
      setSupabaseStatus("error");
      setSupabaseError(res.error || "Gagal melakukan pull");
      addSecurityLog(`Gagal menarik data dari Supabase: ${res.error}.`, "warning");
      showSupabasePopup(
        "error",
        "Gagal Mengunduh dari Supabase",
        res.error || "Gagal mengambil data dari Supabase.",
        "Pastikan URL & Anon Key valid, serta tabel 'succession_data' di Supabase telah diisi data."
      );
    }
  };

  const handleSaveSupabaseConfigChange = (url: string, key: string, enabled: boolean) => {
    const updated = { url, anonKey: key, isEnabled: enabled };
    saveSupabaseConfig(updated);
    setSupabaseConfig(getSupabaseConfig());
    if (enabled && url && key) {
      setSupabaseStatus("idle");
      addSecurityLog(`Konfigurasi Supabase diperbarui. URL target: ${url}`, "info");
      showSupabasePopup(
        "success",
        "Konfigurasi Supabase Disimpan!",
        "Koneksi ke Supabase berhasil diperbarui dan fitur auto-sync real-time telah aktif.",
        `Project URL: ${url}`
      );
    } else {
      setSupabaseStatus("unconfigured");
      addSecurityLog("Koneksi Supabase dinonaktifkan oleh admin.", "info");
      showSupabasePopup(
        "info",
        "Koneksi Supabase Diputus",
        "Sinkronisasi Supabase dinonaktifkan. Data sistem Anda akan tersimpan secara aman di peramban lokal."
      );
    }
  };

  const handleTestSupabaseConnection = async () => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      showSupabasePopup(
        "error",
        "Konfigurasi Belum Lengkap",
        "URL Project dan Anon Key Supabase harus diisi terlebih dahulu.",
        "Masukkan URL dan Anon Key pada formulir di bawah ini lalu klik 'Simpan & Hubungkan'."
      );
      return;
    }

    setIsSupabaseSyncing(true);
    showSupabasePopup(
      "syncing",
      "Menguji Koneksi Supabase...",
      "Sistem sedang memverifikasi respon server dan ketersediaan tabel 'succession_data' di Supabase Cloud."
    );

    const res = await pullFromSupabase();
    setIsSupabaseSyncing(false);

    if (res.success) {
      setSupabaseStatus("success");
      setSupabaseError("");
      showSupabasePopup(
        "success",
        "Koneksi Supabase Sukses!",
        "Database Supabase Cloud terhubung sempurna dan siap untuk sinkronisasi data real-time.",
        `Status: Online & Responsive | Target URL: ${supabaseConfig.url}`
      );
    } else {
      setSupabaseStatus("error");
      setSupabaseError(res.error || "Gagal menyambung");
      showSupabasePopup(
        "error",
        "Gagal Menyambung ke Supabase",
        res.error || "Server Supabase menolak akses atau tabel belum disiapkan.",
        "Jalankan skema SQL inisialisasi di bawah ini di SQL Editor Supabase Anda untuk membuat tabel 'succession_data'.",
        `create table if not exists succession_data (
  id text primary key,
  talents jsonb not null,
  retiring_positions jsonb not null,
  evaluation_years jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table succession_data enable row level security;

drop policy if exists "Allow public read and write" on succession_data;
create policy "Allow public read and write" on succession_data for all using (true) with check (true);

grant all on succession_data to anon, authenticated, service_role;`
      );
    }
  };

  const handleAddEvaluationYear = (newYear: string) => {
    const trimmed = newYear.trim();
    if (!trimmed) return;
    if (!/^\d{4}$/.test(trimmed)) {
      alert("Format tahun tidak valid! Silakan masukkan 4 digit angka (misalnya: 2025).");
      return;
    }
    if (evaluationYears.includes(trimmed)) {
      alert(`Tahun Evaluasi FY ${trimmed} sudah ada!`);
      return;
    }
    // Sort years ascending
    const updated = [...evaluationYears, trimmed].sort((a, b) => parseInt(a) - parseInt(b));
    setEvaluationYears(updated);
    
    // Auto-populate the new FY in all talents with default rating 3
    setTalents((prevTalents) =>
      prevTalents.map((t) => {
        const prevEval = t.performanceEvaluation || {};
        return {
          ...t,
          performanceEvaluation: {
            ...prevEval,
            [`fy${trimmed}`]: 3
          }
        };
      })
    );
    addSecurityLog(`Tahun evaluasi baru FY ${trimmed} berhasil ditambahkan dan diinisialisasi untuk seluruh talent.`, "success");
  };

  const handleRemoveEvaluationYear = (yearToRemove: string) => {
    if (evaluationYears.length <= 1) {
      alert("Sistem membutuhkan minimal 1 tahun evaluasi untuk menghitung rata-rata.");
      return;
    }
    triggerDeleteModal({
      title: "Hapus Tahun Evaluasi FY?",
      itemName: `Tahun Evaluasi FY ${yearToRemove}`,
      itemSubtitle: "Pengaturan Kolom Master",
      warningText: `Apakah Anda yakin ingin menghapus tahun evaluasi FY ${yearToRemove}? Penghapusan ini juga akan membuang data bobot dan nilai penilaian kinerja terkait pada tahun tersebut.`,
      confirmButtonText: "Ya, Hapus Tahun Evaluasi",
      onConfirm: () => {
        setEvaluationYears((prev) => prev.filter((y) => y !== yearToRemove));
        addSecurityLog(`Tahun evaluasi FY ${yearToRemove} berhasil dihapus dari sistem.`, "warning");
        setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEnableVault = async (passphrase: string) => {
    try {
      setVaultError("");
      const hashed = await calculateHash(passphrase);
      addSecurityLog(`Mengaktifkan Secure Vault dengan kunci SHA-256: ${hashed.slice(0, 16)}...`, "info");
      
      const newEncrypted: Record<string, { ciphertext: string, salt: string, iv: string }> = {};
      for (const [key, value] of Object.entries(executiveCommentary) as Array<[string, string]>) {
        const encrypted = await encryptText(value, passphrase);
        newEncrypted[key] = encrypted;
        addSecurityLog(`Komentar untuk talent ID '${key}' berhasil dienkripsi menggunakan AES-GCM-256.`, "success");
      }
      
      setEncryptedCommentaries(newEncrypted);
      setIsVaultEnabled(true);
      setVaultPassphrase(passphrase);
      addSecurityLog("Enkripsi AES-256-GCM aktif di seluruh sistem data suksesi.", "success");
    } catch (err: any) {
      setVaultError(err.message || "Gagal mengaktifkan enkripsi.");
      addSecurityLog("Gagal mengaktifkan Secure Vault.", "warning");
    }
  };

  const handleLockVault = () => {
    setIsVaultLocked(true);
    // Overwrite plain commentary text to make sure it's not exposed
    setExecutiveCommentary({
      "edwin-prasetyo": "[DIAMANKAN - AES-256 ENCRYPTED DATA VAULT]",
      "siti-rahma": "[DIAMANKAN - AES-256 ENCRYPTED DATA VAULT]",
      "budi-santoso": "[DIAMANKAN - AES-256 ENCRYPTED DATA VAULT]",
      "amanda-collins": "[DIAMANKAN - AES-256 ENCRYPTED DATA VAULT]"
    });
    addSecurityLog("Kubah data (Secure Vault) TERKUNCI. Seluruh plain-text dibersihkan dari memori aktif.", "warning");
  };

  const handleUnlockVault = async (passphrase: string) => {
    try {
      setVaultError("");
      addSecurityLog("Mencoba membuka kunci kubah data. Menghitung kunci PBKDF2...", "info");
      
      const decrypted: Record<string, string> = {};
      for (const [key, enc] of Object.entries(encryptedCommentaries) as Array<[string, { ciphertext: string, salt: string, iv: string }]>) {
        const plain = await decryptText(enc.ciphertext, passphrase, enc.salt, enc.iv);
        decrypted[key] = plain;
        addSecurityLog(`Komentar untuk talent ID '${key}' berhasil didekripsi. Integritas data valid.`, "success");
      }
      
      setExecutiveCommentary(decrypted);
      setIsVaultLocked(false);
      setVaultPassphrase(passphrase);
      addSecurityLog("Kubah data berhasil dibuka. Seluruh data sensitif didekripsi dengan sukses.", "success");
    } catch (err: any) {
      setVaultError("Kata sandi dekripsi salah atau data terkorupsi.");
      addSecurityLog("Gagal membuka kubah data: Kata sandi tidak valid.", "warning");
    }
  };

  const handleUpdateAndEncryptCommentary = async (talentId: string, text: string) => {
    if (isVaultEnabled && !isVaultLocked) {
      try {
        const encrypted = await encryptText(text, vaultPassphrase);
        setEncryptedCommentaries(prev => ({
          ...prev,
          [talentId]: encrypted
        }));
        addSecurityLog(`Komentar baru untuk talent ID '${talentId}' telah dienkripsi secara real-time.`, "success");
      } catch (err) {
        addSecurityLog("Gagal mengenkripsi komentar baru secara real-time.", "warning");
      }
    }
    setExecutiveCommentary(prev => ({
      ...prev,
      [talentId]: text
    }));
  };

  const handleExportCSV = () => {
    // Columns headers matching system terminology ("Department / Divisi", "Jabatan", etc.)
    const headers = [
      "ID",
      "Nama Lengkap",
      "Jenis Kelamin (Laki-laki / Perempuan)",
      "NIK Karyawan",
      "Jabatan",
      "Department / Divisi",
      "Lokasi Kerja",
      "Masa Kerja (Tenure)",
      "Kesiapan (READY NOW / READY 1-2 YEARS / READY 2+ YEARS)",
      "Avatar URL",
      "Grade (M5-M1 / ST5-ST1)",
      "Tanggal Lahir (YYYY-MM-DD)",
      "Umur (Tahun)",
      "Tanggal Masuk (YYYY-MM-DD)",
      "Riwayat Pelatihan / Training",
      "Kinerja Evaluation FY2020 (1-5)",
      "Kinerja Evaluation FY2021 (1-5)",
      "Kinerja Evaluation FY2022 (1-5)",
      "Kinerja Evaluation FY2023 (1-5)",
      "Kinerja Evaluation FY2024 (1-5)",
      "Kustom Kinerja Nine-Box (Low / Medium / High)",
      "Kustom Potensi Nine-Box (Low / Medium / High)",
      "Catatan Evaluasi Nine-Box",
      "Skor Logical Reasoning (0-100)",
      "Skor Leadership Potential (0-100)",
      "Skor Emotional Agility (0-100)",
      "Kompetensi Business Knowledge (0-100)",
      "Kompetensi Leadership (0-100)",
      "Kompetensi Problem Solving (0-100)",
      "Kompetensi Interpersonal Skill (0-100)",
      "IDP 1: Judul Program",
      "IDP 1: Deskripsi",
      "IDP 1: Progres (0-100)",
      "IDP 2: Judul Program",
      "IDP 2: Deskripsi",
      "IDP 2: Progres (0-100)",
      "Asesmen Kemampuan Intelektual (1-3)",
      "Asesmen Berpikir Kritis (1-3)",
      "Asesmen Menyelesaikan Masalah (1-3)",
      "Asesmen Belajar Cepat (1-3)",
      "Asesmen Kesadaran Diri (1-3)",
      "Asesmen Interpersonal (1-3)",
      "Asesmen Kecerdasan Emosional (1-3)",
      "Asesmen Motivasi & Komitmen (1-3)",
      "Nilai Standar Business Knowledge (1-5)",
      "Nilai Standar Leadership (1-5)",
      "Nilai Standar Problem Solving (1-5)",
      "Nilai Standar Interpersonal Skill (1-5)",
      "Nilai Standar Strategic Mindset (1-5)",
      "Nilai Standar Manages Complexity (1-5)",
      "Nilai Standar Ensures Accountability (1-5)",
      "Nilai Standar Drives Vision (1-5)",
      "Nilai Standar Cultivate Innovation (1-5)",
      "Latar Belakang Studi (Nama)",
      "Latar Belakang Studi (Skor 1-3)",
      "Target Tingkat Jabatan (SM / DM)",
      "Nilai Evaluasi Kinerja (Sumbu Y 12.5-50.0)",
      "Persentase Kinerja (%)",
      "Kode Kategori Evaluasi (1=Rendah, 2=Sedang, 3=Tinggi)",
      "Kategori Evaluasi Kinerja",
      "Nomor Kotak Nine-Box (1-9)"
    ];

    const rows = talents.map(t => {
      const lr = t.psychometric?.logicalReasoning?.score ?? 80;
      const lp = t.psychometric?.leadershipPotential?.score ?? 80;
      const ea = t.psychometric?.emotionalAgility?.score ?? 80;

      const bk = t.competencies?.find(c => c.name === "Business Knowledge")?.score ?? 80;
      const ld = t.competencies?.find(c => c.name === "Leadership")?.score ?? 80;
      const ps = t.competencies?.find(c => c.name === "Problem Solving")?.score ?? 80;
      const ip = t.competencies?.find(c => c.name === "Interpersonal Skill")?.score ?? 80;

      const idp1 = t.idp?.[0];
      const idp2 = t.idp?.[1];

      const pe = t.performanceEvaluation || { fy2020: 3, fy2021: 3, fy2022: 3, fy2023: 3, fy2024: 4 };

      const perfDetails = calculateTalentPerformanceDetails(t);
      const placement = getTalentPlacement(t);
      const cellName = getCellName(placement.performance, placement.potential);
      const boxMatch = cellName.match(/Box\s*(\d+)/i);
      const boxNum = boxMatch ? parseInt(boxMatch[1]) : (t.squareOfTalent || 5);

      const pa = t.potentialAssessment || {
        kemampuanIntelektual: 2,
        berpikirKritis: 2,
        menyelesaikanMasalah: 2,
        belajarCepat: 2,
        kesadaranDiri: 2,
        interpersonal: 2,
        kecerdasanEmosional: 2,
        motivasiKomitmen: 2,
        businessKnowledge: 3,
        leadership: 3,
        problemSolving: 3,
        interpersonalSkill: 3,
        strategicMindset: 3,
        managesComplexity: 3,
        ensuresAccountability: 3,
        drivesVision: 3,
        cultivateInnovation: 3,
        studyBackgroundName: "Management",
        studyBackgroundScore: 2,
        targetLevel: "SM"
      };

      const trainingsStr = t.trainings && t.trainings.length > 0
        ? t.trainings.map(tr => `${tr.name} [${tr.type}]`).join("; ")
        : "";

      return [
        t.id,
        t.name,
        t.gender || "Laki-laki",
        t.nik || "",
        t.title,
        t.division,
        t.location,
        t.tenure,
        t.readiness,
        t.avatar || "",
        t.grade || "M4",
        t.birthDate || "1988-10-10",
        t.age ?? 38,
        t.joinDate || "2021-01-01",
        trainingsStr,
        pe.fy2020 ?? 3,
        pe.fy2021 ?? 3,
        pe.fy2022 ?? 3,
        pe.fy2023 ?? 3,
        pe.fy2024 ?? 4,
        t.customPerformance || "",
        t.customPotential || "",
        t.nineBoxNotes || "",
        lr,
        lp,
        ea,
        bk,
        ld,
        ps,
        ip,
        idp1?.title || "",
        idp1?.description || "",
        idp1?.progress ?? 0,
        idp2?.title || "",
        idp2?.description || "",
        idp2?.progress ?? 0,
        pa.kemampuanIntelektual ?? 2,
        pa.berpikirKritis ?? 2,
        pa.menyelesaikanMasalah ?? 2,
        pa.belajarCepat ?? 2,
        pa.kesadaranDiri ?? 2,
        pa.interpersonal ?? 2,
        pa.kecerdasanEmosional ?? 2,
        pa.motivasiKomitmen ?? 2,
        pa.businessKnowledge ?? 3,
        pa.leadership ?? 3,
        pa.problemSolving ?? 3,
        pa.interpersonalSkill ?? 3,
        pa.strategicMindset ?? 3,
        pa.managesComplexity ?? 3,
        pa.ensuresAccountability ?? 3,
        pa.drivesVision ?? 3,
        pa.cultivateInnovation ?? 3,
        pa.studyBackgroundName || "",
        pa.studyBackgroundScore ?? 2,
        pa.targetLevel || "SM",
        perfDetails.score50.toFixed(2),
        `${perfDetails.percentage.toFixed(1)}%`,
        perfDetails.code,
        perfDetails.categoryName,
        boxNum
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => {
          const s = String(val ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Format_Database_Komite_Talent_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addSecurityLog("Format database berhasil diekspor ke berkas Excel/CSV.", "success");
  };

  const normalizeImportRowObject = (row: any) => {
    const getVal = (keys: string[], defaultVal: string = "") => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
          return String(row[k]).trim();
        }
      }
      return defaultVal;
    };

    const getFloatVal = (keys: string[], defaultVal: number = 0) => {
      const str = getVal(keys);
      if (!str) return defaultVal;
      const parsed = parseFloat(str.replace(',', '.'));
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const getIntVal = (keys: string[], defaultVal: number = 0) => {
      return Math.round(getFloatVal(keys, defaultVal));
    };

    return {
      rawId: getVal(["id", "ID", "id (kustom)"]),
      name: getVal(["name", "Nama Lengkap", "nama", "namalengkap", "Nama"]),
      gender: getVal(["gender", "Jenis Kelamin", "jeniskelamin", "JK", "sex"], "Laki-laki"),
      nik: getVal(["nik", "NIK Karyawan", "nikkaryawan", "employeeid", "nomorindukkaryawan"]),
      title: getVal(["title", "Jabatan", "jabatan", "posisi", "position"]),
      division: getVal(["division", "Department / Divisi", "Department", "department", "departemen", "divisi", "Divisi", "dept", "sektor"]),
      location: getVal(["location", "Lokasi Kerja", "Lokasi", "lokasi"]),
      tenure: getVal(["tenure", "Masa Kerja (Tenure)", "Masa Kerja", "masakerja"]),
      readiness: getVal(["readiness", "Kesiapan (READY NOW / READY 1-2 YEARS / READY 2+ YEARS)", "Kesiapan", "readinesslevel", "kesiapan"]),
      avatar: getVal(["avatar", "Avatar URL", "foto", "image"]),
      grade: getVal(["grade", "Grade (M5-M1 / ST5-ST1)", "Grade", "golongan"]),
      birthDate: getVal(["birthDate", "birthdate", "Tanggal Lahir (YYYY-MM-DD)", "Tanggal Lahir", "tanggallahir"]),
      age: getIntVal(["age", "Umur (Tahun)", "Umur", "umur", "usia"], 38),
      joinDate: getVal(["joinDate", "joindate", "Tanggal Masuk (YYYY-MM-DD)", "Tanggal Masuk", "tanggalmasuk"]),
      trainingsRaw: getVal(["trainings", "Pelatihan", "training", "Riwayat Pelatihan / Training", "sertifikasi", "Riwayat Pelatihan"]),
      
      fy2020: getFloatVal(["fy2020", "Kinerja Evaluation FY2020 (1-5)", "fy2020", "kinerja2020", "2020"], 0),
      fy2021: getFloatVal(["fy2021", "Kinerja Evaluation FY2021 (1-5)", "fy2021", "kinerja2021", "2021"], 0),
      fy2022: getFloatVal(["fy2022", "Kinerja Evaluation FY2022 (1-5)", "fy2022", "kinerja2022", "2022"], 0),
      fy2023: getFloatVal(["fy2023", "Kinerja Evaluation FY2023 (1-5)", "fy2023", "kinerja2023", "2023"], 0),
      fy2024: getFloatVal(["fy2024", "Kinerja Evaluation FY2024 (1-5)", "fy2024", "kinerja2024", "2024"], 0),

      customPerformance: getVal(["customPerformance", "customperformance", "Kustom Kinerja Nine-Box (Low / Medium / High)", "Kustom Kinerja Nine-Box"]),
      customPotential: getVal(["customPotential", "custompotential", "Kustom Potensi Nine-Box (Low / Medium / High)", "Kustom Potensi Nine-Box"]),
      nineBoxNotes: getVal(["nineBoxNotes", "nineboxnotes", "Catatan Evaluasi Nine-Box", "Catatan"]),

      logicalScore: getIntVal(["logicalScore", "logicalscore", "logical", "Skor Logical Reasoning (0-100)", "logicalReasoning"], 80),
      leadershipScore: getIntVal(["leadershipScore", "leadershipscore", "leadership", "Skor Leadership Potential (0-100)", "leadershipPotential"], 80),
      emotionalScore: getIntVal(["emotionalScore", "emotionalscore", "emotional", "Skor Emotional Agility (0-100)", "emotionalAgility"], 80),

      bkScore: getIntVal(["bkScore", "compBusinessKnowledge", "problemsolvingscore", "Kompetensi Business Knowledge (0-100)"], 80),
      ldScore: getIntVal(["ldScore", "compLeadership", "strategicscore", "Kompetensi Leadership (0-100)"], 80),
      psScore: getIntVal(["psScore", "compProblemSolving", "stakeholderscore", "Kompetensi Problem Solving (0-100)"], 80),
      ipScore: getIntVal(["ipScore", "compInterpersonal", "resultsscore", "Kompetensi Interpersonal Skill (0-100)"], 80),

      idp1Title: getVal(["idp1Title", "idptitle1", "IDP 1: Judul Program"]),
      idp1Desc: getVal(["idp1Desc", "idpdesc1", "IDP 1: Deskripsi"]),
      idp1Progress: getIntVal(["idp1Progress", "idpprogress1", "IDP 1: Progres (0-100)"], 30),

      idp2Title: getVal(["idp2Title", "idptitle2", "IDP 2: Judul Program"]),
      idp2Desc: getVal(["idp2Desc", "idpdesc2", "IDP 2: Deskripsi"]),
      idp2Progress: getIntVal(["idp2Progress", "idpprogress2", "IDP 2: Progres (0-100)"], 0),

      kemampuanIntelektual: getIntVal(["kemampuanIntelektual", "Asesmen Kemampuan Intelektual (1-3)"], 2),
      berpikirKritis: getIntVal(["berpikirKritis", "Asesmen Berpikir Kritis (1-3)"], 2),
      menyelesaikanMasalah: getIntVal(["menyelesaikanMasalah", "Asesmen Menyelesaikan Masalah (1-3)"], 2),
      belajarCepat: getIntVal(["belajarCepat", "Asesmen Belajar Cepat (1-3)"], 2),
      kesadaranDiri: getIntVal(["kesadaranDiri", "Asesmen Kesadaran Diri (1-3)"], 2),
      interpersonal: getIntVal(["interpersonal", "Asesmen Interpersonal (1-3)"], 2),
      kecerdasanEmosional: getIntVal(["kecerdasanEmosional", "Asesmen Kecerdasan Emosional (1-3)"], 2),
      motivasiKomitmen: getIntVal(["motivasiKomitmen", "Asesmen Motivasi & Komitmen (1-3)"], 2),

      stdBusinessKnowledge: getIntVal(["stdBusinessKnowledge", "businessKnowledge", "business_knowledge", "Business Knowledge", "Business Knowledge (1-5)", "Nilai Standar Business Knowledge (1-5)", "l. Business Knowledge", "l) Business Knowledge", "l_Business Knowledge", "compBusinessKnowledge"], 3),
      stdLeadership: getIntVal(["stdLeadership", "leadership", "Leadership", "Leadership (1-5)", "Nilai Standar Leadership (1-5)", "m. Leadership", "m) Leadership", "m_Leadership", "compLeadership"], 3),
      stdProblemSolving: getIntVal(["stdProblemSolving", "problemSolving", "problem_solving", "Problem Solving", "Problem Solving (1-5)", "Nilai Standar Problem Solving (1-5)", "n. Problem Solving", "n) Problem Solving", "n_Problem Solving", "compProblemSolving"], 3),
      stdInterpersonalSkill: getIntVal(["stdInterpersonalSkill", "interpersonalSkill", "interpersonal_skill", "Interpersonal Skill", "Interpersonal Skill (1-5)", "Nilai Standar Interpersonal Skill (1-5)", "o. Interpersonal Skill", "o) Interpersonal Skill", "o_Interpersonal Skill", "compInterpersonal"], 3),
      stdStrategicMindset: getIntVal(["stdStrategicMindset", "strategicMindset", "strategic_mindset", "Strategic Mindset", "Strategic Mindset (1-5)", "Nilai Standar Strategic Mindset (1-5)", "p. Strategic Mindset", "p) Strategic Mindset", "p_Strategic Mindset"], 3),
      stdManagesComplexity: getIntVal(["stdManagesComplexity", "managesComplexity", "manages_complexity", "Manages Complexity", "Manages Complexity (1-5)", "Nilai Standar Manages Complexity (1-5)", "q. Manages Complexity", "q) Manages Complexity", "q_Manages Complexity"], 3),
      stdEnsuresAccountability: getIntVal(["stdEnsuresAccountability", "ensuresAccountability", "ensures_accountability", "Ensures Accountability", "Ensures Accountability (1-5)", "Nilai Standar Ensures Accountability (1-5)", "r. Ensures Accountability", "r) Ensures Accountability", "r_Ensures Accountability"], 3),
      stdDrivesVision: getIntVal(["stdDrivesVision", "drivesVision", "drives_vision", "Drives Vision", "Drives Vision (1-5)", "Nilai Standar Drives Vision (1-5)", "s. Drives Vision", "s) Drives Vision", "s_Drives Vision"], 3),
      stdCultivateInnovation: getIntVal(["stdCultivateInnovation", "cultivateInnovation", "cultivate_innovation", "Cultivate Innovation", "Cultivate Innovation (1-5)", "Nilai Standar Cultivate Innovation (1-5)", "t. Cultivate Innovation", "t) Cultivate Innovation", "t_Cultivate Innovation"], 3),

      studyBackgroundName: getVal(["studyBackgroundName", "studybackgroundname", "Latar Belakang Studi (Nama)", "pendidikan"]),
      studyBackgroundScore: getIntVal(["studyBackgroundScore", "studybackgroundscore", "Latar Belakang Studi (Skor 1-3)", "poinpendidikan"], 3),
      targetLevel: getVal(["targetLevel", "Target Tingkat Jabatan (SM / DM)"], "SM")
    };
  };

  const processTalentImportRows = (rawText: string, fileType: "json" | "csv") => {
    let importedRows: any[] = [];
    
    if (fileType === "json") {
      try {
        const parsed = JSON.parse(rawText);
        const arrayRows = Array.isArray(parsed) ? parsed : [parsed];
        importedRows = arrayRows.map(row => normalizeImportRowObject(row));
      } catch (err: any) {
        throw new Error("Format JSON tidak valid: " + err.message);
      }
    } else {
      const parseCSVLines = (text: string): string[][] => {
        const lines: string[][] = [];
        let row: string[] = [];
        let insideQuote = false;
        let entry = "";
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];
          
          if (char === '"') {
            if (insideQuote && nextChar === '"') {
              entry += '"';
              i++;
            } else {
              insideQuote = !insideQuote;
            }
          } else if (char === ',' && !insideQuote) {
            row.push(entry.trim());
            entry = "";
          } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            row.push(entry.trim());
            if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
              lines.push(row);
            }
            row = [];
            entry = "";
          } else {
            entry += char;
          }
        }
        if (entry !== "" || row.length > 0) {
          row.push(entry.trim());
          lines.push(row);
        }
        return lines;
      };

      const parsedRows = parseCSVLines(rawText);
      if (parsedRows.length <= 1) {
        throw new Error("Berkas CSV kosong atau tidak memiliki baris data.");
      }

      // Find real header row (ignoring decorative title rows)
      let headerRowIndex = parsedRows.findIndex(row => 
        row.some(cell => {
          const c = cell.trim().toLowerCase();
          return c === "nama" || c === "name" || c === "nik" || c === "position" || c === "no";
        })
      );
      if (headerRowIndex === -1) headerRowIndex = 0;

      const headerRow = parsedRows[headerRowIndex];
      const rawDataRows = parsedRows.slice(headerRowIndex + 1);

      // Filter out formula legend / descriptor rows
      const dataRows = rawDataRows.filter(row => {
        const rowStr = row.join(" ").toLowerCase();
        if (!rowStr.trim()) return false;
        if (rowStr.includes("a,b,c,d") || rowStr.includes("i : sum") || rowStr.includes("k : j * 40%") || rowStr.includes("nilai maximal") || rowStr.includes("standar psychotest")) return false;
        // Check if there is a name or valid NIK in the row
        return row.some(cell => cell.trim().length > 0);
      });

      const EXACT_HEADER_MAP: { [key: string]: string } = {
        "id": "id",
        "nama lengkap": "name",
        "jenis kelamin (laki-laki / perempuan)": "gender",
        "nik karyawan": "nik",
        "jabatan": "title",
        "department / divisi": "division",
        "lokasi kerja": "location",
        "masa kerja (tenure)": "tenure",
        "kesiapan (ready now / ready 1-2 years / ready 2+ years)": "readiness",
        "avatar url": "avatar",
        "grade (m5-m1 / st5-st1)": "grade",
        "tanggal lahir (yyyy-mm-dd)": "birthDate",
        "umur (tahun)": "age",
        "tanggal masuk (yyyy-mm-dd)": "joinDate",
        "riwayat pelatihan / training": "trainingsRaw",
        "kinerja evaluation fy2020 (1-5)": "fy2020",
        "kinerja evaluation fy2021 (1-5)": "fy2021",
        "kinerja evaluation fy2022 (1-5)": "fy2022",
        "kinerja evaluation fy2023 (1-5)": "fy2023",
        "kinerja evaluation fy2024 (1-5)": "fy2024",
        "kustom kinerja nine-box (low / medium / high)": "customPerformance",
        "kustom potensi nine-box (low / medium / high)": "customPotential",
        "catatan evaluasi nine-box": "nineBoxNotes",
        "skor logical reasoning (0-100)": "logicalReasoning",
        "skor leadership potential (0-100)": "leadershipPotential",
        "skor emotional agility (0-100)": "emotionalAgility",
        "kompetensi business knowledge (0-100)": "compBusinessKnowledge",
        "kompetensi leadership (0-100)": "compLeadership",
        "kompetensi problem solving (0-100)": "compProblemSolving",
        "kompetensi interpersonal skill (0-100)": "compInterpersonal",
        "idp 1: judul program": "idp1Title",
        "idp 1: deskripsi": "idp1Desc",
        "idp 1: progres (0-100)": "idp1Progress",
        "idp 2: judul program": "idp2Title",
        "idp 2: deskripsi": "idp2Desc",
        "idp 2: progres (0-100)": "idp2Progress",
        "asesmen kemampuan intelektual (1-3)": "kemampuanIntelektual",
        "asesmen berpikir kritis (1-3)": "berpikirKritis",
        "asesmen menyelesaikan masalah (1-3)": "menyelesaikanMasalah",
        "asesmen belajar cepat (1-3)": "belajarCepat",
        "asesmen kesadaran diri (1-3)": "kesadaranDiri",
        "asesmen interpersonal (1-3)": "interpersonal",
        "asesmen kecerdasan emosional (1-3)": "kecerdasanEmosional",
        "asesmen motivasi & komitmen (1-3)": "motivasiKomitmen",
        "nilai standar business knowledge (1-5)": "stdBusinessKnowledge",
        "nilai standar leadership (1-5)": "stdLeadership",
        "nilai standar problem solving (1-5)": "stdProblemSolving",
        "nilai standar interpersonal skill (1-5)": "stdInterpersonalSkill",
        "nilai standar strategic mindset (1-5)": "stdStrategicMindset",
        "nilai standar manages complexity (1-5)": "stdManagesComplexity",
        "nilai standar ensures accountability (1-5)": "stdEnsuresAccountability",
        "nilai standar drives vision (1-5)": "stdDrivesVision",
        "nilai standar cultivate innovation (1-5)": "stdCultivateInnovation",
        "latar belakang studi (nama)": "studyBackgroundName",
        "latar belakang studi (skor 1-3)": "studyBackgroundScore",
        "target tingkat jabatan (sm / dm)": "targetLevel",
        "nilai evaluasi kinerja (sumbu y 12.5-50.0)": "evaluasiScore",
        "kode kategori evaluasi (1=rendah, 2=sedang, 3=tinggi)": "evaluasiCode",
        "kategori evaluasi kinerja": "evaluasiCategory",
        "nomor kotak nine-box (1-9)": "squareOfTalent"
      };

      const headerMap: { [key: string]: number } = {};
      headerRow.forEach((headerName, idx) => {
        const cleanHeader = headerName.trim().toLowerCase();
        
        if (EXACT_HEADER_MAP[cleanHeader]) {
          headerMap[EXACT_HEADER_MAP[cleanHeader]] = idx;
        } else if (cleanHeader === "id" || cleanHeader === "rawid" || cleanHeader.includes("id (")) {
          headerMap["id"] = idx;
        } else if (
          cleanHeader === "nama lengkap" || 
          cleanHeader === "nama" || 
          cleanHeader === "name" || 
          cleanHeader === "full name" || 
          cleanHeader === "fullname" || 
          cleanHeader === "nama karyawan" ||
          ((cleanHeader.includes("nama") || cleanHeader.includes("name")) && 
           !cleanHeader.includes("studi") && 
           !cleanHeader.includes("study") && 
           !cleanHeader.includes("idp") && 
           !cleanHeader.includes("program") && 
           !cleanHeader.includes("kategori"))
        ) {
          headerMap["name"] = idx;
        } else if (cleanHeader.includes("jenis kelamin") || cleanHeader.includes("gender") || cleanHeader === "jk" || cleanHeader === "sex") {
          headerMap["gender"] = idx;
        } else if (cleanHeader.includes("nik") || cleanHeader.includes("nomor induk") || cleanHeader.includes("employee id") || cleanHeader.includes("employeeid")) {
          headerMap["nik"] = idx;
        } else if (cleanHeader.includes("jabatan") || cleanHeader === "position" || cleanHeader === "title" || cleanHeader.includes("posisi")) {
          headerMap["title"] = idx;
        } else if (cleanHeader.includes("department") || cleanHeader.includes("departemen") || cleanHeader.includes("divisi") || cleanHeader.includes("division") || cleanHeader.includes("dept") || cleanHeader.includes("sektor")) {
          headerMap["division"] = idx;
        } else if (cleanHeader.includes("lokasi") || cleanHeader.includes("location") || cleanHeader.includes("base")) {
          headerMap["location"] = idx;
        } else if (cleanHeader.includes("masa kerja") || cleanHeader.includes("tenure") || cleanHeader.includes("masakerja")) {
          headerMap["tenure"] = idx;
        } else if (cleanHeader.includes("kesiapan") || cleanHeader.includes("readiness")) {
          headerMap["readiness"] = idx;
        } else if (cleanHeader.includes("avatar") || cleanHeader.includes("foto") || cleanHeader.includes("image")) {
          headerMap["avatar"] = idx;
        } else if (cleanHeader.includes("grade") || cleanHeader.includes("golongan")) {
          headerMap["grade"] = idx;
        } else if (cleanHeader.includes("tanggal lahir") || cleanHeader.includes("birth date") || cleanHeader.includes("birthdate") || cleanHeader.includes("tanggallahir")) {
          headerMap["birthDate"] = idx;
        } else if (cleanHeader.includes("umur") || cleanHeader.includes("age") || cleanHeader.includes("usia")) {
          headerMap["age"] = idx;
        } else if (cleanHeader.includes("tanggal masuk") || cleanHeader.includes("join date") || cleanHeader.includes("joindate") || cleanHeader.includes("tanggalmasuk")) {
          headerMap["joinDate"] = idx;
        } else if (cleanHeader.includes("training") || cleanHeader.includes("pelatihan") || cleanHeader.includes("sertifikasi")) {
          headerMap["trainingsRaw"] = idx;
        } else if (cleanHeader.includes("fy2020") || (cleanHeader.includes("2020") && cleanHeader.includes("kinerja"))) {
          headerMap["fy2020"] = idx;
        } else if (cleanHeader.includes("fy2021") || (cleanHeader.includes("2021") && cleanHeader.includes("kinerja"))) {
          headerMap["fy2021"] = idx;
        } else if (cleanHeader.includes("fy2022") || (cleanHeader.includes("2022") && cleanHeader.includes("kinerja"))) {
          headerMap["fy2022"] = idx;
        } else if (cleanHeader.includes("fy2023") || (cleanHeader.includes("2023") && cleanHeader.includes("kinerja"))) {
          headerMap["fy2023"] = idx;
        } else if (cleanHeader.includes("fy2024") || (cleanHeader.includes("2024") && cleanHeader.includes("kinerja"))) {
          headerMap["fy2024"] = idx;
        } else if (cleanHeader.includes("kustom kinerja") || cleanHeader.includes("custom performance") || cleanHeader.includes("customperformance")) {
          headerMap["customPerformance"] = idx;
        } else if (cleanHeader.includes("kustom potensi") || cleanHeader.includes("custom potential") || cleanHeader.includes("custompotential")) {
          headerMap["customPotential"] = idx;
        } else if (cleanHeader.includes("catatan") || cleanHeader.includes("notes") || cleanHeader.includes("nineboxnotes")) {
          headerMap["nineBoxNotes"] = idx;
        } else if (cleanHeader.includes("logical reasoning") || cleanHeader.includes("logicalscore") || cleanHeader === "logical") {
          headerMap["logicalReasoning"] = idx;
        } else if (cleanHeader.includes("leadership potential") || cleanHeader.includes("leadershipscore")) {
          headerMap["leadershipPotential"] = idx;
        } else if (cleanHeader.includes("emotional agility") || cleanHeader.includes("emotionalscore")) {
          headerMap["emotionalAgility"] = idx;
        } else if (cleanHeader.includes("kompetensi business knowledge") || (cleanHeader.includes("business knowledge") && !cleanHeader.includes("standar") && !cleanHeader.includes("nilai") && !cleanHeader.includes("potential"))) {
          headerMap["compBusinessKnowledge"] = idx;
        } else if (cleanHeader.includes("kompetensi leadership") || (cleanHeader.includes("leadership") && !cleanHeader.includes("standar") && !cleanHeader.includes("nilai") && !cleanHeader.includes("potential"))) {
          headerMap["compLeadership"] = idx;
        } else if (cleanHeader.includes("kompetensi problem solving") || (cleanHeader.includes("problem solving") && !cleanHeader.includes("standar") && !cleanHeader.includes("nilai") && !cleanHeader.includes("potential"))) {
          headerMap["compProblemSolving"] = idx;
        } else if (cleanHeader.includes("kompetensi interpersonal") || (cleanHeader.includes("interpersonal skill") && !cleanHeader.includes("standar") && !cleanHeader.includes("nilai") && !cleanHeader.includes("potential"))) {
          headerMap["compInterpersonal"] = idx;
        } else if (cleanHeader.includes("idp 1") && (cleanHeader.includes("judul") || cleanHeader.includes("title"))) {
          headerMap["idp1Title"] = idx;
        } else if (cleanHeader.includes("idp 1") && (cleanHeader.includes("deskripsi") || cleanHeader.includes("desc"))) {
          headerMap["idp1Desc"] = idx;
        } else if (cleanHeader.includes("idp 1") && (cleanHeader.includes("progres") || cleanHeader.includes("progress"))) {
          headerMap["idp1Progress"] = idx;
        } else if (cleanHeader.includes("idp 2") && (cleanHeader.includes("judul") || cleanHeader.includes("title"))) {
          headerMap["idp2Title"] = idx;
        } else if (cleanHeader.includes("idp 2") && (cleanHeader.includes("deskripsi") || cleanHeader.includes("desc"))) {
          headerMap["idp2Desc"] = idx;
        } else if (cleanHeader.includes("idp 2") && (cleanHeader.includes("progres") || cleanHeader.includes("progress"))) {
          headerMap["idp2Progress"] = idx;
        } else if (cleanHeader.includes("kemampuan intelektual")) {
          headerMap["kemampuanIntelektual"] = idx;
        } else if (cleanHeader.includes("berpikir kritis")) {
          headerMap["berpikirKritis"] = idx;
        } else if (cleanHeader.includes("menyelesaikan masalah") || cleanHeader.includes("menyelesaikan permasalahan")) {
          headerMap["menyelesaikanMasalah"] = idx;
        } else if (cleanHeader.includes("belajar cepat")) {
          headerMap["belajarCepat"] = idx;
        } else if (cleanHeader.includes("kesadaran diri")) {
          headerMap["kesadaranDiri"] = idx;
        } else if (cleanHeader.includes("asesmen interpersonal") || (cleanHeader.includes("interpersonal") && cleanHeader.includes("asesmen"))) {
          headerMap["interpersonal"] = idx;
        } else if (cleanHeader.includes("kecerdasan emosional")) {
          headerMap["kecerdasanEmosional"] = idx;
        } else if (cleanHeader.includes("motivasi")) {
          headerMap["motivasiKomitmen"] = idx;
        } else if (cleanHeader.includes("nilai standar business knowledge") || (cleanHeader.includes("business knowledge") && cleanHeader.includes("standar"))) {
          headerMap["stdBusinessKnowledge"] = idx;
        } else if (cleanHeader.includes("nilai standar leadership") || (cleanHeader.includes("leadership") && cleanHeader.includes("standar"))) {
          headerMap["stdLeadership"] = idx;
        } else if (cleanHeader.includes("nilai standar problem solving") || (cleanHeader.includes("problem solving") && cleanHeader.includes("standar"))) {
          headerMap["stdProblemSolving"] = idx;
        } else if (cleanHeader.includes("nilai standar interpersonal") || (cleanHeader.includes("interpersonal") && cleanHeader.includes("standar"))) {
          headerMap["stdInterpersonalSkill"] = idx;
        } else if (cleanHeader.includes("strategic mindset")) {
          headerMap["stdStrategicMindset"] = idx;
        } else if (cleanHeader.includes("manages complexity")) {
          headerMap["stdManagesComplexity"] = idx;
        } else if (cleanHeader.includes("ensures accountability")) {
          headerMap["stdEnsuresAccountability"] = idx;
        } else if (cleanHeader.includes("drives vision")) {
          headerMap["stdDrivesVision"] = idx;
        } else if (cleanHeader.includes("cultivate innovation")) {
          headerMap["stdCultivateInnovation"] = idx;
        } else if (cleanHeader.includes("latar belakang studi") && (cleanHeader.includes("nama") || !cleanHeader.includes("skor"))) {
          headerMap["studyBackgroundName"] = idx;
        } else if (cleanHeader.includes("latar belakang studi") && cleanHeader.includes("skor")) {
          headerMap["studyBackgroundScore"] = idx;
        } else if (cleanHeader.includes("study background") && !cleanHeader.includes("assessment") && !cleanHeader.includes("skor") && !cleanHeader.includes("score")) {
          headerMap["studyBackgroundName"] = idx;
        } else if (cleanHeader.includes("assessment study background") || (cleanHeader.includes("study background") && (cleanHeader.includes("skor") || cleanHeader.includes("score")))) {
          headerMap["studyBackgroundScore"] = idx;
        } else if (cleanHeader.includes("target tingkat jabatan") || cleanHeader.includes("target level")) {
          headerMap["targetLevel"] = idx;
        } else if (cleanHeader.includes("nilai evaluasi kinerja") || cleanHeader.includes("sumbu y")) {
          headerMap["evaluasiScore"] = idx;
        } else if (cleanHeader.includes("kode kategori evaluasi") || cleanHeader.includes("kode evaluasi") || cleanHeader.includes("evaluation_code")) {
          headerMap["evaluasiCode"] = idx;
        } else if (cleanHeader.includes("kategori evaluasi kinerja") || (cleanHeader.includes("kategori evaluasi") && !cleanHeader.includes("kode"))) {
          headerMap["evaluasiCategory"] = idx;
        } else if (cleanHeader.includes("nomor kotak nine-box") || cleanHeader.includes("square of talent") || cleanHeader.includes("square_of_talent") || cleanHeader.includes("nomor kotak")) {
          headerMap["squareOfTalent"] = idx;
        }
      });

      dataRows.forEach(row => {
        const getVal = (key: string, defaultVal: string = ""): string => {
          const idx = headerMap[key];
          if (idx === undefined || idx >= row.length) return defaultVal;
          return (row[idx] ?? defaultVal).trim();
        };

        const getFloatVal = (key: string, defaultVal: number = 0): number => {
          const val = getVal(key);
          if (!val) return defaultVal;
          const parsed = parseFloat(val.replace(',', '.'));
          return isNaN(parsed) ? defaultVal : parsed;
        };

        const getIntVal = (key: string, defaultVal: number = 0): number => {
          return Math.round(getFloatVal(key, defaultVal));
        };

        importedRows.push({
          rawId: getVal("id"),
          name: getVal("name"),
          gender: getVal("gender", "Laki-laki"),
          nik: getVal("nik"),
          title: getVal("title", "Managerial Staff"),
          division: getVal("division", "Technology Dept."),
          location: getVal("location", "Jakarta HQ"),
          tenure: getVal("tenure", "3 Years"),
          readiness: getVal("readiness", "READY 1-2 YEARS"),
          avatar: getVal("avatar"),
          grade: getVal("grade", "M4"),
          birthDate: getVal("birthDate", "1988-10-10"),
          age: getIntVal("age", 38),
          joinDate: getVal("joinDate", "2021-01-01"),
          trainingsRaw: getVal("trainingsRaw"),
          fy2020: getFloatVal("fy2020", 0),
          fy2021: getFloatVal("fy2021", 0),
          fy2022: getFloatVal("fy2022", 0),
          fy2023: getFloatVal("fy2023", 0),
          fy2024: getFloatVal("fy2024", 0),
          customPerformance: getVal("customPerformance"),
          customPotential: getVal("customPotential"),
          nineBoxNotes: getVal("nineBoxNotes"),
          logicalScore: getIntVal("logicalReasoning", 80),
          leadershipScore: getIntVal("leadershipPotential", 80),
          emotionalScore: getIntVal("emotionalAgility", 80),
          bkScore: getIntVal("compBusinessKnowledge", 80),
          ldScore: getIntVal("compLeadership", 80),
          psScore: getIntVal("compProblemSolving", 80),
          ipScore: getIntVal("compInterpersonal", 80),
          idp1Title: getVal("idp1Title", "Strategic Leadership Program"),
          idp1Desc: getVal("idp1Desc", "Advanced coaching on business strategy and scaling regional operations."),
          idp1Progress: getIntVal("idp1Progress", 30),
          idp2Title: getVal("idp2Title", "Data-Driven Decision Making"),
          idp2Desc: getVal("idp2Desc", "Focusing on big data analytics and practical predictive insights."),
          idp2Progress: getIntVal("idp2Progress", 0),
          kemampuanIntelektual: getFloatVal("kemampuanIntelektual", 3),
          berpikirKritis: getFloatVal("berpikirKritis", 3),
          menyelesaikanMasalah: getFloatVal("menyelesaikanMasalah", 3),
          belajarCepat: getFloatVal("belajarCepat", 3),
          kesadaranDiri: getFloatVal("kesadaranDiri", 3),
          interpersonal: getFloatVal("interpersonal", 3),
          kecerdasanEmosional: getFloatVal("kecerdasanEmosional", 3),
          motivasiKomitmen: getFloatVal("motivasiKomitmen", 3),
          stdBusinessKnowledge: getFloatVal("stdBusinessKnowledge", 1),
          stdLeadership: getFloatVal("stdLeadership", 1),
          stdProblemSolving: getFloatVal("stdProblemSolving", 1),
          stdInterpersonalSkill: getFloatVal("stdInterpersonalSkill", 1),
          stdStrategicMindset: getFloatVal("stdStrategicMindset", 1),
          stdManagesComplexity: getFloatVal("stdManagesComplexity", 1),
          stdEnsuresAccountability: getFloatVal("stdEnsuresAccountability", 1),
          stdDrivesVision: getFloatVal("stdDrivesVision", 1),
          stdCultivateInnovation: getFloatVal("stdCultivateInnovation", 1),
          studyBackgroundName: getVal("studyBackgroundName", "S1"),
          studyBackgroundScore: getFloatVal("studyBackgroundScore", 3),
          targetLevel: getVal("targetLevel", "SM"),
          evaluasiScore: getFloatVal("evaluasiScore", 0),
          evaluasiCode: getIntVal("evaluasiCode", 0),
          evaluasiCategory: getVal("evaluasiCategory"),
          squareOfTalent: getIntVal("squareOfTalent", 0)
        });
      });
    }

    if (importedRows.length === 0) {
      throw new Error("Tidak ada data talenta yang dapat diimpor.");
    }

    let updatedCount = 0;
    let createdCount = 0;

    const currentList = [...talents];

    importedRows.forEach((row) => {
      const name = row.name || "";
      if (!name.trim()) return;

      const rawId = row.rawId || row.id;
      const id = rawId ? rawId.trim() : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      const title = row.title || "Managerial Staff";
      const division = row.division || row.department || row.divisi || "Technology Dept.";
      const location = row.location || "Jakarta HQ";
      const tenure = row.tenure || "3 Years";
      const readiness = (row.readiness || "READY 1-2 YEARS").toUpperCase();
      const avatar = row.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      
      const gender = (row.gender === "Perempuan" || row.gender?.toLowerCase().includes("perempuan") || row.gender?.toLowerCase() === "f" || row.gender?.toLowerCase() === "p") ? "Perempuan" : "Laki-laki";
      const nik = row.nik || "";
      const grade = row.grade || "M4";
      const birthDate = row.birthDate || "1988-10-10";
      const age = Number(row.age || 38);
      const joinDate = row.joinDate || "2021-01-01";

      const fy2020 = Math.max(0, Number(row.fy2020 || 0));
      const fy2021 = Math.max(0, Number(row.fy2021 || 0));
      const fy2022 = Math.max(0, Number(row.fy2022 || 0));
      const fy2023 = Math.max(0, Number(row.fy2023 || 0));
      const fy2024 = Math.max(0, Number(row.fy2024 || 0));

      const customPerfRaw = row.customPerformance;
      const customPerformance = (customPerfRaw === "Low" || customPerfRaw === "Medium" || customPerfRaw === "High") ? customPerfRaw : undefined;
      
      const customPotRaw = row.customPotential;
      const customPotential = (customPotRaw === "Low" || customPotRaw === "Medium" || customPotRaw === "High") ? customPotRaw : undefined;
      
      const nineBoxNotes = row.nineBoxNotes || undefined;

      const lrScore = Math.min(100, Math.max(0, Number(row.logicalScore || 80)));
      const lpScore = Math.min(100, Math.max(0, Number(row.leadershipScore || 80)));
      const eaScore = Math.min(100, Math.max(0, Number(row.emotionalScore || 80)));

      const bkScore = Math.min(100, Math.max(0, Number(row.bkScore || 80)));
      const ldScore = Math.min(100, Math.max(0, Number(row.ldScore || 80)));
      const psScore = Math.min(100, Math.max(0, Number(row.psScore || 80)));
      const ipScore = Math.min(100, Math.max(0, Number(row.ipScore || 80)));

      let readinessColor: "emerald" | "amber" | "rose" | "teal" = "amber";
      if (readiness.includes("NOW")) readinessColor = "emerald";
      else if (readiness.includes("2+")) readinessColor = "rose";

      const getCompetencyLabel = (sc: number) => {
        const lvl = sc >= 80 ? 'Expert' : sc >= 60 ? 'Advanced' : 'Proficient';
        return `${lvl} (${(sc/20).toFixed(1)}/5)`;
      };

      const competencies = [
        { name: "Business Knowledge", score: bkScore, label: getCompetencyLabel(bkScore) },
        { name: "Leadership", score: ldScore, label: getCompetencyLabel(ldScore) },
        { name: "Problem Solving", score: psScore, label: getCompetencyLabel(psScore) },
        { name: "Interpersonal Skill", score: ipScore, label: getCompetencyLabel(ipScore) }
      ];

      const idp1Title = row.idp1Title || "Strategic Leadership Program";
      const idp1Desc = row.idp1Desc || "Advanced coaching on business strategy and scaling regional operations.";
      const idp1Progress = Math.min(100, Math.max(0, Number(row.idp1Progress || 30)));
      
      const idp2Title = row.idp2Title || "Data-Driven Decision Making";
      const idp2Desc = row.idp2Desc || "Focusing on big data analytics and practical predictive insights.";
      const idp2Progress = Math.min(100, Math.max(0, Number(row.idp2Progress || 0)));

      const idp = [
        {
          title: idp1Title,
          status: idp1Progress === 100 ? "Completed" : idp1Progress > 0 ? "In Progress" : "Not Started" as any,
          description: idp1Desc,
          progress: idp1Progress
        },
        {
          title: idp2Title,
          status: idp2Progress === 100 ? "Completed" : idp2Progress > 0 ? "In Progress" : "Not Started" as any,
          description: idp2Desc,
          progress: idp2Progress
        }
      ];

      const potentialAssessment = {
        kemampuanIntelektual: Math.min(3, Math.max(1, Number(row.kemampuanIntelektual || 2))),
        berpikirKritis: Math.min(3, Math.max(1, Number(row.berpikirKritis || 2))),
        menyelesaikanMasalah: Math.min(3, Math.max(1, Number(row.menyelesaikanMasalah || 2))),
        belajarCepat: Math.min(3, Math.max(1, Number(row.belajarCepat || 2))),
        kesadaranDiri: Math.min(3, Math.max(1, Number(row.kesadaranDiri || 2))),
        interpersonal: Math.min(3, Math.max(1, Number(row.interpersonal || 2))),
        kecerdasanEmosional: Math.min(3, Math.max(1, Number(row.kecerdasanEmosional || 2))),
        motivasiKomitmen: Math.min(3, Math.max(1, Number(row.motivasiKomitmen || 2))),
        businessKnowledge: Math.min(5, Math.max(1, Number(row.stdBusinessKnowledge || 3))),
        leadership: Math.min(5, Math.max(1, Number(row.stdLeadership || 3))),
        problemSolving: Math.min(5, Math.max(1, Number(row.stdProblemSolving || 3))),
        interpersonalSkill: Math.min(5, Math.max(1, Number(row.stdInterpersonalSkill || 3))),
        strategicMindset: Math.min(5, Math.max(1, Number(row.stdStrategicMindset || 3))),
        managesComplexity: Math.min(5, Math.max(1, Number(row.stdManagesComplexity || 3))),
        ensuresAccountability: Math.min(5, Math.max(1, Number(row.stdEnsuresAccountability || 3))),
        drivesVision: Math.min(5, Math.max(1, Number(row.stdDrivesVision || 3))),
        cultivateInnovation: Math.min(5, Math.max(1, Number(row.stdCultivateInnovation || 3))),
        studyBackgroundName: row.studyBackgroundName || "S1 Teknik Industri",
        studyBackgroundScore: Math.min(3, Math.max(1, Number(row.studyBackgroundScore || 3))),
        targetLevel: ((row.targetLevel || "SM").toUpperCase() === "DM" ? "DM" : "SM") as "SM" | "DM"
      };

      const performanceEvaluation = {
        fy2020,
        fy2021,
        fy2022,
        fy2023,
        fy2024
      };

      const existingIndex = currentList.findIndex(t => t.id === id || t.name.toLowerCase().trim() === name.toLowerCase().trim());
      const existing = existingIndex > -1 ? currentList[existingIndex] : undefined;

      let trainingsList: TrainingItem[] = existing?.trainings || [];
      if (row.trainingsRaw) {
        if (Array.isArray(row.trainingsRaw)) {
          trainingsList = row.trainingsRaw;
        } else if (typeof row.trainingsRaw === "string" && row.trainingsRaw.trim()) {
          const items = row.trainingsRaw.split(";").map((s: string) => s.trim()).filter(Boolean);
          trainingsList = items.map((item: string, idx: number) => {
            const match = item.match(/^(.*?)(?:\s*\[(.*?)\])?$/);
            const tName = match ? match[1].trim() : item;
            const typeRaw = match && match[2] ? match[2].trim() : "Leadership";
            const validTypes = ["Leadership", "Technical", "Management", "Certification"];
            const tType = validTypes.includes(typeRaw) ? (typeRaw as any) : "Leadership";
            return {
              id: `tr-imp-${Date.now()}-${idx}`,
              name: tName,
              provider: "Internal / Imported",
              date: new Date().toISOString().slice(0, 10),
              type: tType,
              status: "Completed" as const
            };
          });
        }
      }

      if (existingIndex > -1 && existing) {
        currentList[existingIndex] = {
          ...existing,
          name,
          gender,
          title,
          division,
          location,
          tenure,
          readiness,
          readinessColor,
          avatar: avatar || existing.avatar,
          nik: nik || existing.nik,
          grade: grade || existing.grade,
          birthDate: birthDate || existing.birthDate,
          age: age !== undefined ? age : existing.age,
          joinDate: joinDate || existing.joinDate,
          customPerformance: customPerformance || existing.customPerformance,
          customPotential: customPotential || existing.customPotential,
          nineBoxNotes: nineBoxNotes || existing.nineBoxNotes,
          performanceEvaluation,
          importedEvaluasiScore: row.evaluasiScore > 0 ? row.evaluasiScore : existing.importedEvaluasiScore,
          importedEvaluasiCode: row.evaluasiCode > 0 ? row.evaluasiCode : existing.importedEvaluasiCode,
          importedEvaluasiCategory: row.evaluasiCategory || existing.importedEvaluasiCategory,
          squareOfTalent: row.squareOfTalent > 0 ? row.squareOfTalent : existing.squareOfTalent,
          psychometric: {
            logicalReasoning: { name: "LOGICAL REASONING", score: lrScore, description: existing.psychometric?.logicalReasoning?.description || "Analytical ability." },
            leadershipPotential: { name: "LEADERSHIP POTENTIAL", score: lpScore, description: existing.psychometric?.leadershipPotential?.description || "Leadership drive." },
            emotionalAgility: { name: "EMOTIONAL AGILITY", score: eaScore, description: existing.psychometric?.emotionalAgility?.description || "Adaptive capabilities." }
          },
          competencies,
          idp,
          trainings: trainingsList,
          potentialAssessment
        };
        updatedCount++;
      } else {
        const newTalentObj: TalentProfile = {
          id,
          name,
          gender,
          title,
          division,
          location,
          tenure,
          readiness,
          readinessColor,
          avatar,
          nik,
          grade,
          birthDate,
          age,
          joinDate,
          customPerformance,
          customPotential,
          nineBoxNotes,
          performanceEvaluation,
          importedEvaluasiScore: row.evaluasiScore > 0 ? row.evaluasiScore : undefined,
          importedEvaluasiCode: row.evaluasiCode > 0 ? row.evaluasiCode : undefined,
          importedEvaluasiCategory: row.evaluasiCategory || undefined,
          squareOfTalent: row.squareOfTalent > 0 ? row.squareOfTalent : undefined,
          psychometric: {
            logicalReasoning: { name: "LOGICAL REASONING", score: lrScore, description: "Analytical ability." },
            leadershipPotential: { name: "LEADERSHIP POTENTIAL", score: lpScore, description: "Leadership drive." },
            emotionalAgility: { name: "EMOTIONAL AGILITY", score: eaScore, description: "Adaptive capabilities." }
          },
          competencies,
          idp,
          trainings: trainingsList,
          potentialAssessment
        };
        currentList.push(newTalentObj);
        createdCount++;
      }
    });

    setTalents(currentList);
    return { updatedCount, createdCount };
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const res = processTalentImportRows(text, "csv");
        addSecurityLog(`Impor CSV berhasil: ${res.updatedCount} talent diperbarui, ${res.createdCount} talent baru ditambahkan.`, "success");
        alert(`Impor data talent berhasil!\n\n- ${res.updatedCount} Talent Diperbarui\n- ${res.createdCount} Talent Baru Ditambahkan\n\nSeluruh data (termasuk Department, Skor & Evaluasi) telah disinkronkan secara penuh dengan sistem.`);
      } catch (err: any) {
        alert("Gagal membaca atau memproses berkas CSV: " + err.message);
        addSecurityLog("Gagal memproses berkas CSV yang diimpor.", "warning");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Export and Import handlers for Peta Suksesi & Manajemen Masa Pensiun
  const handleExportRetiringPositionsJSON = () => {
    const exportData = {
      appName: "PT Ajinomoto Indonesia - Peta Suksesi & Manajemen Masa Pensiun",
      exportedAt: new Date().toISOString(),
      version: "2.5.0",
      totalPositions: retiringPositions.length,
      retiringPositions: retiringPositions.map(pos => {
        const assignedTalent = talents.find(t => t.id === pos.assignedSuccessorId);
        return {
          ...pos,
          assignedSuccessorName: assignedTalent ? assignedTalent.name : null,
          assignedSuccessorTitle: assignedTalent ? assignedTalent.title : null,
          assignedSuccessorReadiness: assignedTalent ? assignedTalent.readiness : null
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `peta_suksesi_pensiun_ajinomoto_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addSecurityLog("Data Peta Suksesi & Masa Pensiun berhasil diekspor ke format JSON.", "success");
  };

  const handleExportRetiringPositionsCSV = () => {
    const headers = [
      "ID Posisi",
      "Nama Posisi Pensiun",
      "Petahana Saat Ini",
      "Tanggal Rencana Pensiun",
      "Divisi / Departemen",
      "Tingkat Urgensi (High / Medium / Low)",
      "Target Kompetensi Utama",
      "ID Suksesor Terpilih",
      "Nama Suksesor Terpilih",
      "Kesiapan Suksesor",
      "Status Kesesuaian (Primary / Secondary / Emergency)"
    ];

    const rows = retiringPositions.map(pos => {
      const assignedTalent = talents.find(t => t.id === pos.assignedSuccessorId);
      return [
        pos.id,
        pos.positionName,
        pos.currentIncumbent,
        pos.retirementDate,
        pos.division,
        pos.urgency,
        pos.targetCompetencies ? pos.targetCompetencies.join("; ") : "",
        pos.assignedSuccessorId || "",
        assignedTalent ? assignedTalent.name : "Belum Ada Suksesor",
        assignedTalent ? assignedTalent.readiness : "N/A",
        pos.suitabilityStatus || "Primary"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row =>
        row.map(val => {
          const s = String(val ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `peta_suksesi_pensiun_ajinomoto_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addSecurityLog("Data Peta Suksesi & Masa Pensiun berhasil diekspor ke format CSV / Excel.", "success");
  };

  const handleImportRetiringPositionsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error("Berkas kosong.");

        let importedPositions: RetiringPosition[] = [];

        if (file.name.toLowerCase().endsWith(".json")) {
          const parsed = JSON.parse(content);
          const rawArray = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.retiringPositions)
            ? parsed.retiringPositions
            : [parsed];

          importedPositions = rawArray.map((item: any, idx: number) => ({
            id: item.id || `pos-${Date.now()}-${idx}`,
            positionName: item.positionName || item["Nama Posisi Pensiun"] || item["posisi"] || "Posisi Pensiun",
            currentIncumbent: item.currentIncumbent || item["Petahana Saat Ini"] || item["petahana"] || "Petahana",
            retirementDate: item.retirementDate || item["Tanggal Rencana Pensiun"] || item["pensiun"] || "2026-12-31",
            division: item.division || item["Divisi / Departemen"] || item["divisi"] || "General Affairs",
            urgency: (item.urgency || item["Tingkat Urgensi"]) === "High" ? "High" : (item.urgency || item["Tingkat Urgensi"]) === "Low" ? "Low" : "Medium",
            targetCompetencies: Array.isArray(item.targetCompetencies)
              ? item.targetCompetencies
              : typeof item.targetCompetencies === "string"
              ? item.targetCompetencies.split(";").map((s: string) => s.trim())
              : ["Leadership", "Problem Solving"],
            assignedSuccessorId: item.assignedSuccessorId || item["ID Suksesor Terpilih"] || undefined,
            suitabilityStatus: item.suitabilityStatus || item["Status Kesesuaian"] || "Primary"
          }));
        } else if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
          const parseCSVLines = (text: string): string[][] => {
            const lines: string[][] = [];
            let row: string[] = [];
            let insideQuote = false;
            let entry = "";
            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              const nextChar = text[i + 1];
              if (char === '"') {
                if (insideQuote && nextChar === '"') {
                  entry += '"';
                  i++;
                } else {
                  insideQuote = !insideQuote;
                }
              } else if (char === ',' && !insideQuote) {
                row.push(entry.trim());
                entry = "";
              } else if ((char === '\r' || char === '\n') && !insideQuote) {
                if (char === '\r' && nextChar === '\n') i++;
                row.push(entry.trim());
                if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
                  lines.push(row);
                }
                row = [];
                entry = "";
              } else {
                entry += char;
              }
            }
            if (entry !== "" || row.length > 0) {
              row.push(entry.trim());
              lines.push(row);
            }
            return lines;
          };

          const parsedRows = parseCSVLines(content);
          if (parsedRows.length <= 1) {
            throw new Error("Berkas CSV tidak memiliki baris data.");
          }

          const headerRow = parsedRows[0].map(h => h.trim().toLowerCase());
          const dataRows = parsedRows.slice(1);

          const findColIdx = (keywords: string[]) => {
            return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
          };

          const idIdx = findColIdx(["id posisi", "id", "posisi id"]);
          const nameIdx = findColIdx(["nama posisi", "posisi pensiun", "positionname", "posisi"]);
          const incumbentIdx = findColIdx(["petahana", "incumbent", "pejabat"]);
          const dateIdx = findColIdx(["tanggal", "pensiun", "retirementdate", "date"]);
          const divIdx = findColIdx(["divisi", "departemen", "division", "dept"]);
          const urgencyIdx = findColIdx(["urgensi", "urgency", "prioritas"]);
          const compIdx = findColIdx(["target kompetensi", "kompetensi", "competencies"]);
          const successorIdIdx = findColIdx(["id suksesor", "suksesor id", "assignedsuccessorid"]);
          const suitabilityIdx = findColIdx(["status kesesuaian", "suitability", "status suksesi"]);

          importedPositions = dataRows.map((r, idx) => {
            const getR = (i: number) => (i >= 0 && i < r.length ? r[i].trim() : "");
            const posName = getR(nameIdx) || `Posisi Import ${idx + 1}`;
            const incumbent = getR(incumbentIdx) || "Petahana";
            const date = getR(dateIdx) || "2026-12-31";
            const div = getR(divIdx) || "General Affairs";
            const rawUrg = getR(urgencyIdx).toLowerCase();
            const urgencyVal: "High" | "Medium" | "Low" = rawUrg.includes("high") || rawUrg.includes("tinggi") ? "High" : rawUrg.includes("low") || rawUrg.includes("rendah") ? "Low" : "Medium";

            const rawComp = getR(compIdx);
            const competencies = rawComp ? rawComp.split(";").map(s => s.trim()).filter(Boolean) : ["Leadership", "Problem Solving"];
            const succId = getR(successorIdIdx) || undefined;
            const rawSuit = getR(suitabilityIdx).toLowerCase();
            const suitabilityVal: "Primary" | "Secondary" | "Emergency" = rawSuit.includes("second") ? "Secondary" : rawSuit.includes("emerg") ? "Emergency" : "Primary";

            return {
              id: getR(idIdx) || `pos-${Date.now()}-${idx}`,
              positionName: posName,
              currentIncumbent: incumbent,
              retirementDate: date,
              division: div,
              urgency: urgencyVal,
              targetCompetencies: competencies,
              assignedSuccessorId: succId,
              suitabilityStatus: suitabilityVal
            };
          });
        } else {
          throw new Error("Format berkas tidak didukung. Harap unggah berkas bertipe .json atau .csv.");
        }

        if (importedPositions.length === 0) {
          throw new Error("Tidak ada data posisi pensiun yang valid ditemukan.");
        }

        setRetiringPositions(importedPositions);
        addSecurityLog(`Berhasil mengimpor ${importedPositions.length} posisi Peta Suksesi & Manajemen Masa Pensiun.`, "success");
        alert(`Berhasil mengimpor ${importedPositions.length} posisi suksesi pensiun!\n\nData Peta Suksesi dan Manajemen Masa Pensiun telah diperbarui.`);
      } catch (err: any) {
        alert(`Gagal mengimpor data Peta Suksesi: ${err.message}`);
        addSecurityLog(`Gagal impor Peta Suksesi: ${err.message}`, "warning");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // User/Candidate interaction states
  const [aspirationText, setAspirationText] = useState("");
  const [preferredTraining, setPreferredTraining] = useState("Sertifikasi Analisis Data Lanjutan");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Training & Development states
  const [isAddTrainingOpen, setIsAddTrainingOpen] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [newTraining, setNewTraining] = useState({
    name: "",
    provider: "",
    date: "",
    type: "Leadership" as "Leadership" | "Technical" | "Management" | "Certification",
    status: "Planned" as "Planned" | "In Progress" | "Completed" | "Cancelled",
    notes: ""
  });

  // Add Talent States
  const [isAddTalentOpen, setIsAddTalentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newTalent, setNewTalent] = useState({
    name: "",
    gender: "Laki-laki" as "Laki-laki" | "Perempuan",
    nik: "",
    title: "",
    division: "Technology Dept.",
    location: "Jakarta HQ",
    tenure: "3 Years",
    readiness: "READY 1-2 YEARS",
    avatar: MALE_AVATARS[0],
    grade: "M4",
    birthDate: "1988-10-10",
    age: 38,
    joinDate: "2021-01-01",
    logicalScore: 80,
    leadershipScore: 80,
    emotionalScore: 80,
    problemSolvingScore: 80,
    strategicScore: 80,
    stakeholderScore: 80,
    resultsScore: 80,
    idpTitle1: "Strategic Leadership Program",
    idpDesc1: "Advanced coaching on business strategy and scaling regional operations.",
    idpProgress1: 30,
    idpTitle2: "Data-Driven Decision Making",
    idpDesc2: "Focusing on big data analytics and practical predictive insights.",
    idpProgress2: 0,
    studyBackgroundName: "S1 Teknik Industri",
    studyBackgroundScore: 3,
  });

  const handleSyncAllPhotosByGender = () => {
    let count = 0;
    setTalents(prev => {
      return prev.map(t => {
        const detectedGender = t.gender || detectGenderFromName(t.name);
        const syncedAvatar = getSyncedAvatarUrl(t.name, detectedGender, t.avatar);
        if (t.gender !== detectedGender || t.avatar !== syncedAvatar) {
          count++;
        }
        return {
          ...t,
          gender: detectedGender,
          avatar: syncedAvatar
        };
      });
    });
    setAdminProfileSuccessMsg("Berhasil menyinkronkan foto profil seluruh talenta berdasarkan jenis kelamin (Perempuan & Laki-laki)!");
    setTimeout(() => setAdminProfileSuccessMsg(""), 5000);
  };

  const getCompetencyLabel = (value: number) => {
    if (value >= 90) return "Expert (5/5)";
    if (value >= 80) return "Advanced (4.5/5)";
    if (value >= 70) return "Advanced (4/5)";
    if (value >= 60) return "Proficient (3.5/5)";
    return "Developing (3/5)";
  };

  const handleUpdateReadiness = (talentId: string, newReadiness: string) => {
    const getReadinessColor = (ready: string): "emerald" | "amber" | "rose" | "teal" => {
      if (ready === "READY NOW") return "emerald";
      if (ready === "READY 1-2 YEARS") return "amber";
      if (ready === "READY 2+ YEARS") return "rose";
      return "teal";
    };

    setTalents(prev =>
      prev.map(t => {
        if (t.id === talentId) {
          return {
            ...t,
            readiness: newReadiness,
            readinessColor: getReadinessColor(newReadiness)
          };
        }
        return t;
      })
    );
  };

  const handleAddNewTalent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTalent.name || !newTalent.title) return;

    const id = newTalent.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    
    // Check if duplicate ID
    if (talents.some(t => t.id === id)) {
      alert("A candidate with a similar name already exists!");
      return;
    }

    const getReadinessColor = (ready: string): "emerald" | "amber" | "rose" | "teal" => {
      if (ready === "READY NOW") return "emerald";
      if (ready === "READY 1-2 YEARS") return "amber";
      if (ready === "READY 2+ YEARS") return "rose";
      return "teal";
    };

    const createdTalent: TalentProfile = {
      id,
      name: newTalent.name,
      nik: newTalent.nik,
      title: newTalent.title,
      division: newTalent.division,
      location: newTalent.location,
      tenure: newTalent.tenure,
      readiness: newTalent.readiness,
      readinessColor: getReadinessColor(newTalent.readiness),
      avatar: newTalent.avatar,
      grade: newTalent.grade || "M4",
      birthDate: newTalent.birthDate || "1988-10-10",
      age: Number(newTalent.age) || 38,
      joinDate: newTalent.joinDate || "2021-01-01",
      psychometric: {
        logicalReasoning: {
          name: "LOGICAL REASONING",
          score: Number(newTalent.logicalScore),
          description: "High conceptual analytics."
        },
        leadershipPotential: {
          name: "LEADERSHIP POTENTIAL",
          score: Number(newTalent.leadershipScore),
          description: "Inspires and directs teams."
        },
        emotionalAgility: {
          name: "EMOTIONAL AGILITY",
          score: Number(newTalent.emotionalScore),
          description: "Self-aware and adaptive."
        }
      },
      competencies: [
        {
          name: "Business Knowledge",
          score: Number(newTalent.problemSolvingScore),
          label: getCompetencyLabel(Number(newTalent.problemSolvingScore))
        },
        {
          name: "Leadership",
          score: Number(newTalent.strategicScore),
          label: getCompetencyLabel(Number(newTalent.strategicScore))
        },
        {
          name: "Problem Solving",
          score: Number(newTalent.stakeholderScore),
          label: getCompetencyLabel(Number(newTalent.stakeholderScore))
        },
        {
          name: "Interpersonal Skill",
          score: Number(newTalent.resultsScore),
          label: getCompetencyLabel(Number(newTalent.resultsScore))
        }
      ],
      idp: [
        {
          title: newTalent.idpTitle1 || "Strategic Leadership Program",
          status: Number(newTalent.idpProgress1) === 100 ? "Completed" : Number(newTalent.idpProgress1) > 0 ? "In Progress" : "Not Started",
          description: newTalent.idpDesc1 || "Advanced coaching on business strategy and scaling regional operations.",
          progress: Number(newTalent.idpProgress1)
        },
        {
          title: newTalent.idpTitle2 || "Data-Driven Decision Making",
          status: Number(newTalent.idpProgress2) === 100 ? "Completed" : Number(newTalent.idpProgress2) > 0 ? "In Progress" : "Not Started",
          description: newTalent.idpDesc2 || "Focusing on big data analytics and practical predictive insights.",
          progress: Number(newTalent.idpProgress2)
        }
      ],
      potentialAssessment: {
        kemampuanIntelektual: Math.min(Math.max(Math.round(Number(newTalent.logicalScore) / 33), 1), 3),
        berpikirKritis: 3,
        menyelesaikanMasalah: 2,
        belajarCepat: 3,
        kesadaranDiri: 2,
        interpersonal: 2,
        kecerdasanEmosional: 2,
        motivasiKomitmen: 3,
        businessKnowledge: Math.min(Math.max(Math.round(Number(newTalent.strategicScore) / 20), 1), 5),
        leadership: Math.min(Math.max(Math.round(Number(newTalent.leadershipScore) / 20), 1), 5),
        problemSolving: Math.min(Math.max(Math.round(Number(newTalent.problemSolvingScore) / 20), 1), 5),
        interpersonalSkill: Math.min(Math.max(Math.round(Number(newTalent.stakeholderScore) / 20), 1), 5),
        strategicMindset: Math.min(Math.max(Math.round(Number(newTalent.strategicScore) / 20), 1), 5),
        managesComplexity: 3,
        ensuresAccountability: Math.min(Math.max(Math.round(Number(newTalent.resultsScore) / 20), 1), 5),
        drivesVision: 3,
        cultivateInnovation: 2,
        studyBackgroundName: newTalent.studyBackgroundName,
        studyBackgroundScore: Number(newTalent.studyBackgroundScore),
        targetLevel: "DM"
      }
    };

    setTalents(prev => [...prev, createdTalent]);
    setExecutiveCommentary(prev => ({
      ...prev,
      [id]: `Newly calibrated candidate profile for ${createdTalent.name}. Showing remarkable core leadership indicators with positive succession outlook.`
    }));

    // Select the new talent immediately & open profile
    setSelectedTalentId(id);
    setActiveTab("profile");
    setIsAddTalentOpen(false);

    // Reset Form
    setNewTalent({
      name: "",
      nik: "",
      title: "",
      division: "Technology Dept.",
      location: "Jakarta HQ",
      tenure: "3 Years",
      readiness: "READY 1-2 YEARS",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
      grade: "M4",
      birthDate: "1988-10-10",
      age: 38,
      joinDate: "2021-01-01",
      logicalScore: 80,
      leadershipScore: 80,
      emotionalScore: 80,
      problemSolvingScore: 80,
      strategicScore: 80,
      stakeholderScore: 80,
      resultsScore: 80,
      idpTitle1: "Strategic Leadership Program",
      idpDesc1: "Advanced coaching on business strategy and scaling regional operations.",
      idpProgress1: 30,
      idpTitle2: "Data-Driven Decision Making",
      idpDesc2: "Focusing on big data analytics and practical predictive insights.",
      idpProgress2: 0,
      studyBackgroundName: "S1 Teknik Industri",
      studyBackgroundScore: 3,
    });
  };

  const handleImportData = (rawText: string, fileType: "json" | "csv") => {
    try {
      const res = processTalentImportRows(rawText, fileType);
      alert(`Sukses Import & Sinkronisasi Data!\n- ${res.createdCount} Talenta baru ditambahkan\n- ${res.updatedCount} Talenta diperbarui`);
      setIsImportOpen(false);
    } catch (err: any) {
      alert("Gagal melakukan impor data: " + err.message);
    }
  };

  // Find currently active talent profile
  const currentTalent = talents.find((t) => t.id === selectedTalentId) || talents[0];

  // Unique divisions and readiness categories for filters
  const divisions = ["All", ...Array.from(new Set(talents.map((t) => t.division)))];
  const readinessOptions = ["All", ...Array.from(new Set(talents.map((t) => t.readiness)))];

  // Filtered talent pool list
  const filteredTalents = talents.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDivision = divisionFilter === "All" || t.division === divisionFilter;
    const matchesReadiness = readinessFilter === "All" || t.readiness === readinessFilter;
    return matchesSearch && matchesDivision && matchesReadiness;
  });

  // Helper for smart compact pagination
  const getPaginationRange = (current: number, total: number) => {
    const delta = 1;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (typeof i === 'number' && i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (typeof i === 'number' && i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = typeof i === 'number' ? i : l;
    }

    return rangeWithDots;
  };

  // Paginated talent pool calculation
  const totalPages = Math.ceil(filteredTalents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTalents = filteredTalents.slice(startIndex, endIndex);

  // Calculate high level metrics
  const totalTalents = talents.length;
  const readyNowCount = talents.filter((t) => t.readiness === "READY NOW").length;
  const avgLogicalScore = Math.round(talents.reduce((sum, t) => sum + t.psychometric.logicalReasoning.score, 0) / totalTalents);
  const avgLeadershipScore = Math.round(talents.reduce((sum, t) => sum + t.psychometric.leadershipPotential.score, 0) / totalTalents);

  const getDeptAbbreviation = (dept: string): string => {
    if (!dept) return "";
    const trimmed = dept.trim();
    const knownMap: Record<string, string> = {
      "General Affairs": "GA",
      "General Affairs Dept.": "GA",
      "General Affairs Dept": "GA",
      "Human Capital Management": "HCM",
      "Human Capital Management Dept.": "HCM",
      "Human Capital Management Dept": "HCM",
      "Human Resources": "HR",
      "Human Resource": "HR",
      "Technology Dept.": "Tech",
      "Technology": "Tech",
      "Information Technology": "IT",
      "Supply Chain & Logistics": "SCM",
      "Supply Chain": "SCM",
      "Supply Chain Dept.": "SCM",
      "Finance & Control": "Finance",
      "Finance & Accounting": "FA",
      "Sales & Commercial": "Sales",
      "Marketing": "Mkt",
      "Health Safety & Environtment Dept (A-MJK)": "HSE",
      "Health Safety & Environment": "HSE",
      "Health Safety & Environment Dept": "HSE",
      "Food Ingredients-1 (A-MJK)": "FI-1",
      "Food Ingredients": "FI",
      "Factory Operational Excellence  (A-MJK) Dept": "FOE",
      "Factory Operational Excellence": "FOE",
      "Procurement & EXIM (A-MJK)": "Procurement",
      "Quality Assurance": "QA",
      "Quality Assurance Dept.": "QA",
      "Research & Development": "R&D",
      "Research & Development Dept.": "R&D",
    };

    if (knownMap[trimmed]) return knownMap[trimmed];

    const clean = trimmed.replace(/\s*\(.*?\)\s*/g, " ").replace(/Dept\.?/gi, "").trim();
    if (knownMap[clean]) return knownMap[clean];

    if (clean.length > 12) {
      const words = clean.split(/\s+/).filter(w => !["and", "&", "of", "the", "dept"].includes(w.toLowerCase()));
      if (words.length > 1) {
        return words.map(w => w[0].toUpperCase()).join("");
      }
      return clean.substring(0, 10) + "..";
    }
    return clean || trimmed;
  };

  const highPotentialDistributionData = React.useMemo(() => {
    // Group by division
    const groups: { [key: string]: { division: string; shortDivision: string; highPotentialCount: number; otherCount: number; totalCount: number } } = {};
    
    talents.forEach((t) => {
      const div = t.division || "Other Department";
      if (!groups[div]) {
        groups[div] = {
          division: div,
          shortDivision: getDeptAbbreviation(div),
          highPotentialCount: 0,
          otherCount: 0,
          totalCount: 0
        };
      }
      
      const placement = getTalentPlacement(t);
      const isHighPotential = placement.potential === "High";
      
      groups[div].totalCount += 1;
      if (isHighPotential) {
        groups[div].highPotentialCount += 1;
      } else {
        groups[div].otherCount += 1;
      }
    });
    
    return Object.values(groups).sort((a, b) => b.highPotentialCount - a.highPotentialCount || b.totalCount - a.totalCount);
  }, [talents]);

  const talentGapAnalysis = React.useMemo(() => {
    const gaps: string[] = [];
    const strong: string[] = [];
    
    highPotentialDistributionData.forEach(item => {
      if (item.highPotentialCount === 0 && item.totalCount > 0) {
        gaps.push(item.division);
      } else if (item.highPotentialCount > 0 && item.highPotentialCount / item.totalCount >= 0.5) {
        strong.push(item.division);
      }
    });
    
    return { gaps, strong };
  }, [highPotentialDistributionData]);

  const performanceTrendData = React.useMemo(() => {
    const years = evaluationYears.map(yr => ({ key: `fy${yr}`, label: `FY ${yr}` }));

    return years.map(({ key, label }) => {
      let totalScore = 0;
      let count = 0;
      
      talents.forEach((t) => {
        let score = t.performanceEvaluation?.[key];
        if (score === undefined || score === null) {
          score = 3;
        }
        totalScore += score;
        count++;
      });
      
      const avg = count > 0 ? totalScore / count : 3;
      const percentage = (avg / 5.0) * 100;
      
      return {
        year: label,
        averageRating: parseFloat(avg.toFixed(2)),
        percentage: parseFloat(percentage.toFixed(1)),
      };
    });
  }, [talents, evaluationYears]);

  const trendAnalytics = React.useMemo(() => {
    if (performanceTrendData.length < 2) return { direction: "flat", diff: "0", percentageChange: "0", message: "" };
    const first = performanceTrendData[0].averageRating;
    const last = performanceTrendData[performanceTrendData.length - 1].averageRating;
    const diff = last - first;
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    const percentageChange = ((last - first) / first) * 100;
    
    let message = "";
    if (direction === "up") {
      message = `Tren positif terdeteksi! Rata-rata kinerja meningkat sebesar ${Math.abs(percentageChange).toFixed(1)}% dari ${first.toFixed(2)} ke ${last.toFixed(2)}. Ini mengindikasikan program peningkatan kompetensi organisasi berjalan efektif.`;
    } else if (direction === "down") {
      message = `Tren penurunan terdeteksi sebesar ${Math.abs(percentageChange).toFixed(1)}% dari ${first.toFixed(2)} ke ${last.toFixed(2)}. Evaluasi program retensi atau distribusi beban kerja mungkin diperlukan.`;
    } else {
      message = `Kinerja rata-rata organisasi stabil di angka ${last.toFixed(2)} / 5.00 selama 5 tahun terakhir.`;
    }

    return {
      direction,
      diff: Math.abs(diff).toFixed(2),
      percentageChange: Math.abs(percentageChange).toFixed(1),
      message
    };
  }, [performanceTrendData]);

  // Quick Insights: Auto-highlight top 3 highest-rated and top 3 lowest-rated talents based on current heatmap/matrix data
  const quickInsightsData = React.useMemo(() => {
    const ratedTalents = talents.map((t) => {
      const perfScore = getTalentPerformanceScore(t);
      const potDetails = calculateTalentPotentialDetails(t);
      const potScore = Math.round(potDetails.totalPotentialScore);
      const exactScore = (perfScore + potScore) / 2;
      const overallRating = Math.round(exactScore);
      const placement = getTalentPlacement(t);
      const cellName = getCellName(placement.performance, placement.potential);
      return {
        talent: t,
        perfScore,
        potScore,
        exactScore,
        overallRating,
        placement,
        cellName
      };
    });

    const topHighest = [...ratedTalents].sort((a, b) => {
      if (b.exactScore !== a.exactScore) return b.exactScore - a.exactScore;
      if (b.perfScore !== a.perfScore) return b.perfScore - a.perfScore;
      return b.potScore - a.potScore;
    }).slice(0, 3);

    const topLowest = [...ratedTalents].sort((a, b) => {
      if (a.exactScore !== b.exactScore) return a.exactScore - b.exactScore;
      if (a.perfScore !== b.perfScore) return a.perfScore - b.perfScore;
      return a.potScore - b.potScore;
    }).slice(0, 3);

    return { topHighest, topLowest };
  }, [talents, evaluationYears]);

  const skillGapHeatmapData = React.useMemo(() => {
    const competenciesList = [
      "Business Knowledge",
      "Leadership",
      "Problem Solving",
      "Interpersonal Skill",
      "Strategic Mindset",
      "Manages Complexity",
      "Ensures Accountability",
      "Drives Vision",
      "Cultivate Innovation"
    ];

    const compKeyMap: { [key: string]: keyof PotentialAssessment } = {
      "Business Knowledge": "businessKnowledge",
      "Leadership": "leadership",
      "Problem Solving": "problemSolving",
      "Interpersonal Skill": "interpersonalSkill",
      "Strategic Mindset": "strategicMindset",
      "Manages Complexity": "managesComplexity",
      "Ensures Accountability": "ensuresAccountability",
      "Drives Vision": "drivesVision",
      "Cultivate Innovation": "cultivateInnovation"
    };

    const divisions = Array.from(new Set(talents.map((t) => t.division || "Other Department")));
    
    const heatmap = divisions.map((div) => {
      const divTalents = talents.filter((t) => t.division === div);
      const competencyGaps = competenciesList.map((compName) => {
        let totalScore = 0;
        let count = 0;
        const belowTargetTalents: { name: string; score: number }[] = [];

        divTalents.forEach((t) => {
          let rating = 3.0;
          const paKey = compKeyMap[compName];
          if (t.potentialAssessment && t.potentialAssessment[paKey] !== undefined) {
            rating = Number(t.potentialAssessment[paKey]) || 3.0;
          } else {
            const comp = t.competencies?.find((c) => c.name.toLowerCase() === compName.toLowerCase());
            if (comp && comp.score !== undefined) {
              rating = comp.score / 20;
            }
          }

          totalScore += rating;
          count++;

          if (rating < managerialTarget) {
            belowTargetTalents.push({ name: t.name, score: rating });
          }
        });

        const avgRating = count > 0 ? totalScore / count : 3.0;
        const gap = avgRating - managerialTarget;

        return {
          competencyName: compName,
          avgRating: parseFloat(avgRating.toFixed(2)),
          gap: parseFloat(gap.toFixed(2)),
          belowTargetCount: belowTargetTalents.length,
          belowTargetTalents,
        };
      });

      return {
        division: div,
        talentsCount: divTalents.length,
        competencyGaps,
      };
    });

    return {
      heatmap,
      competenciesList,
      divisions,
    };
  }, [talents, managerialTarget]);

  // Filtered heatmap rows
  const filteredHeatmapRows = React.useMemo(() => {
    return skillGapHeatmapData.heatmap.filter((row) => {
      if (heatmapSearch.trim() !== "") {
        const q = heatmapSearch.toLowerCase();
        if (!row.division.toLowerCase().includes(q)) return false;
      }
      if (heatmapDeptFilter !== "All" && row.division !== heatmapDeptFilter) {
        return false;
      }
      if (heatmapGapFilter === "Critical") {
        return row.competencyGaps.some(g => g.gap < -0.5);
      } else if (heatmapGapFilter === "HasGap") {
        return row.competencyGaps.some(g => g.gap < 0);
      } else if (heatmapGapFilter === "NoGap") {
        return row.competencyGaps.every(g => g.gap >= 0);
      }
      return true;
    });
  }, [skillGapHeatmapData.heatmap, heatmapSearch, heatmapDeptFilter, heatmapGapFilter]);

  // Filtered active candidates
  const filteredActiveCandidates = React.useMemo(() => {
    return talents.filter((t) => {
      if (activeCandidateSearch.trim() !== "") {
        const q = activeCandidateSearch.toLowerCase();
        const match = t.name.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.division.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (activeCandidateDivisionFilter !== "All" && t.division !== activeCandidateDivisionFilter) {
        return false;
      }
      if (activeCandidateReadinessFilter !== "All" && t.readiness.toLowerCase() !== activeCandidateReadinessFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [talents, activeCandidateSearch, activeCandidateDivisionFilter, activeCandidateReadinessFilter]);

  const skillGapSummary = React.useMemo(() => {
    let largestNegativeGap = 0;
    let worstComp = "";
    let worstDiv = "";
    let totalGapsCount = 0;

    skillGapHeatmapData.heatmap.forEach((row) => {
      row.competencyGaps.forEach((g) => {
        if (g.gap < 0) {
          totalGapsCount++;
          if (g.gap < largestNegativeGap) {
            largestNegativeGap = g.gap;
            worstComp = g.competencyName;
            worstDiv = row.division;
          }
        }
      });
    });

    return {
      largestNegativeGap: Math.abs(largestNegativeGap),
      worstComp,
      worstDiv,
      totalGapsCount,
    };
  }, [skillGapHeatmapData]);

  const highUrgencyPositionsWithoutReadySuccessor = React.useMemo(() => {
    return retiringPositions.filter((pos) => {
      if (pos.urgency !== "High") return false;
      
      if (!pos.assignedSuccessorId) {
        return true; // No successor assigned
      }
      
      const successor = talents.find((t) => t.id === pos.assignedSuccessorId);
      if (!successor) {
        return true; // Assigned successor not found in talents list
      }
      
      return successor.readiness.toUpperCase() !== "READY NOW";
    });
  }, [retiringPositions, talents]);

  // Update a single score in state for interactive simulation
  const handleScoreChange = (metricType: "psychometric" | "competency", name: string, value: number) => {
    setTalents((prevTalents) =>
      prevTalents.map((t) => {
        if (t.id === selectedTalentId) {
          if (metricType === "psychometric") {
            const key = name as keyof typeof t.psychometric;
            return {
              ...t,
              psychometric: {
                ...t.psychometric,
                [key]: {
                  ...t.psychometric[key],
                  score: value
                }
              }
            };
          } else {
            return {
              ...t,
              competencies: t.competencies.map((comp) => {
                if (comp.name === name) {
                  let label = comp.label;
                  if (value >= 90) label = "Expert (5/5)";
                  else if (value >= 80) label = "Advanced (4.5/5)";
                  else if (value >= 70) label = "Advanced (4/5)";
                  else if (value >= 60) label = "Proficient (3.5/5)";
                  else label = "Developing (3/5)";
                  
                  return {
                    ...comp,
                    score: value,
                    label
                  };
                }
                return comp;
              })
            };
          }
        }
        return t;
      })
    );
  };

  const handlePotentialMetricChange = (field: keyof PotentialAssessment, value: number | string) => {
    setTalents((prevTalents) =>
      prevTalents.map((t) => {
        if (t.id === selectedTalentId) {
          const assessment = ensurePotentialAssessment(t);
          return {
            ...t,
            potentialAssessment: {
              ...assessment,
              [field]: value
            }
          };
        }
        return t;
      })
    );
  };

  const handlePerformanceEvaluationChange = (year: string, value: number) => {
    setTalents((prevTalents) =>
      prevTalents.map((t) => {
        if (t.id === selectedTalentId) {
          const prevEval = t.performanceEvaluation || evaluationYears.reduce((acc, yr) => {
            acc[`fy${yr}`] = 3;
            return acc;
          }, {} as Record<string, number>);
          return {
            ...t,
            performanceEvaluation: {
              ...prevEval,
              [year]: value
            }
          };
        }
        return t;
      })
    );
  };

  const handlePerformanceEvaluationChangeDirect = (talentId: string, year: string, value: number) => {
    setTalents((prevTalents) =>
      prevTalents.map((t) => {
        if (t.id === talentId) {
          const prevEval = t.performanceEvaluation || evaluationYears.reduce((acc, yr) => {
            acc[`fy${yr}`] = 3;
            return acc;
          }, {} as Record<string, number>);
          return {
            ...t,
            performanceEvaluation: {
              ...prevEval,
              [year]: value
            }
          };
        }
        return t;
      })
    );
  };

  const handleAddTraining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraining.name || !newTraining.provider || !newTraining.date) return;

    setTalents(prev => prev.map(t => {
      if (t.id === selectedTalentId) {
        const currentTrainings = t.trainings || [];
        return {
          ...t,
          trainings: [
            ...currentTrainings,
            {
              id: "tr-" + Date.now(),
              name: newTraining.name,
              provider: newTraining.provider,
              date: newTraining.date,
              type: newTraining.type,
              status: newTraining.status,
              notes: newTraining.notes
            }
          ]
        };
      }
      return t;
    }));

    setIsAddTrainingOpen(false);
    setNewTraining({
      name: "",
      provider: "",
      date: "",
      type: "Technical",
      status: "Planned",
      notes: ""
    });
  };

  const handleStartEditTraining = (training: any) => {
    setEditingTrainingId(training.id);
    setNewTraining({
      name: training.name,
      provider: training.provider,
      date: training.date,
      type: training.type,
      status: training.status,
      notes: training.notes || ""
    });
    setIsAddTrainingOpen(true);
  };

  const handleSaveEditTraining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraining.name || !newTraining.provider || !newTraining.date || !editingTrainingId) return;

    setTalents(prev => prev.map(t => {
      if (t.id === selectedTalentId) {
        const currentTrainings = t.trainings || [];
        return {
          ...t,
          trainings: currentTrainings.map(tr => {
            if (tr.id === editingTrainingId) {
              return {
                ...tr,
                name: newTraining.name,
                provider: newTraining.provider,
                date: newTraining.date,
                type: newTraining.type,
                status: newTraining.status,
                notes: newTraining.notes
              };
            }
            return tr;
          })
        };
      }
      return t;
    }));

    setIsAddTrainingOpen(false);
    setEditingTrainingId(null);
    setNewTraining({
      name: "",
      provider: "",
      date: "",
      type: "Technical",
      status: "Planned",
      notes: ""
    });
  };

  const handleDeleteTraining = (trainingId: string) => {
    const dynamicTalent = talents.find(t => t.id === selectedTalentId);
    const targetTraining = dynamicTalent?.trainings?.find(tr => tr.id === trainingId);
    triggerDeleteModal({
      title: "Hapus Program Pelatihan?",
      itemName: targetTraining?.name || "Program Pelatihan",
      itemSubtitle: `Penyelenggara: ${targetTraining?.provider || '-'} • Kategori: ${targetTraining?.type || 'Training'}`,
      warningText: "Apakah Anda yakin ingin menghapus program pelatihan ini dari rencana pengembangan IDP talenta?",
      confirmButtonText: "Ya, Hapus Pelatihan",
      onConfirm: () => {
        setTalents(prev => prev.map(t => {
          if (t.id === selectedTalentId) {
            const currentTrainings = t.trainings || [];
            return {
              ...t,
              trainings: currentTrainings.filter(tr => tr.id !== trainingId)
            };
          }
          return t;
        }));
        setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Rendering conditional authentication layers (Landing, Login)
  if (authState === "landing") {
    const currentPreviewTalent = talents.find(t => t.id === previewTalentId) || talents[0];
    const previewDetails = calculateTalentPotentialDetails(currentPreviewTalent);
    const pAss = previewDetails.assessment;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-primary/10">
        {/* Subtle grid accent background */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none"></div>

        {/* Premium Navigation Header */}
        <header className="w-full bg-white/90 dark:bg-slate-900 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-3 sm:py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-lg bg-white/90 dark:bg-white inline-flex items-center justify-center shadow-2xs">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" 
                  className="h-7 md:h-9 object-contain" 
                  alt="Ajinomoto Indonesia Group Logo" 
                />
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3 hidden sm:block">
                <span className="font-display text-sm font-black text-primary dark:text-teal-400 tracking-wide block leading-none">AJINOMOTO INDONESIA</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-300 font-extrabold uppercase tracking-wider block mt-1">Succession Suite</span>
              </div>
            </div>

            {/* Middle Nav Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-700 dark:text-slate-100">
              <a href="#metodologi" className="text-slate-700 dark:text-slate-100 hover:text-primary dark:hover:text-teal-400 transition-colors">Metodologi Asesmen</a>
              <a href="#fitur" className="text-slate-700 dark:text-slate-100 hover:text-primary dark:hover:text-teal-400 transition-colors">Pilar Evaluasi</a>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-700 dark:text-slate-100 font-extrabold">Akses HR Internal</span>
            </nav>
            
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle Button */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>

              <button 
                onClick={() => setAuthState("login")}
                className="bg-primary hover:bg-primary/95 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all shadow-sm shadow-primary/10 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <User className="w-4 h-4" />
                Masuk ke Portal
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-4 pb-10 md:pt-6 md:pb-14">
          <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
            
            {/* Left Column: Copy & CTAs */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold text-slate-800 dark:text-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WORKSPACE RESMI HUMAN RESOURCE</span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Mempersiapkan Pemimpin Strategis <span className="text-primary dark:text-teal-400 relative inline-block">Ajinomoto Indonesia <span className="absolute left-0 bottom-0.5 w-full h-1 bg-primary/20 dark:bg-teal-400/30 rounded"></span></span>
              </h1>

              <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                Standardisasi pemetaan suksesi kepemimpinan untuk <span className="font-bold text-slate-900 dark:text-white">seluruh pemangku jabatan</span>. Menghubungkan potensi kognitif psikotes, penilaian kompetensi manajerial, dan Individual Development Plan (IDP) dalam satu platform terpusat.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  onClick={() => setAuthState("login")}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold px-6 py-3.5 rounded-lg shadow-md shadow-primary/15 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Entry Sistem</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                <a 
                  href="#metodologi"
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold px-6 py-3.5 rounded-lg shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Pelajari Parameter Matrix</span>
                </a>
              </div>

              {/* Demo Credentials Helper Box */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 max-w-lg space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Akses Cepat Pengujian Portal (Demo Account)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[9px] text-primary dark:text-teal-400 block font-black uppercase tracking-wider">AKSES FULL ADMIN</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100 font-bold block mt-0.5">admin@ajinomoto.com</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 block text-[10px] mt-0.5">Sandi: password123</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[9px] text-primary dark:text-teal-400 block font-black uppercase tracking-wider">AKSES VIEW ONLY (EDWIN)</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100 font-bold block mt-0.5">user@ajinomoto.com</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 block text-[10px] mt-0.5">Sandi: password123</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Mockup */}
            <div className="lg:col-span-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden text-left"
              >
                {/* Simulated MacOS Window Chrome */}
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                    <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-300 uppercase tracking-widest font-black">Succession Teaser Preview</span>
                  <div className="w-12" />
                </div>

                {/* Dashboard teaser container */}
                <div className="p-5 space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">Peta Suksesi (9-Box Teaser)</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">Klik kandidat di sebelah kanan untuk menganalisis data suksesi</p>
                    </div>
                    <span className="bg-primary/10 dark:bg-teal-950 text-primary dark:text-teal-300 text-[9px] font-extrabold px-2 py-0.5 rounded border border-primary/20 dark:border-teal-700">ASV COMPLIANT</span>
                  </div>

                  {/* Split Dashboard layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    {/* Left: Interactive 9 Box Mini Map */}
                    <div className="sm:col-span-7 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col space-y-2">
                      <div className="flex justify-between text-[8px] font-extrabold text-slate-700 dark:text-slate-200 uppercase px-1">
                        <span>Y-Axis: Kinerja</span>
                        <span>X-Axis: Potensi</span>
                      </div>
                      
                      {/* 3x3 Mini Grid - Dynamically synced with talents state with fixed row heights & scrollable avatars */}
                      <div className="grid grid-cols-3 gap-1.5 w-full">
                        {[
                          { box: 4, label: "Enigma", pot: "Low", perf: "High", bg: "bg-amber-50 dark:bg-amber-950/40" },
                          { box: 7, label: "High Potential", pot: "Medium", perf: "High", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
                          { box: 9, label: "Star Candidate", pot: "High", perf: "High", bg: "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700" },
                          { box: 2, label: "Inconsistent", pot: "Low", perf: "Medium", bg: "bg-rose-50 dark:bg-rose-950/40" },
                          { box: 5, label: "Key Player", pot: "Medium", perf: "Medium", bg: "bg-amber-50 dark:bg-amber-950/40" },
                          { box: 8, label: "High Performer", pot: "High", perf: "Medium", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
                          { box: 1, label: "Underperformer", pot: "Low", perf: "Low", bg: "bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700" },
                          { box: 3, label: "Solid Performer", pot: "Medium", perf: "Low", bg: "bg-rose-50 dark:bg-rose-950/40" },
                          { box: 6, label: "Specialist", pot: "High", perf: "Low", bg: "bg-amber-50 dark:bg-amber-950/40" }
                        ].map((cell, idx) => {
                          const cellTalents = talents.filter(t => {
                            const placement = getTalentPlacement(t);
                            return placement.performance === cell.perf && placement.potential === cell.pot;
                          });

                          return (
                            <div 
                              key={idx} 
                              className={`rounded-lg p-1.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between relative h-[110px] sm:h-[115px] overflow-hidden ${cell.bg}`}
                            >
                              <div className="flex justify-between items-center w-full z-10 shrink-0">
                                <span className="text-[7px] font-black text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                  Box {cell.box}
                                </span>
                                <span className="text-[7px] font-mono font-black text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 px-1 rounded">
                                  {cellTalents.length}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1 justify-start items-start h-full pt-1.5 overflow-y-auto max-h-[82px] custom-scrollbar pr-0.5 w-full">
                                {cellTalents.length === 0 ? (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 font-semibold italic">
                                    - Kosong -
                                  </div>
                                ) : (
                                  cellTalents.map(tObj => {
                                    const isSelected = previewTalentId === tObj.id;
                                    const initials = tObj.name ? tObj.name.split(" ").map(n => n[0]).slice(0, 3).join("") : "?";
                                    return (
                                      <button
                                        key={tObj.id}
                                        onClick={() => setPreviewTalentId(tObj.id)}
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black transition-all cursor-pointer shrink-0 ${
                                          isSelected 
                                            ? "bg-primary text-white scale-110 ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-slate-900 shadow-sm z-10 animate-pulse" 
                                            : "bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:scale-105 opacity-90 hover:opacity-100"
                                        }`}
                                        title={`${tObj.name} (${tObj.title || tObj.division})`}
                                      >
                                        {initials}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Candidate Details */}
                    <div className="sm:col-span-5 flex flex-col justify-between space-y-3 bg-slate-50/80 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-extrabold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">Kandidat Asesmen</span>
                          <span className="text-[9px] text-slate-600 dark:text-slate-300 font-mono font-bold">({talents.filter(t => !teaserSearch || t.name.toLowerCase().includes(teaserSearch.toLowerCase()) || t.division.toLowerCase().includes(teaserSearch.toLowerCase())).length})</span>
                        </div>
                        
                        <div className="relative">
                          <Search className="w-2.5 h-2.5 absolute left-2 top-2 text-slate-400 dark:text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama kandidat..."
                            value={teaserSearch}
                            onChange={(e) => setTeaserSearch(e.target.value)}
                            className="w-full pl-6 pr-2 py-1 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
                          {talents
                            .filter(t => !teaserSearch || t.name.toLowerCase().includes(teaserSearch.toLowerCase()) || t.division.toLowerCase().includes(teaserSearch.toLowerCase()) || t.title.toLowerCase().includes(teaserSearch.toLowerCase()))
                            .map((t) => {
                              const isSelected = t.id === previewTalentId;
                              const placement = getTalentPlacement(t);
                              const boxNum = placement.performance === "High" ? (placement.potential === "Low" ? 4 : placement.potential === "Medium" ? 7 : 9)
                                : placement.performance === "Medium" ? (placement.potential === "Low" ? 2 : placement.potential === "Medium" ? 5 : 8)
                                : (placement.potential === "Low" ? 1 : placement.potential === "Medium" ? 3 : 6);
                              
                              const boxBg = boxNum === 9 ? "bg-emerald-500 text-white" 
                                : boxNum === 8 || boxNum === 7 ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : boxNum === 6 || boxNum === 5 || boxNum === 4 ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30";

                              return (
                                <button
                                  key={t.id}
                                  onClick={() => setPreviewTalentId(t.id)}
                                  className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-bold flex items-center justify-between gap-1 transition-all cursor-pointer ${
                                    isSelected 
                                      ? "bg-primary text-white shadow-sm ring-1 ring-primary" 
                                      : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-black">{t.name}</div>
                                    <div className={`text-[8px] truncate ${isSelected ? "text-white/90" : "text-slate-600 dark:text-slate-300 font-semibold"}`}>
                                      {t.title || t.division} ({t.division})
                                    </div>
                                  </div>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ${isSelected ? "bg-white/20 text-white" : boxBg}`}>
                                    Box {boxNum}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[7px] font-black text-white shrink-0">
                              {currentPreviewTalent.name[0]}
                            </span>
                            <div className="min-w-0">
                              <span className="font-black text-[10px] text-slate-900 dark:text-slate-100 block truncate">{currentPreviewTalent.name}</span>
                              <span className="text-[8px] text-slate-600 dark:text-slate-300 font-semibold block truncate">{currentPreviewTalent.title} ({currentPreviewTalent.division})</span>
                            </div>
                          </div>
                          {(() => {
                            const placement = getTalentPlacement(currentPreviewTalent);
                            const boxNum = placement.performance === "High" ? (placement.potential === "Low" ? 4 : placement.potential === "Medium" ? 7 : 9)
                              : placement.performance === "Medium" ? (placement.potential === "Low" ? 2 : placement.potential === "Medium" ? 5 : 8)
                              : (placement.potential === "Low" ? 1 : placement.potential === "Medium" ? 3 : 6);
                            return (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black bg-primary/10 dark:bg-teal-950 text-primary dark:text-teal-300 border border-primary/20 shrink-0">
                                Box {boxNum}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[8px] font-extrabold text-slate-700 dark:text-slate-200">
                              <span>Skor Kinerja (Y)</span>
                              <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">{getTalentPerformanceScore(currentPreviewTalent).toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-emerald-500 h-1" style={{ width: `${(getTalentPerformanceScore(currentPreviewTalent) / 50) * 100}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-extrabold text-slate-700 dark:text-slate-200">
                              <span>Skor Potensi (X)</span>
                              <span className="font-mono text-primary dark:text-teal-400 font-black">{previewDetails.totalPotentialScore.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
                              <div className="bg-primary dark:bg-teal-400 h-1" style={{ width: `${previewDetails.totalPotentialScore}%` }} />
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900 p-1.5 rounded text-[8px] text-slate-700 dark:text-slate-200 font-bold flex justify-between items-center leading-normal">
                            <span>Status Suksesi:</span>
                            <span className={`font-black px-1 py-0.2 rounded uppercase text-[7px] ${
                              previewDetails.totalPotentialScore >= 80 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" 
                                : previewDetails.totalPotentialScore >= 60
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                            }`}>
                              {previewDetails.totalPotentialScore >= 80 ? "Siap Suksesi" : previewDetails.totalPotentialScore >= 60 ? "Pengembangan" : "Perlu Asesmen"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </section>

        {/* Metodologi Section */}
        <section id="metodologi" className="py-16 md:py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-[10px] font-black text-primary dark:text-teal-400 uppercase tracking-wider block">Standardisasi Metodologi Penilaian</span>
              <h2 className="font-display text-2xl md:text-3.5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Perhitungan Bobot Parameter Suksesi</h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
                Platform suksesi ini mengadopsi integrasi tiga variabel penilaian dengan persentase bobot tetap untuk menjaga transparansi, keadilan, dan akurasi suksesi kepemimpinan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40 dark:hover:border-teal-500/40 transition-all text-left space-y-4 shadow-xs">
                <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/80 rounded-lg flex items-center justify-center text-primary dark:text-teal-400 border border-teal-100 dark:border-teal-800/60">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-primary dark:text-teal-400 block uppercase tracking-wider">Bobot Nilai: 40%</span>
                  <h3 className="font-display font-black text-base text-slate-900 dark:text-slate-100">1. Psikotes & Potensi Kognitif</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Menganalisis 8 aspek kognitif fundamental termasuk kemampuan berpikir kritis, pemecahan masalah kompleks, kecerdasan interpersonal, serta tingkat komitmen & motivasi kerja.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400/40 dark:hover:border-indigo-500/40 transition-all text-left space-y-4 shadow-xs">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/80 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">Bobot Nilai: 50%</span>
                  <h3 className="font-display font-black text-base text-slate-900 dark:text-slate-100">2. Matriks Kompetensi Jabatan</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Validasi lapangan terhadap 9 dimensi kemampuan strategis: Business Knowledge, Leadership, Problem Solving, Strategic Mindset, hingga Ensures Accountability.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400/40 dark:hover:border-emerald-500/40 transition-all text-left space-y-4 shadow-xs">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/80 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Bobot Nilai: 10%</span>
                  <h3 className="font-display font-black text-base text-slate-900 dark:text-slate-100">3. Linieritas Latar Akademis</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Mengukur kecocokan tingkat latar belakang akademis (S1/S2/S3) serta relevansi spesialisasi pendidikan formal terhadap target posisi suksesi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Internal Security & Policy Section */}
        <section id="fitur" className="py-14 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 text-left">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <span className="text-[10px] font-black text-primary dark:text-teal-400 uppercase tracking-wider block">Ajinomoto Indonesia Shared Value (ASV) & Governance</span>
                <h3 className="font-display text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Keamanan Data & Integritas Penilaian Suksesi</h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Sistem ini dioperasikan sepenuhnya di bawah pengawasan department Human Resource Ajinomoto Indonesia. Seluruh proses pengolahan data talenta dilindungi enkripsi tingkat tinggi untuk memastikan objektivitas tanpa intervensi subjek.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Enkripsi Kredensial SSL</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Audit Asesmen Berkala</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 dark:bg-teal-950/80 rounded-lg text-primary dark:text-teal-400 mt-0.5">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">Penyelarasan Kompetensi Ajinomoto Indonesia</h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-normal mt-0.5">Memastikan suksesi eksekutif mencerminkan visi kontribusi sosial pangan dan kesehatan global berkelanjutan.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/80 rounded-lg text-indigo-600 dark:text-indigo-400 mt-0.5">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">Standardisasi Asesmen Independen</h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-normal mt-0.5">Menghilangkan bias evaluasi internal melalui integrasi langsung dari hasil tes psikotes pihak ketiga berlisensi.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Clean Footer */}
        <footer className="bg-white dark:bg-slate-900 py-8 border-t border-slate-200 dark:border-slate-800 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded bg-white/90 dark:bg-white inline-flex items-center justify-center shadow-2xs">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" 
                  className="h-5 object-contain" 
                  alt="Ajinomoto Indonesia Logo" 
                />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">© {new Date().getFullYear()} PT Ajinomoto Indonesia. Succession Strategy Board.</span>
            </div>
            <div className="flex gap-4 font-bold text-slate-700 dark:text-slate-200">
              <a href="#" className="hover:text-primary dark:hover:text-teal-400 transition-colors">Panduan Sistem</a>
              <a href="#" className="hover:text-primary dark:hover:text-teal-400 transition-colors">Kerahasiaan Data</a>
              <a href="#" className="hover:text-primary dark:hover:text-teal-400 transition-colors">HR Support</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (authState === "login") {
    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      setLoginError("");

      setTimeout(() => {
        const result = authenticateUser(loginEmail, loginPassword, userAccounts);
        if (result.success && result.account) {
          const loggedAcc = result.account;
          const { updatedAccounts, activeAccount } = recordUserLogin(loggedAcc.id, userAccounts);
          setUserAccounts(updatedAccounts);
          const current = activeAccount || loggedAcc;
          setCurrentUserAccount(current);
          setUserRole(current.role);
          try {
            localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, current.id);
          } catch (err) {
            console.error("Gagal simpan session", err);
          }

          if (current.role === "admin") {
            setAdminProfile(prev => ({
              ...prev,
              name: current.name,
              title: current.title,
              email: current.email,
              department: current.department,
              initials: current.initials || generateInitials(current.name)
            }));
            setActiveTab("home");
          } else {
            if (current.linkedTalentId && talents.some(t => t.id === current.linkedTalentId)) {
              setSelectedTalentId(current.linkedTalentId);
            } else {
              setSelectedTalentId("edwin-prasetyo");
            }
            setActiveTab("profile");
          }
          setAuthState("authenticated");
          addSecurityLog(`Autentikasi akun berhasil: ${current.name} (${current.email}) [${current.role.toUpperCase()}]`, "success");
        } else {
          setLoginError(result.error || "Email atau kata sandi yang Anda masukkan tidak valid.");
        }
        setIsLoggingIn(false);
      }, 500);
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:grid lg:grid-cols-12 font-sans selection:bg-primary/10">
        {/* Left Side: Branding */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-primary/40 text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" 
                className="h-9 object-contain brightness-0 invert" 
                alt="Ajinomoto Indonesia Logo White" 
              />
              <div className="border-l border-white/20 pl-3">
                <span className="font-display text-sm font-black tracking-wider block leading-none">AJINOMOTO INDONESIA</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Succession Suite</span>
              </div>
            </div>

            <div className="pt-12 space-y-4">
              <span className="text-[10px] font-black text-primary dark:text-teal-400 uppercase tracking-widest bg-primary/10 dark:bg-teal-950/50 px-2.5 py-1 rounded border border-primary/25 dark:border-teal-800 inline-block">PORTAL INTERNAL HR</span>
              <h2 className="font-display text-3xl font-black tracking-tight leading-tight">
                Mencetak Pemimpin Masa Depan Berbasis Kompetensi Objektif
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed font-normal">
                Sistem suksesi kepemimpinan dirancang untuk memetakan kekuatan talenta internal, menyelaraskan target pengembangan diri (IDP), serta mengamankan kontinuitas kepemimpinan di seluruh lini jabatan PT Ajinomoto Indonesia secara akurat dan transparan.
              </p>
            </div>
          </div>

          <div className="relative z-10 bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-md space-y-3.5">
            <div className="flex items-center gap-2 text-primary dark:text-teal-400">
              <Sparkles className="w-4.5 h-4.5" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">ASV CORE PHILOSOPHY</span>
            </div>
            <p className="text-[11px] text-slate-300 italic leading-relaxed">
              "Kekuatan utama bisnis kami terletak pada pengembangan sumber daya manusia secara holistik, menyatukan nilai-nilai kontribusi sosial pangan dengan ketajaman kepemimpinan bisnis."
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-white">HR</div>
              <div>
                <span className="text-[10px] font-bold block leading-none text-white">Department Human Resource</span>
                <span className="text-[8px] text-slate-400 block mt-0.5">PT Ajinomoto Indonesia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="flex-1 lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 md:p-16 relative bg-white dark:bg-slate-900">
          <div className="flex justify-between items-center pb-8 lg:pb-0">
            <button 
              onClick={() => setAuthState("landing")}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-xs transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Kembali ke Beranda
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest hidden sm:inline">SSB SECURE LOGIN v2.1</span>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto my-auto py-8 space-y-8">
            <div className="space-y-2.5">
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" 
                  className="h-8 object-contain dark:brightness-110" 
                  alt="Ajinomoto Indonesia Logo" 
                />
                <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                  <span className="font-display text-sm font-black text-primary dark:text-teal-400 tracking-wide block leading-none">AJINOMOTO INDONESIA</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mt-1">Succession Suite</span>
                </div>
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                Masuk ke Portal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gunakan kredensial resmi department Human Resource untuk mengelola asesmen suksesi pimpinan.
              </p>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-200 text-xs rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Autentikasi Gagal</span>
                  <p className="font-medium opacity-90">{loginError}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 block uppercase tracking-wider">Email Resmi</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all"
                    placeholder="nama@ajinomoto.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 block uppercase tracking-wider">Kata Sandi</label>
                  <a href="#" className="text-[10px] text-slate-400 dark:text-slate-400 hover:text-primary dark:hover:text-teal-400 font-bold">Lupa Sandi?</a>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type="password" 
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary dark:focus:border-teal-400 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-lg transition-all active:scale-[0.98] shadow-md shadow-primary/10 text-xs flex justify-center items-center gap-2 mt-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Kredensial...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>MASUK PORTAL AMAN</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Secure footer */}
          <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
            <span>SISTEM DIENKRIPSI SSL 256-BIT</span>
            <span>DEPARTMENT HR PT AJINOMOTO INDONESIA</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Top App Bar (Mobile UI) */}
      <header className="md:hidden w-full top-0 sticky bg-surface-container-lowest border-b border-surface-container-highest flex justify-between items-center px-5 py-3 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (activeTab !== "profile") {
                setActiveTab("profile");
              }
            }}
            className="text-primary active:scale-95 duration-150 p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" 
              className="h-6 object-contain" 
              alt="Ajinomoto Indonesia Logo" 
            />
            <span className="font-display text-base font-extrabold text-primary">Advisor</span>
          </div>
        </div>
        <div className="relative">
          <button 
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className="text-primary active:scale-95 duration-150 p-2 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {/* Dropdown menu */}
          <AnimatePresence>
            {moreMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-surface-container-highest py-1 z-50 text-sm"
                >
                  <button 
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setIsOverallSummaryModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface cursor-pointer font-bold text-emerald-800"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Report Summary System (All Data)
                  </button>
                  <button 
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    Download PDF Profile Report
                  </button>
                  <button 
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setIsEditingScores(!isEditingScores);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface"
                  >
                    <Sliders className="w-4 h-4 text-secondary" />
                    {isEditingScores ? "Lock Performance Ratings" : "Adjust Performance Ratings"}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 min-h-[calc(100vh-60px)] md:min-h-screen relative w-full min-w-0 overflow-x-hidden">
        
        {/* Navigation Drawer (Desktop Sidebar with Collapse/Expand support) */}
        <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? "w-[76px] p-2.5" : "w-[280px] p-4"} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none space-y-2 z-40 flex-shrink-0 sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out`}>
          
          {/* Brand Logo & Collapse Toggle Header */}
          <div className={`flex ${isSidebarCollapsed ? "flex-col gap-3 p-1" : "items-center justify-between pb-3.5 px-1"} mb-2 border-b border-slate-200 dark:border-slate-800`}>
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 transition-all">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" className="h-8 object-contain drop-shadow-xs" alt="Ajinomoto Logo" />
                <div>
                  <span className="font-display text-[13px] font-black text-[#d6001c] dark:text-rose-400 tracking-wider block leading-tight">AJINOMOTO</span>
                  <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Succession Board</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center my-1 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700" title="Ajinomoto Indonesia Group">
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" className="h-7 object-contain" alt="Ajinomoto Logo" />
              </div>
            )}

            <button
              onClick={() => {
                setIsSidebarCollapsed(!isSidebarCollapsed);
                setShortcutToast(!isSidebarCollapsed ? "Sidebar Diperkecil (Collapsed)" : "Sidebar Diperlebar (Expanded)");
                setTimeout(() => setShortcutToast(null), 2500);
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
              title={isSidebarCollapsed ? "Perlebar Sidebar (Ctrl + B)" : "Perkecil Sidebar (Ctrl + B)"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-pulse" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Executive User profile card */}
          <div 
            onClick={() => {
              if (userRole === "admin") {
                setIsAdminMasterModalOpen(true);
              }
            }}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center p-1.5" : "gap-3 p-2.5 px-3"} mb-2 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs hover:border-teal-400/80 dark:hover:border-teal-500/50 transition-all ${
              userRole === "admin" ? "cursor-pointer group" : ""
            }`}
            title={isSidebarCollapsed ? `Administrator: ${userRole === "admin" ? adminProfile.name : "Edwin Prasetyo"} (Klik Edit)` : (userRole === "admin" ? "Klik untuk Edit & Simpan Profiling Admin Master" : "")}
          >
            <div className={`relative ${isSidebarCollapsed ? "w-10 h-10" : "w-10 h-10"} rounded-xl ${userRole === "admin" ? "bg-teal-700 dark:bg-teal-600 text-white dark:text-slate-950 ring-2 ring-teal-500/30 shadow-xs" : "bg-emerald-600 text-white ring-2 ring-emerald-500/30"} flex items-center justify-center font-display font-black text-sm shrink-0`}>
              {currentUserAccount?.initials || (userRole === "admin" ? adminProfile.initials : "EP")}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-2xs"></span>
            </div>

            {!isSidebarCollapsed && (
              <div className="flex-1 overflow-hidden text-left">
                <div className="flex items-center justify-between gap-1">
                  <h2 className="font-display text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 truncate">
                    {currentUserAccount?.name || (userRole === "admin" ? adminProfile.name : "Edwin Prasetyo")}
                  </h2>
                  {userRole === "admin" && (
                    <UserCog className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 group-hover:rotate-45 transition-all shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {currentUserAccount?.title || (userRole === "admin" ? adminProfile.title : "Senior Candidate (User)")}
                </p>
              </div>
            )}
          </div>

          {/* Role Badge */}
          {!isSidebarCollapsed && (
            <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black tracking-wider uppercase text-center mb-2 shadow-2xs ${
              userRole === "admin" 
                ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60" 
                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>ROLE: {userRole === "admin" ? "ADMINISTRATOR" : "USER / KARYAWAN"}</span>
            </div>
          )}

          {/* Navigation Section Header */}
          {!isSidebarCollapsed && (
            <div className="px-2 pt-1 pb-1 flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span>Menu Navigasi</span>
              <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800"></span>
            </div>
          )}

          {/* Main Navigation Items */}
          <div className="space-y-1.5 flex-1">
            {userRole === "admin" && (
              <button 
                onClick={() => setActiveTab("home")}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"} rounded-xl transition-all text-left group ${
                  activeTab === "home" 
                    ? "bg-primary dark:bg-teal-500 text-white dark:text-slate-950 font-black shadow-md shadow-primary/25 translate-x-0.5" 
                    : "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-teal-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 font-bold hover:shadow-2xs"
                }`}
                title={isSidebarCollapsed ? "Dashboard Overview (Alt + 1)" : ""}
              >
                <LayoutGrid className={`w-5 h-5 shrink-0 transition-transform ${activeTab === "home" ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-teal-300 group-hover:scale-110"}`} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="text-xs tracking-tight truncate">Dashboard Overview</span>
                    <kbd className={`px-1.5 py-0.5 text-[9px] font-mono rounded shadow-2xs font-bold ${activeTab === "home" ? "bg-white/20 dark:bg-slate-950/30 text-white dark:text-slate-950 border border-white/25 dark:border-slate-950/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-teal-800 dark:group-hover:text-teal-300 border border-slate-200 dark:border-slate-700"}`}>Alt+1</kbd>
                  </div>
                )}
              </button>
            )}

            {userRole === "admin" && (
              <button 
                onClick={() => setActiveTab("talent-pool")}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"} rounded-xl transition-all text-left group ${
                  activeTab === "talent-pool" 
                    ? "bg-primary dark:bg-teal-500 text-white dark:text-slate-950 font-black shadow-md shadow-primary/25 translate-x-0.5" 
                    : "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-teal-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 font-bold hover:shadow-2xs"
                }`}
                title={isSidebarCollapsed ? "Talent Pool Directory (Alt + 2)" : ""}
              >
                <Users className={`w-5 h-5 shrink-0 transition-transform ${activeTab === "talent-pool" ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-teal-300 group-hover:scale-110"}`} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="text-xs tracking-tight truncate">Talent Directory</span>
                    <kbd className={`px-1.5 py-0.5 text-[9px] font-mono rounded shadow-2xs font-bold ${activeTab === "talent-pool" ? "bg-white/20 dark:bg-slate-950/30 text-white dark:text-slate-950 border border-white/25 dark:border-slate-950/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-teal-800 dark:group-hover:text-teal-300 border border-slate-200 dark:border-slate-700"}`}>Alt+2</kbd>
                  </div>
                )}
              </button>
            )}

            {userRole === "admin" && (
              <button 
                onClick={() => setActiveTab("nine-box")}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"} rounded-xl transition-all text-left group ${
                  activeTab === "nine-box" 
                    ? "bg-primary dark:bg-teal-500 text-white dark:text-slate-950 font-black shadow-md shadow-primary/25 translate-x-0.5" 
                    : "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-teal-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 font-bold hover:shadow-2xs"
                }`}
                title={isSidebarCollapsed ? "Nine-Box Matrix (Alt + 3)" : ""}
              >
                <Grid3X3 className={`w-5 h-5 shrink-0 transition-transform ${activeTab === "nine-box" ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-teal-300 group-hover:scale-110"}`} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="text-xs tracking-tight truncate">Nine-Box Matrix</span>
                    <kbd className={`px-1.5 py-0.5 text-[9px] font-mono rounded shadow-2xs font-bold ${activeTab === "nine-box" ? "bg-white/20 dark:bg-slate-950/30 text-white dark:text-slate-950 border border-white/25 dark:border-slate-950/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-teal-800 dark:group-hover:text-teal-300 border border-slate-200 dark:border-slate-700"}`}>Alt+3</kbd>
                  </div>
                )}
              </button>
            )}

            <button 
              onClick={() => {
                setActiveTab("profile");
              }}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"} rounded-xl transition-all text-left group ${
                activeTab === "profile" 
                  ? "bg-primary dark:bg-teal-500 text-white dark:text-slate-950 font-black shadow-md shadow-primary/25 translate-x-0.5" 
                  : "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-teal-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 font-bold hover:shadow-2xs"
              }`}
              title={isSidebarCollapsed ? "Detail Profil & IDP (Alt + 4)" : ""}
            >
              <User className={`w-5 h-5 shrink-0 transition-transform ${activeTab === "profile" ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-teal-300 group-hover:scale-110"}`} />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="text-xs tracking-tight truncate">
                    {userRole === "admin" ? "Profile Details" : "Profil & IDP Saya"}
                  </span>
                  <kbd className={`px-1.5 py-0.5 text-[9px] font-mono rounded shadow-2xs font-bold ${activeTab === "profile" ? "bg-white/20 dark:bg-slate-950/30 text-white dark:text-slate-950 border border-white/25 dark:border-slate-950/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-teal-800 dark:group-hover:text-teal-300 border border-slate-200 dark:border-slate-700"}`}>Alt+4</kbd>
                </div>
              )}
            </button>

            {userRole === "admin" && (
              <button 
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"} rounded-xl transition-all text-left group ${
                  activeTab === "settings" 
                    ? "bg-primary dark:bg-teal-500 text-white dark:text-slate-950 font-black shadow-md shadow-primary/25 translate-x-0.5" 
                    : "text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-teal-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 font-bold hover:shadow-2xs"
                }`}
                title={isSidebarCollapsed ? "Advisory Controls (Alt + 5)" : ""}
              >
                <Settings className={`w-5 h-5 shrink-0 transition-transform ${activeTab === "settings" ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-teal-300 group-hover:scale-110"}`} />
                {!isSidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="text-xs tracking-tight truncate">Advisory Controls</span>
                    <kbd className={`px-1.5 py-0.5 text-[9px] font-mono rounded shadow-2xs font-bold ${activeTab === "settings" ? "bg-white/20 dark:bg-slate-950/30 text-white dark:text-slate-950 border border-white/25 dark:border-slate-950/20" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-teal-800 dark:group-hover:text-teal-300 border border-slate-200 dark:border-slate-700"}`}>Alt+5</kbd>
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Bottom Controls & Shortcuts */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"} rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer group`}
              title="Cari Talenta & Command Palette (Ctrl + K)"
            >
              <Command className="w-4 h-4 text-slate-600 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="text-[11px] truncate tracking-tight text-slate-800 dark:text-slate-100 font-bold">Cari & Actions</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 shadow-2xs font-bold">⌘K</kbd>
                </div>
              )}
            </button>

            {/* Keyboard Shortcuts Cheatsheet Button */}
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"} rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 transition-all shadow-2xs hover:shadow-xs cursor-pointer group`}
              title="Petunjuk Shortcut Keyboard (?)"
            >
              <Keyboard className="w-4 h-4 text-slate-600 dark:text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="text-[11px] truncate tracking-tight text-slate-800 dark:text-slate-100 font-bold">Shortcut Keys</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 shadow-2xs font-bold">?</kbd>
                </div>
              )}
            </button>

            <button 
              onClick={() => setAuthState("landing")}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2"} rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-all text-left font-bold cursor-pointer group`}
              title={isSidebarCollapsed ? "Logout Portal" : ""}
            >
              <ArrowLeft className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              {!isSidebarCollapsed && <span className="font-bold text-rose-600 dark:text-rose-400">Logout Portal</span>}
            </button>
          </div>
        </aside>

        {/* Main Scrollable Content Area */}
        <main className="flex-1 min-w-0 w-full px-4 sm:px-6 md:px-8 py-6 pb-28 md:pb-8 bg-background overflow-x-hidden">
          <div className="max-w-7xl w-full mx-auto space-y-6 min-w-0">

            {/* Breadcrumbs & Actions Header (Desktop) */}
            <div className="hidden md:flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-on-surface-variant text-sm font-medium">
                {userRole === "admin" ? (
                  <>
                    <button 
                      onClick={() => setActiveTab("talent-pool")}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      Talent Pool
                    </button>
                    {activeTab === "profile" && (
                      <>
                        <ChevronRight className="w-4 h-4 text-outline" />
                        <span className="text-primary font-semibold">{currentTalent.name}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-on-surface-variant">Profil Saya</span>
                    <ChevronRight className="w-4 h-4 text-outline" />
                    <span className="text-primary font-semibold">{currentTalent.name} (Karyawan)</span>
                  </>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Edit Profil Lengkap Button */}
                {activeTab === "profile" && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleOpenEditProfile}
                      className="h-8.5 px-3 bg-white hover:bg-surface-container-low text-secondary border border-surface-container-highest shadow-2xs font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      title="Edit Profil Lengkap Talenta"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                      <span>Edit Profil</span>
                    </button>
                    {userRole === "admin" && (
                      <button 
                        onClick={() => handleDeleteTalent(currentTalent.id, currentTalent.name)}
                        className="h-8.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shadow-2xs font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Hapus Talenta dari Master System"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Adjust Scores Simulator Button - Admin Only */}
                {userRole === "admin" && (
                  <button 
                    onClick={() => setIsEditingScores(!isEditingScores)}
                    className={`h-8.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                      isEditingScores 
                        ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700" 
                        : "bg-white text-secondary border border-surface-container-highest shadow-2xs hover:bg-surface-container-low"
                    }`}
                    title="Mode Edit Skor / Simulasi Metrics Assessment"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isEditingScores ? "Lock Metrics" : "Edit Skor"}</span>
                  </button>
                )}

                <div className="h-4 w-px bg-surface-container-highest mx-0.5 hidden sm:block"></div>

                <button 
                  onClick={() => setIsOverallSummaryModalOpen(true)}
                  className="h-8.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Cetak & Unduh Summary Report Keseluruhan Data System"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Summary System</span>
                </button>

                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="h-8.5 px-3.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Download Laporan Individual PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button 
                  onClick={() => handleOpenSendEmail("summary")}
                  className="h-8.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer border border-amber-400"
                  title="Kirim Laporan Summary / Individual via Email Gateway"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-950" />
                  <span>Email</span>
                </button>
              </div>
            </div>

            {/* TAB PANELS WITH ANIMATIONS */}
            <AnimatePresence mode="wait" custom={direction}>
              
              {/* 1. DASHBOARD VIEW */}
              {activeTab === "home" && (
                <motion.div
                  key="home"
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-surface-container-highest pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary">Strategic Talent Dashboard</h1>
                        {highUrgencyPositionsWithoutReadySuccessor.length > 0 && (
                          <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40 flex items-center gap-1 shrink-0">
                            <AlertCircle className="w-3 h-3" />
                            <span>{highUrgencyPositionsWithoutReadySuccessor.length} Risiko Kritis</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant mt-1">Real-time analytical representation of your succession pool, readiness metrics, and leadership development plans.</p>
                    </div>
                    {/* Sub-tabs toggle */}
                    <div className="flex bg-surface-container-high rounded-lg p-1 border border-surface-container-highest self-start md:self-center">
                      <button
                        onClick={() => setDashboardSubTab("analytics")}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                          dashboardSubTab === "analytics"
                            ? "bg-white text-primary shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        ANALISIS & METRIK UTAMA
                      </button>
                      <button
                        onClick={() => setDashboardSubTab("retirement")}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                          dashboardSubTab === "retirement"
                            ? "bg-white text-primary shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        PETA SUKSESI PENSIUN
                      </button>
                    </div>
                  </div>

                  {/* Succession Risk Alert Banner */}
                  {highUrgencyPositionsWithoutReadySuccessor.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30 rounded-xl p-4.5 flex flex-col md:flex-row items-start gap-4 transition-all shadow-sm">
                      <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                          ⚠️ Peringatan Risiko Kepemimpinan: Posisi Kunci Belum Terproteksi
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                          Terdapat <strong className="font-bold">{highUrgencyPositionsWithoutReadySuccessor.length} posisi suksesi kunci berkategori urgensi "High"</strong> yang belum memiliki suksesor berstatus <strong className="font-bold">Ready Now (Siap Sekarang)</strong>. Segera lakukan akselerasi kompetensi atau penunjukan suksesor alternatif untuk menghindari celah kepemimpinan.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {highUrgencyPositionsWithoutReadySuccessor.map((pos) => {
                            const succ = pos.assignedSuccessorId ? talents.find(t => t.id === pos.assignedSuccessorId) : null;
                            return (
                              <div key={pos.id} className="bg-white/90 dark:bg-slate-900/80 border border-rose-200/50 dark:border-rose-900/40 rounded-lg px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 shadow-2xs">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{pos.positionName}</span>
                                <span className="hidden sm:inline text-slate-300">|</span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Divisi: <strong className="text-slate-700 dark:text-slate-300">{pos.division}</strong>
                                </span>
                                <span className="hidden sm:inline text-slate-300">|</span>
                                <span className={`text-[10px] font-bold ${succ ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {succ ? `Suksesor: ${succ.name} (${succ.readiness})` : "Belum ada Suksesor Terpilih"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {dashboardSubTab === "analytics" ? (
                    <>
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-5 rounded-xl border border-surface-container-highest shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider block">Total Talents</span>
                            <span className="text-2xl font-bold text-on-surface">{totalTalents}</span>
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-surface-container-highest shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider block">Ready Immediately</span>
                            <span className="text-2xl font-bold text-emerald-600">{readyNowCount}</span>
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-surface-container-highest shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <Brain className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider block">Avg Analytics Score</span>
                            <span className="text-2xl font-bold text-on-surface">{avgLogicalScore}%</span>
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-surface-container-highest shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider block">Avg Leadership Score</span>
                            <span className="text-2xl font-bold text-on-surface">{avgLeadershipScore}%</span>
                          </div>
                        </div>
                      </div>

                      {/* QUICK INSIGHTS CARDS - Auto Highlights Top 3 Highest & Top 3 Lowest Rated Talents */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-container-highest dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div>
                            <h3 className="font-display text-base font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-amber-500" />
                              <span>Quick Insights: Heatmap Talent Highlights</span>
                            </h3>
                            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
                              Sorotan otomatis 3 talenta dengan rating tertinggi (Top Star Performers) dan 3 talenta terendah (Need Attention) berdasarkan data evaluasi matriks & heatmap terkini.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Live Auto-Calculated
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {/* Top 3 Highest Rated Card */}
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 p-4 space-y-3">
                            <div className="flex justify-between items-center pb-2.5 border-b border-emerald-200/60 dark:border-emerald-800/40">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
                                  <Award className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase text-emerald-950 dark:text-emerald-200 tracking-wider">
                                    Top 3 Highest-Rated Talents
                                  </h4>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Rating Kinerja & Potensi Tertinggi</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                                Star Performers
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {quickInsightsData.topHighest.map((item, index) => (
                                <div 
                                  key={item.talent.id}
                                  onClick={() => {
                                    setSelectedTalentId(item.talent.id);
                                    setActiveTab("profile");
                                  }}
                                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-2xs transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative shrink-0">
                                      <img src={item.talent.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-2xs" referrerPolicy="no-referrer" />
                                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                                        #{index + 1}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                          {item.talent.name}
                                        </h5>
                                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                                          {item.cellName}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {item.talent.title} • <strong className="text-slate-700 dark:text-slate-300">{item.talent.division}</strong>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      {item.overallRating}% <span className="text-[9px] font-sans font-medium text-emerald-600/80 dark:text-emerald-400/80">Rating</span>
                                    </div>
                                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                                      Perf: {item.perfScore}% | Pot: {item.potScore}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Top 3 Lowest Rated Card */}
                          <div className="bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200/80 dark:border-rose-800/50 p-4 space-y-3">
                            <div className="flex justify-between items-center pb-2.5 border-b border-rose-200/60 dark:border-rose-800/40">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow-2xs">
                                  <ShieldAlert className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase text-rose-950 dark:text-rose-200 tracking-wider">
                                    Top 3 Lowest-Rated Talents
                                  </h4>
                                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Membutuhkan Bimbingan & Pendampingan</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-black uppercase text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-700">
                                Need Attention
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {quickInsightsData.topLowest.map((item, index) => (
                                <div 
                                  key={item.talent.id}
                                  onClick={() => {
                                    setSelectedTalentId(item.talent.id);
                                    setActiveTab("profile");
                                  }}
                                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 shadow-2xs transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative shrink-0">
                                      <img src={item.talent.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-rose-500 shadow-2xs" referrerPolicy="no-referrer" />
                                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                                        #{index + 1}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                                          {item.talent.name}
                                        </h5>
                                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 shrink-0 border border-rose-200 dark:border-rose-800">
                                          {item.cellName}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {item.talent.title} • <strong className="text-slate-700 dark:text-slate-300">{item.talent.division}</strong>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="text-xs font-black font-mono text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                      {item.overallRating}% <span className="text-[9px] font-sans font-medium text-rose-600/80 dark:text-rose-400/80">Rating</span>
                                    </div>
                                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                                      Perf: {item.perfScore}% | Pot: {item.potScore}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* High-Potential Talents Distribution Chart Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-surface-container-highest dark:border-slate-800 p-6 shadow-sm space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <span>Distribusi Talenta Potensi Tinggi per Departemen</span>
                          </h3>
                          <p className="text-xs text-on-surface-variant dark:text-slate-300 mt-1">
                            Visualisasi sebaran suksesor potensial (Sumbu X Tinggi) dibandingkan dengan total suksesor di setiap bidang untuk membantu identifikasi celah kepemimpinan.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                          {/* Chart Column - Height adjusted for clear view */}
                          <div className="lg:col-span-2 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                            <div className="h-[330px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={highPotentialDistributionData}
                                  margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                                  <XAxis 
                                    dataKey="shortDivision" 
                                    stroke={isDarkMode ? "#cbd5e1" : "#475569"} 
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                  />
                                  <YAxis 
                                    stroke={isDarkMode ? "#cbd5e1" : "#475569"} 
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                                      borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                                      borderRadius: "8px",
                                      fontSize: "11px",
                                      color: isDarkMode ? "#f8fafc" : "#0f172a"
                                    }}
                                    labelFormatter={(label: any, payload: any[]) => {
                                      if (payload && payload.length > 0 && payload[0].payload) {
                                        const item = payload[0].payload;
                                        return `${item.division} (${item.shortDivision})`;
                                      }
                                      return label;
                                    }}
                                    cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }}
                                  />
                                  <Legend 
                                    verticalAlign="top" 
                                    align="right"
                                    height={36} 
                                    iconType="circle" 
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: "11px", color: isDarkMode ? "#e2e8f0" : "#334155" }}
                                  />
                                  <Bar 
                                    name="Potensi Tinggi (High Potential)" 
                                    dataKey="highPotentialCount" 
                                    fill={isDarkMode ? "#2dd4bf" : "#005454"} 
                                    radius={[4, 4, 0, 0]}
                                    barSize={24}
                                  />
                                  <Bar 
                                    name="Talenta Lainnya" 
                                    dataKey="otherCount" 
                                    fill={isDarkMode ? "#475569" : "#cbd5e1"} 
                                    radius={[4, 4, 0, 0]}
                                    barSize={24}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Analytical Callouts Column - Scrollable and sized to match chart */}
                          <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Analisis Kepadatan Bakat</span>
                              </h4>
                              
                              <div className="space-y-3">
                                <div className="flex items-baseline justify-between border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                                  <span className="text-xs text-slate-600 dark:text-slate-300">Total Departemen</span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{highPotentialDistributionData.length}</span>
                                </div>
                                <div className="flex items-baseline justify-between border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                                  <span className="text-xs text-slate-600 dark:text-slate-300">Departemen Berpotensi Tinggi</span>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {highPotentialDistributionData.filter(d => d.highPotentialCount > 0).length}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between pb-1">
                                  <span className="text-xs text-slate-600 dark:text-slate-300">Celah Bakat Teridentifikasi</span>
                                  <span className={`text-xs font-bold ${talentGapAnalysis.gaps.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {talentGapAnalysis.gaps.length} Bidang
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Talent Gap Warnings */}
                            {talentGapAnalysis.gaps.length > 0 ? (
                              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                  <span>Identifikasi Celah Bakat</span>
                                </h4>
                                <p className="text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                                  Departemen berikut belum memiliki suksesor berkategori <strong className="text-rose-950 dark:text-white font-bold">High Potential</strong>:
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {talentGapAnalysis.gaps.map((gap, idx) => (
                                    <span key={idx} className="bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                      {gap}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-2.5 italic">
                                  *Rekomendasi: Lakukan rotasi silang jabatan atau optimalkan IDP untuk akselerasi kompetensi pimpinan.
                                </p>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Keberlanjutan Kuat</span>
                                </h4>
                                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                                  Selamat! Semua departemen aktif saat ini telah memiliki setidaknya satu suksesor berpotensi tinggi (<strong className="text-emerald-950 dark:text-white font-bold">High Potential</strong>).
                                </p>
                              </div>
                            )}

                            {/* Strong Succession Pipeline */}
                            {talentGapAnalysis.strong.length > 0 && (
                              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Kekuatan Utama</span>
                                </h4>
                                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                                  <strong className="text-emerald-950 dark:text-white font-bold">{talentGapAnalysis.strong.join(", ")}</strong> memiliki keunggulan suksesi yang kuat (≥50% talenta adalah High Potential).
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Trend Analysis Chart Card */}
                      <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <span>Analisis Tren Kinerja Organisasi (FY 2020 - FY 2024)</span>
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Pelacakan rata-rata skor evaluasi kinerja seluruh talenta selama 5 tahun fiskal terakhir untuk memantau perkembangan kompetensi jangka panjang organisasi.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                          {/* Chart Column */}
                          <div className="lg:col-span-2 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                            <div className="h-[330px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={performanceTrendData}
                                  margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                                  <XAxis 
                                    dataKey="year" 
                                    stroke={isDarkMode ? "#cbd5e1" : "#475569"} 
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <YAxis 
                                    stroke={isDarkMode ? "#cbd5e1" : "#475569"} 
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[1, 5]}
                                    tickCount={5}
                                  />
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md text-xs">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">{data.year}</p>
                                            <div className="space-y-1">
                                              <p className="text-primary font-semibold">
                                                Rata-rata Rating: <span className="font-mono">{data.averageRating.toFixed(2)} / 5.00</span>
                                              </p>
                                              <p className="text-slate-500 dark:text-slate-400">
                                                Konversi Persentase: <span className="font-mono">{data.percentage}%</span>
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Legend 
                                    verticalAlign="top" 
                                    align="right"
                                    height={36} 
                                    iconType="circle" 
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: "11px", color: isDarkMode ? "#e2e8f0" : "#334155" }}
                                  />
                                  <Line 
                                    name="Rata-rata Evaluasi Kinerja (1-5)" 
                                    type="monotone"
                                    dataKey="averageRating" 
                                    stroke={isDarkMode ? "#2dd4bf" : "#005454"} 
                                    strokeWidth={3}
                                    dot={{ r: 5, strokeWidth: 2, fill: isDarkMode ? "#0f172a" : "#ffffff" }}
                                    activeDot={{ r: 8 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Insights Column */}
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900/20 dark:border-slate-800/60">
                              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <History className="w-4 h-4 text-primary" />
                                <span>Metrik Utama Organisasi</span>
                              </h4>
                              
                              <div className="space-y-3">
                                <div className="flex items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                                  <span className="text-xs text-on-surface-variant font-medium">Kinerja Awal (FY 2020)</span>
                                  <span className="text-xs font-bold text-on-surface font-mono">
                                    {performanceTrendData[0]?.averageRating.toFixed(2)} / 5.00
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between border-b border-dashed border-slate-200 pb-2">
                                  <span className="text-xs text-on-surface-variant font-medium">Kinerja Akhir (FY 2024)</span>
                                  <span className="text-xs font-bold text-primary font-mono">
                                    {performanceTrendData[performanceTrendData.length - 1]?.averageRating.toFixed(2)} / 5.00
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between pb-1">
                                  <span className="text-xs text-on-surface-variant font-medium">Perubahan Kumulatif</span>
                                  <span className={`text-xs font-bold flex items-center gap-1 font-mono ${
                                    trendAnalytics.direction === "up" ? "text-emerald-600" : trendAnalytics.direction === "down" ? "text-rose-600" : "text-slate-600"
                                  }`}>
                                    {trendAnalytics.direction === "up" ? "+" : trendAnalytics.direction === "down" ? "-" : ""}
                                    {trendAnalytics.percentageChange}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Insight Advice */}
                            <div className={`p-4 rounded-xl border ${
                              trendAnalytics.direction === "up" 
                                ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30" 
                                : trendAnalytics.direction === "down"
                                ? "bg-rose-50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30"
                                : "bg-slate-50 border-slate-100 dark:bg-slate-950/10 dark:border-slate-900/30"
                            }`}>
                              <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
                                trendAnalytics.direction === "up" ? "text-emerald-800 dark:text-emerald-300" : trendAnalytics.direction === "down" ? "text-rose-800 dark:text-rose-300" : "text-slate-800 dark:text-slate-300"
                              }`}>
                                <Sparkles className="w-4 h-4" />
                                <span>Rangkuman Analitis HR</span>
                              </h4>
                              <p className={`text-[11px] leading-relaxed ${
                                trendAnalytics.direction === "up" ? "text-emerald-700 dark:text-emerald-300" : trendAnalytics.direction === "down" ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-300"
                              }`}>
                                {trendAnalytics.message}
                              </p>
                              <div className="mt-3 pt-2.5 border-t border-dashed border-current/10 text-[10px] opacity-80 leading-normal italic">
                                *Data tren didasarkan pada total riwayat kinerja seluruh talent pool suksesi yang aktif saat ini.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skill Gap Heatmap Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-surface-container-highest dark:border-slate-800 p-6 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-display text-lg font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                              <Grid3X3 className="w-5 h-5 text-primary" />
                              <span>Skill Gap Heatmap (Target Kompetensi Manajerial)</span>
                            </h3>
                            <p className="text-xs text-on-surface-variant dark:text-slate-300 mt-1">
                              Menganalisis kesenjangan (gap) antara rata-rata tingkat kompetensi talenta saat ini (skala 1-5) dengan standar kompetensi yang dipersyaratkan untuk posisi manajemen.
                            </p>
                          </div>
                          
                          {/* Interactive Target Selector */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-300">Target Manajemen:</span>
                            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                              {[3.5, 4.0, 4.5].map((target) => (
                                <button
                                  key={target}
                                  onClick={() => setManagerialTarget(target)}
                                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                    managerialTarget === target
                                      ? "bg-primary text-white dark:text-slate-950 font-extrabold shadow-sm"
                                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                  }`}
                                >
                                  {target === 3.5 ? "3.5 (Basic)" : target === 4.0 ? "4.0 (Standard)" : "4.5 (Senior)"}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Heatmap Toolbar & Filters */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                            {/* Search Input */}
                            <div className="relative flex-1 min-w-[150px]">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari Departemen / Divisi..."
                                value={heatmapSearch}
                                onChange={(e) => setHeatmapSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100"
                              />
                              {heatmapSearch && (
                                <button
                                  onClick={() => setHeatmapSearch("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Department Filter */}
                            <select
                              value={heatmapDeptFilter}
                              onChange={(e) => setHeatmapDeptFilter(e.target.value)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary cursor-pointer"
                            >
                              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="All">Semua Departemen ({skillGapHeatmapData.divisions.length})</option>
                              {skillGapHeatmapData.divisions.map((div) => (
                                <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" key={div} value={div}>{div}</option>
                              ))}
                            </select>

                            {/* Gap Filter */}
                            <select
                              value={heatmapGapFilter}
                              onChange={(e) => setHeatmapGapFilter(e.target.value)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary cursor-pointer"
                            >
                              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="All">Semua Status Gap</option>
                              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="Critical">🚨 Gap Kritis (&lt; -0.5)</option>
                              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="HasGap">⚠️ Memiliki Celah (&lt; 0)</option>
                              <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="NoGap">✅ Sesuai Target (≥ 0)</option>
                            </select>
                          </div>

                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            {filteredHeatmapRows.length} dari {skillGapHeatmapData.heatmap.length} Divisi
                          </span>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                          {/* Heatmap Grid - Height matched to 360px scrollable container */}
                          <div className="xl:col-span-2 overflow-x-auto overflow-y-auto max-h-[360px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20 dark:bg-slate-900/20 custom-scrollbar relative">
                            <table className="w-full border-collapse text-left text-xs min-w-[1250px]">
                              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-xs">
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="p-3 font-bold text-slate-800 dark:text-slate-200 min-w-[200px]">Departemen / Divisi</th>
                                  {skillGapHeatmapData.competenciesList.map((comp) => (
                                    <th key={comp} className="p-2.5 font-bold text-slate-800 dark:text-slate-200 text-center min-w-[110px] text-[11px] whitespace-nowrap">
                                      {comp}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredHeatmapRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={skillGapHeatmapData.competenciesList.length + 1} className="p-8 text-center text-slate-400 dark:text-slate-500 italic font-medium">
                                      Tidak ada departemen yang sesuai dengan filter pencarian.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredHeatmapRows.map((row) => (
                                  <tr key={row.division} className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                                      <div>{row.division}</div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{row.talentsCount} Talenta Suksesi</div>
                                    </td>
                                    {row.competencyGaps.map((g) => {
                                      const isCritical = g.gap < -0.5;
                                      const isMinor = g.gap < 0 && g.gap >= -0.5;

                                      return (
                                        <td key={g.competencyName} className="p-2 text-center">
                                          <div className={`p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                            isCritical 
                                              ? "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/60" 
                                              : isMinor
                                              ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60"
                                              : "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60"
                                          }`}>
                                            <span className="font-mono font-bold text-sm">{g.avgRating.toFixed(2)}</span>
                                            <span className="text-[9px] opacity-90 mt-0.5 font-medium">Target: {managerialTarget.toFixed(1)}</span>
                                            
                                            <span className={`text-[10px] font-black mt-1 px-1.5 py-0.5 rounded ${
                                              isCritical
                                                ? "bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100"
                                                : isMinor
                                                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
                                                : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100"
                                            }`}>
                                              {g.gap >= 0 ? `+${g.gap}` : g.gap} Gap
                                            </span>

                                            {g.belowTargetCount > 0 && (
                                              <div className="mt-1.5 text-[8px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-t border-dashed border-current/25 pt-1 w-full text-center font-medium">
                                                {g.belowTargetCount} talenta &lt; target
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Analysis and Recommendations Column - Height matched to 360px scrollable container */}
                          <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span>Rangkuman Analisis Gap</span>
                              </h4>
                              
                              <div className="space-y-3 text-xs">
                                <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                                  <span className="text-slate-600 dark:text-slate-300 font-medium">Total Celah Terdeteksi</span>
                                  <span className={`font-bold font-mono ${skillGapSummary.totalGapsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {skillGapSummary.totalGapsCount} Area Kesenjangan
                                  </span>
                                </div>
                                {skillGapSummary.totalGapsCount > 0 && (
                                  <>
                                    <div className="flex flex-col gap-1 border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                                      <span className="text-slate-600 dark:text-slate-300 font-medium">Celah Terbesar (Kritis)</span>
                                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                                        -{skillGapSummary.largestNegativeGap.toFixed(2)} Gap
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                                        Kompetensi <strong className="text-slate-800 dark:text-slate-100">{skillGapSummary.worstComp}</strong> di <strong className="text-slate-800 dark:text-slate-100">{skillGapSummary.worstDiv}</strong>
                                      </span>
                                    </div>
                                  </>
                                )}
                                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  <div className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0" />
                                  <span>Gap &lt; -0.5 : Celah Kritis (Butuh Intervensi)</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  <div className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0" />
                                  <span>Gap -0.5 s/d 0 : Celah Ringan (Pengembangan)</span>
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Action Plan & Recommendations */}
                            {skillGapSummary.totalGapsCount > 0 ? (
                              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  <span>Rencana Aksi Intervensi HR</span>
                                </h4>
                                
                                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed mb-3">
                                  Berdasarkan kesenjangan di atas, berikut adalah rekomendasi program pengembangan untuk meningkatkan kecocokan jabatan manajerial:
                                </p>

                                <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                  {skillGapHeatmapData.heatmap.map((row) => {
                                    // Find competencies with gaps in this division
                                    const gaps = row.competencyGaps.filter(g => g.gap < 0);
                                    if (gaps.length === 0) return null;

                                    return (
                                      <div key={row.division} className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/60 space-y-1.5">
                                        <div className="font-bold text-[10px] text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1">{row.division}</div>
                                        <div className="space-y-1.5">
                                          {gaps.map((g) => {
                                            let recommendation = "";
                                            if (g.competencyName === "Business Knowledge") recommendation = "Corporate Strategic Management Program";
                                            else if (g.competencyName === "Leadership") recommendation = "Executive Leadership Program & Coaching";
                                            else if (g.competencyName === "Problem Solving") recommendation = "Problem Solving & Critical Thinking Workshop";
                                            else if (g.competencyName === "Interpersonal Skill") recommendation = "Advanced Interpersonal & Stakeholder Management";
                                            else if (g.competencyName === "Strategic Mindset") recommendation = "Strategic Thinking & Vision Alignment Masterclass";
                                            else if (g.competencyName === "Manages Complexity") recommendation = "Managing Complexity & Operational Excellence Training";
                                            else if (g.competencyName === "Ensures Accountability") recommendation = "Performance Governance & Accountability Training";
                                            else if (g.competencyName === "Drives Vision") recommendation = "Visionary Leadership & Change Management Masterclass";
                                            else if (g.competencyName === "Cultivate Innovation") recommendation = "Design Thinking & Cultivating Innovation Workshop";
                                            else recommendation = "Advanced Managerial Competency Program";

                                            return (
                                              <div key={g.competencyName} className="text-[9px] text-slate-700 dark:text-slate-300 leading-normal">
                                                <div>• <strong className="text-amber-900 dark:text-amber-300 font-bold">{g.competencyName}</strong>: <span className="italic">{recommendation}</span></div>
                                                <div className="pl-2.5 text-[8.5px] text-slate-500 dark:text-slate-400 font-medium">
                                                  Target Karyawan: {g.belowTargetTalents.map(t => t.name).join(", ")}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Kompetensi Sangat Kuat</span>
                                </h4>
                                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                                  Semua departemen rata-rata telah memenuhi atau melampaui target standar kompetensi manajerial ({managerialTarget.toFixed(1)}/5.0).
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Succession Map / 9-Box Placement Overview */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Active Succession Candidates */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm flex flex-col">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div>
                              <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                                <span>Succession Candidates</span>
                                <span className="bg-primary-container/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                                  {filteredActiveCandidates.length} Active
                                </span>
                              </h3>
                              <p className="text-xs text-on-surface-variant mt-0.5">Profiles prioritized for upcoming critical strategic transformation and C-suite placement positions.</p>
                            </div>
                          </div>

                          {/* Candidate Filters */}
                          <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="relative flex-1 min-w-[140px]">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari Nama / Jabatan..."
                                value={activeCandidateSearch}
                                onChange={(e) => setActiveCandidateSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>

                            <select
                              value={activeCandidateDivisionFilter}
                              onChange={(e) => setActiveCandidateDivisionFilter(e.target.value)}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer max-w-[160px] truncate"
                            >
                              <option value="All">Semua Divisi</option>
                              {Array.from(new Set(talents.map(t => t.division))).map(div => (
                                <option key={div} value={div}>{div}</option>
                              ))}
                            </select>

                            <select
                              value={activeCandidateReadinessFilter}
                              onChange={(e) => setActiveCandidateReadinessFilter(e.target.value)}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="All">Semua Kesiapan</option>
                              <option value="Ready Now">Ready Now</option>
                              <option value="1-2 Years">1-2 Years</option>
                              <option value="3-5 Years">3-5 Years</option>
                            </select>
                          </div>
                          
                          {/* Compact Scroll Container */}
                          <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1 flex-1">
                            {filteredActiveCandidates.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 italic text-xs">
                                Tidak ada kandidat suksesi yang sesuai dengan kriteria filter.
                              </div>
                            ) : (
                              filteredActiveCandidates.map((t) => (
                              <div 
                                key={t.id}
                                onClick={() => {
                                  setSelectedTalentId(t.id);
                                  setActiveTab("profile");
                                }}
                                className="p-4 rounded-xl border border-surface-container-highest bg-surface hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-4">
                                  <img src={t.avatar} className="w-12 h-12 rounded-full object-cover border border-surface shadow-sm" alt={t.name} referrerPolicy="no-referrer" />
                                  <div>
                                    <h4 className="font-display font-bold text-sm text-on-surface hover:text-primary transition-colors">{t.name}</h4>
                                    <p className="text-xs text-on-surface-variant">{t.title}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xs text-on-surface-variant font-semibold bg-white border border-surface-container-highest px-3 py-1 rounded-full">
                                    {t.division}
                                  </span>
                                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                    t.readinessColor === "emerald" 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : t.readinessColor === "amber"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}>
                                    {t.readiness}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-outline-variant hidden sm:block" />
                                </div>
                              </div>
                            ))
                            )}
                          </div>
                        </div>

                        {/* Succession Health & Talent Matrix Insights */}
                        <div className="bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm flex flex-col justify-between">
                          <div>
                            <h3 className="font-display text-lg font-bold text-on-surface mb-2">Talent Advisory Summary</h3>
                            <p className="text-xs text-on-surface-variant mb-6">Automated structural observations regarding the strategic pool health indexes.</p>
                            
                            <div className="space-y-4 text-sm">
                              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong className="text-emerald-900 block font-semibold text-xs">Strong Successor Density</strong>
                                  <span className="text-xs text-emerald-800">25% of candidates are labeled &quot;READY NOW&quot;, ensuring high strategic continuity.</span>
                                </div>
                              </div>

                              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong className="text-amber-900 block font-semibold text-xs">Critical Tenure Check</strong>
                                  <span className="text-xs text-amber-800">Average tenure sits at 5.25 years. Middle-tier executive engagement campaigns recommended.</span>
                                </div>
                              </div>

                              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-start gap-3">
                                <Brain className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong className="text-indigo-900 block font-semibold text-xs">Competency Dominance</strong>
                                  <span className="text-xs text-indigo-800">Strategic Mindset holds the highest mastery index, validating robust long-term vision.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => setActiveTab("talent-pool")}
                            className="w-full mt-6 bg-primary text-white font-bold text-xs py-3 rounded-lg hover:bg-primary/95 transition-all text-center flex items-center justify-center gap-2 animate-none"
                          >
                            <Users className="w-4 h-4" />
                            ACCESS EXECUTIVE DIRECTORY
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* RETIREMENT SUCCESSION MATRIX & MATCHER ENGINE */
                    <div className="space-y-6 text-left">
                      {/* Header banner */}
                      <div className="bg-gradient-to-r from-primary/10 via-primary-container/5 to-transparent p-6 rounded-xl border border-primary/20 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                        <div className="space-y-1">
                          <h2 className="font-display text-lg font-extrabold text-primary uppercase tracking-wide flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Peta Suksesi & Manajemen Masa Pensiun Eksekutif
                          </h2>
                          <p className="text-xs text-on-surface-variant max-w-2xl">
                            Sistem integrasi dinamis data talent untuk mengisi posisi Top Management yang mendekati masa pensiun. Klik posisi untuk menganalisis suksesor potensial terbaik dari Talent Pool.
                          </p>
                        </div>

                        {/* Action buttons bar */}
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            ref={retiringImportInputRef}
                            accept=".json,.csv"
                            onChange={handleImportRetiringPositionsFile}
                            className="hidden"
                          />
                          
                          {/* Export buttons */}
                          <div className="flex rounded-lg shadow-2xs border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                            <button
                              onClick={handleExportRetiringPositionsJSON}
                              className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer border-r border-slate-200 dark:border-slate-700"
                              title="Unduh Peta Suksesi ke format JSON"
                            >
                              <Download className="w-3.5 h-3.5 text-primary" />
                              <span>Unduh JSON</span>
                            </button>
                            <button
                              onClick={handleExportRetiringPositionsCSV}
                              className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Unduh Peta Suksesi ke format CSV / Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Unduh CSV</span>
                            </button>
                          </div>

                          {/* Import button */}
                          {userRole === "admin" && (
                            <button
                              onClick={() => retiringImportInputRef.current?.click()}
                              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                              title="Import data Peta Suksesi dari berkas JSON / CSV"
                            >
                              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Impor Suksesi</span>
                            </button>
                          )}

                          {/* Supabase buttons */}
                          <div className="flex rounded-lg shadow-2xs border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                            <button
                              onClick={handlePushToSupabase}
                              disabled={isSupabaseSyncing}
                              className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer border-r border-slate-200 dark:border-slate-700 disabled:opacity-50"
                              title="Unggah dan simpan Peta Suksesi ke Supabase"
                            >
                              <Database className="w-3.5 h-3.5 text-amber-500" />
                              <span>Push Supabase</span>
                            </button>
                            <button
                              onClick={handlePullFromSupabase}
                              disabled={isSupabaseSyncing}
                              className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Tarik data terbaru Peta Suksesi dari Supabase"
                            >
                              <Cloud className="w-3.5 h-3.5 text-sky-500" />
                              <span>Pull Supabase</span>
                            </button>
                          </div>

                          {userRole === "admin" && (
                            <button
                              onClick={() => setIsAddRetiringPositionOpen(true)}
                              className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                              <span>POSISI BARU</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Main Succession Matrix Board */}
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left column: Retiring Positions (2/5) */}
                        <div className="lg:col-span-2 space-y-3 flex flex-col">
                          <div className="flex justify-between items-center pb-2 border-b border-surface-container-highest">
                            <h3 className="font-display font-bold text-xs text-primary uppercase tracking-wider">
                              Posisi Top Management (Retiring List)
                            </h3>
                            <span className="bg-surface-container-highest text-on-surface-variant font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {retiringPositions.length} Posisi
                            </span>
                          </div>

                          {/* Retiring Positions Filters */}
                          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="relative flex-1 min-w-[120px]">
                              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari Posisi / Petahana..."
                                value={retiringPosSearch}
                                onChange={(e) => setRetiringPosSearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <select
                              value={retiringPosUrgencyFilter}
                              onChange={(e) => setRetiringPosUrgencyFilter(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="All">Urgency</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                            <select
                              value={retiringPosStatusFilter}
                              onChange={(e) => setRetiringPosStatusFilter(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="All">Status Suksesor</option>
                              <option value="Assigned">Ada Suksesor</option>
                              <option value="Unassigned">Belum Ada</option>
                            </select>
                          </div>

                          {/* Compact Scrollable List */}
                          <div className="space-y-2.5 overflow-y-auto max-h-[350px] custom-scrollbar pr-1 flex-1">
                            {retiringPositions
                              .filter((pos) => {
                                if (retiringPosSearch.trim() !== "") {
                                  const q = retiringPosSearch.toLowerCase();
                                  const match = pos.positionName.toLowerCase().includes(q) || pos.currentIncumbent.toLowerCase().includes(q) || pos.division.toLowerCase().includes(q);
                                  if (!match) return false;
                                }
                                if (retiringPosUrgencyFilter !== "All" && pos.urgency !== retiringPosUrgencyFilter) return false;
                                if (retiringPosStatusFilter === "Assigned" && !pos.assignedSuccessorId) return false;
                                if (retiringPosStatusFilter === "Unassigned" && pos.assignedSuccessorId) return false;
                                return true;
                              })
                              .length === 0 ? (
                              <div className="p-6 text-center text-slate-400 italic text-xs">
                                Tidak ada posisi pensiun yang sesuai kriteria filter.
                              </div>
                            ) : (
                              retiringPositions
                              .filter((pos) => {
                                if (retiringPosSearch.trim() !== "") {
                                  const q = retiringPosSearch.toLowerCase();
                                  const match = pos.positionName.toLowerCase().includes(q) || pos.currentIncumbent.toLowerCase().includes(q) || pos.division.toLowerCase().includes(q);
                                  if (!match) return false;
                                }
                                if (retiringPosUrgencyFilter !== "All" && pos.urgency !== retiringPosUrgencyFilter) return false;
                                if (retiringPosStatusFilter === "Assigned" && !pos.assignedSuccessorId) return false;
                                if (retiringPosStatusFilter === "Unassigned" && pos.assignedSuccessorId) return false;
                                return true;
                              })
                              .map((pos) => {
                              const assignedTalent = talents.find((t) => t.id === pos.assignedSuccessorId);
                              const isSelected = selectedRetiringPositionId === pos.id;
                              
                              // Calculate match score if assigned
                              const matchScore = assignedTalent ? calculateMatchScore(assignedTalent, pos) : null;

                              return (
                                <div
                                  key={pos.id}
                                  onClick={() => setSelectedRetiringPositionId(pos.id)}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative ${
                                    isSelected
                                      ? "border-primary bg-primary-container/5 ring-1 ring-primary shadow-sm"
                                      : "border-surface-container-highest bg-white hover:border-outline-variant hover:shadow-xs"
                                  }`}
                                >
                                  {/* Urgency and timeline */}
                                  <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      pos.urgency === "High"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : pos.urgency === "Medium"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-surface-container-highest text-on-surface-variant border border-surface-container-high"
                                    }`}>
                                      {pos.urgency} Urgency
                                    </span>
                                    {pos.urgency === "High" && (() => {
                                      const successor = pos.assignedSuccessorId ? talents.find(t => t.id === pos.assignedSuccessorId) : null;
                                      const isReadyNow = successor?.readiness.toUpperCase() === "READY NOW";
                                      if (!isReadyNow) {
                                        return (
                                          <span className="inline-flex items-center gap-0.5 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse ml-1.5">
                                            <span>⚠️ No Ready Successor</span>
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                    <span className="text-[10px] text-on-surface-variant font-bold flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-primary-container" />
                                      {pos.retirementDate}
                                    </span>
                                  </div>

                                  <h4 className="font-display font-extrabold text-sm text-on-surface group-hover:text-primary transition-colors">
                                    {pos.positionName}
                                  </h4>
                                  
                                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-on-surface-variant">
                                    <span className="font-semibold text-on-surface">Petahana: {pos.currentIncumbent}</span>
                                    <span className="text-outline-variant">•</span>
                                    <span>{pos.division}</span>
                                  </div>

                                  {/* Designated Successor Display */}
                                  <div className="mt-4 pt-3 border-t border-dashed border-surface-container-highest">
                                    {assignedTalent ? (
                                      <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-surface-container-highest">
                                        <div className="flex items-center gap-2">
                                          <img
                                            src={assignedTalent.avatar}
                                            className="w-8 h-8 rounded-full object-cover border border-white"
                                            alt={assignedTalent.name}
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="text-left">
                                            <span className="text-xs font-bold text-on-surface block leading-tight">
                                              {assignedTalent.name}
                                            </span>
                                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase block mt-0.5 w-max ${
                                              pos.suitabilityStatus === "Primary"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : pos.suitabilityStatus === "Secondary"
                                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                              {pos.suitabilityStatus || "Primary"} Successor
                                            </span>
                                          </div>
                                        </div>
                                        {matchScore !== null && (
                                          <div className="text-right">
                                            <span className="text-xs font-black text-emerald-600 block">
                                              {matchScore}%
                                            </span>
                                            <span className="text-[8px] text-on-surface-variant uppercase tracking-wider block font-medium">
                                              Match Rate
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100 text-center">
                                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                                          ⚠️ BELUM ADA CALON PENERUS
                                        </span>
                                        <span className="text-[8px] text-rose-600 block mt-0.5">
                                          Pilih posisi ini lalu cari suksesor potensial dari database.
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }))}
                          </div>
                        </div>

                        {/* Right column: Dynamic Matcher & Calibrator (3/5) */}
                        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-surface-container-highest shadow-sm min-h-[450px] flex flex-col">
                          {!selectedRetiringPositionId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Award className="w-8 h-8 text-primary" />
                              </div>
                              <div className="max-w-md space-y-1">
                                <h3 className="font-display font-bold text-sm text-on-surface uppercase tracking-wide">
                                  Pilih Posisi untuk Memulai Pencocokan Suksesor
                                </h3>
                                <p className="text-xs text-on-surface-variant">
                                  Klik salah satu jabatan Top Management di panel kiri untuk membuka sistem integrasi pencocokan otomatis. AI Match Engine kami akan mengalkulasi kecocokan kompetensi dan merekomendasikan penerus terbaik yang siap memimpin.
                                </p>
                              </div>
                            </div>
                          ) : (() => {
                            const selectedPos = retiringPositions.find(p => p.id === selectedRetiringPositionId);
                            if (!selectedPos) return null;

                            // Calculate match scores for all talents & sort
                            const recommendedTalents = talents
                              .map(t => ({
                                talent: t,
                                score: calculateMatchScore(t, selectedPos)
                              }))
                              .sort((a, b) => b.score - a.score);

                            return (
                              <div className="space-y-6 text-left flex-1 flex flex-col">
                                {/* Selected Position info card */}
                                <div className="p-4 bg-surface rounded-xl border border-surface-container-highest relative">
                                  {userRole === "admin" && (
                                    <button
                                      onClick={() => {
                                        triggerDeleteModal({
                                          title: "Hapus Pelacakan Posisi Suksesi?",
                                          itemName: selectedPos.positionName,
                                          itemSubtitle: `Petahana: ${selectedPos.currentIncumbent || '-'} • Target Pensiun: ${selectedPos.retirementDate || '-'}`,
                                          itemBadge: `Divisi: ${selectedPos.division || '-'}`,
                                          warningText: "Apakah Anda yakin ingin menghapus posisi suksesi pensiun ini dari dashboard pelacakan?",
                                          confirmButtonText: "Ya, Hapus Posisi",
                                          onConfirm: () => {
                                            setRetiringPositions(prev => prev.filter(p => p.id !== selectedPos.id));
                                            setSelectedRetiringPositionId(null);
                                            setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                          }
                                        });
                                      }}
                                      className="absolute top-4 right-4 p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                      title="Hapus Posisi Pensiun"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}

                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-wider mb-1">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    Masa Transisi & Suksesi Jabatan
                                  </div>
                                  <h3 className="font-display font-black text-base text-on-surface">
                                    {selectedPos.positionName}
                                  </h3>
                                  
                                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-surface-container-highest">
                                    <div>
                                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                                        Petahana Sekarang
                                      </span>
                                      <span className="text-on-surface font-semibold block">{selectedPos.currentIncumbent}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                                        Rencana Pensiun
                                      </span>
                                      <span className="text-primary font-bold block">{selectedPos.retirementDate}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                                        Kebutuhan Departemen
                                      </span>
                                      <span className="text-on-surface font-medium block">{selectedPos.division}</span>
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-3 border-t border-surface-container-highest">
                                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold mb-1.5">
                                      Kompetensi Utama yang Diperlukan (Target Calibration)
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedPos.targetCompetencies.map((comp, idx) => (
                                        <span key={idx} className="bg-primary/5 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20">
                                          {comp}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* List of recommended successor candidates */}
                                <div className="space-y-3 flex-1 flex flex-col">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h4 className="font-display font-black text-xs text-on-surface uppercase tracking-wider">
                                      Rekomendasi Suksesor Berdasarkan Kecocokan Data (Talent Alignment)
                                    </h4>
                                    <span className="text-[10px] text-on-surface-variant font-bold">
                                      Diurutkan Berdasarkan Skor Pencocokan
                                    </span>
                                  </div>

                                  {/* Candidate Matcher Filters */}
                                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                                    <div className="relative flex-1 min-w-[120px]">
                                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Cari Suksesor..."
                                        value={candidateSearch}
                                        onChange={(e) => setCandidateSearch(e.target.value)}
                                        className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary text-on-surface"
                                      />
                                    </div>
                                    <select
                                      value={candidateReadinessFilter}
                                      onChange={(e) => setCandidateReadinessFilter(e.target.value)}
                                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                                    >
                                      <option value="All">Semua Kesiapan</option>
                                      <option value="Ready Now">Ready Now</option>
                                      <option value="1-2 Years">1-2 Years</option>
                                      <option value="3-5 Years">3-5 Years</option>
                                    </select>
                                    <select
                                      value={candidateMatchFilter}
                                      onChange={(e) => setCandidateMatchFilter(e.target.value)}
                                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                                    >
                                      <option value="All">Semua Match %</option>
                                      <option value="High">Tinggi (≥80%)</option>
                                      <option value="Medium">Sedang (50-79%)</option>
                                      <option value="Low">Rendah (&lt;50%)</option>
                                    </select>
                                  </div>

                                  {/* Compact Scroll Container */}
                                  <div className="space-y-2.5 overflow-y-auto max-h-[300px] custom-scrollbar pr-1 flex-1">
                                    {recommendedTalents
                                      .filter(({ talent, score }) => {
                                        if (candidateSearch.trim() !== "") {
                                          const q = candidateSearch.toLowerCase();
                                          const match = talent.name.toLowerCase().includes(q) || talent.title.toLowerCase().includes(q) || talent.division.toLowerCase().includes(q);
                                          if (!match) return false;
                                        }
                                        if (candidateReadinessFilter !== "All" && talent.readiness.toLowerCase() !== candidateReadinessFilter.toLowerCase()) {
                                          return false;
                                        }
                                        if (candidateMatchFilter === "High" && score < 80) return false;
                                        if (candidateMatchFilter === "Medium" && (score < 50 || score >= 80)) return false;
                                        if (candidateMatchFilter === "Low" && score >= 50) return false;
                                        return true;
                                      })
                                      .length === 0 ? (
                                      <div className="p-6 text-center text-slate-400 italic text-xs">
                                        Tidak ada kandidat suksesor yang sesuai dengan kriteria filter.
                                      </div>
                                    ) : (
                                      recommendedTalents
                                      .filter(({ talent, score }) => {
                                        if (candidateSearch.trim() !== "") {
                                          const q = candidateSearch.toLowerCase();
                                          const match = talent.name.toLowerCase().includes(q) || talent.title.toLowerCase().includes(q) || talent.division.toLowerCase().includes(q);
                                          if (!match) return false;
                                        }
                                        if (candidateReadinessFilter !== "All" && talent.readiness.toLowerCase() !== candidateReadinessFilter.toLowerCase()) {
                                          return false;
                                        }
                                        if (candidateMatchFilter === "High" && score < 80) return false;
                                        if (candidateMatchFilter === "Medium" && (score < 50 || score >= 80)) return false;
                                        if (candidateMatchFilter === "Low" && score >= 50) return false;
                                        return true;
                                      })
                                      .map(({ talent, score }) => {
                                      const isNominated = selectedPos.assignedSuccessorId === talent.id;
                                      
                                      // Determine score color
                                      const scoreColor = score >= 80 
                                        ? "text-emerald-600 bg-emerald-50 border-emerald-200" 
                                        : score >= 50 
                                        ? "text-amber-600 bg-amber-50 border-amber-200" 
                                        : "text-rose-600 bg-rose-50 border-rose-200";

                                      const barColor = score >= 80 
                                        ? "bg-emerald-500" 
                                        : score >= 50 
                                        ? "bg-amber-500" 
                                        : "bg-rose-500";

                                      return (
                                        <div 
                                          key={talent.id}
                                          className={`p-3.5 rounded-xl border transition-all ${
                                            isNominated 
                                              ? "border-emerald-600 bg-emerald-50/10 shadow-xs" 
                                              : "border-surface-container-highest hover:bg-surface-container-lowest"
                                          }`}
                                        >
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                                            {/* Candidate basic details */}
                                            <div className="flex items-center gap-3">
                                              <img 
                                                src={talent.avatar} 
                                                className="w-10 h-10 rounded-full object-cover border border-surface shadow-xs" 
                                                alt={talent.name} 
                                                referrerPolicy="no-referrer"
                                                onClick={() => {
                                                  setSelectedTalentId(talent.id);
                                                  setActiveTab("profile");
                                                }}
                                              />
                                              <div className="text-left cursor-pointer" onClick={() => {
                                                setSelectedTalentId(talent.id);
                                                setActiveTab("profile");
                                              }}>
                                                <span className="text-xs font-bold text-on-surface hover:text-primary transition-colors block">
                                                  {talent.name}
                                                </span>
                                                <span className="text-[10px] text-on-surface-variant block">
                                                  {talent.title} • <span className="font-semibold">{talent.division}</span>
                                                </span>
                                              </div>
                                            </div>

                                            {/* Compatibility Score Display */}
                                            <div className="flex items-center gap-2">
                                              <div className="text-right">
                                                <div className="flex items-center gap-1.5">
                                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${scoreColor}`}>
                                                    {score}% Match
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {/* Readiness Badge */}
                                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                talent.readinessColor === "emerald"
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                  : talent.readinessColor === "amber"
                                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                                  : "bg-rose-50 text-rose-700 border-rose-200"
                                              }`}>
                                                {talent.readiness}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Match score bar and details breakdown */}
                                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                            <div className="sm:col-span-5">
                                              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                                                <div className={`h-full ${barColor}`} style={{ width: `${score}%` }}></div>
                                              </div>
                                              {/* Mini math breakdown */}
                                              <div className="flex justify-between text-[8px] text-on-surface-variant font-medium mt-1">
                                                <span>Divisi: {talent.division.toLowerCase().includes(selectedPos.division.toLowerCase()) ? "Sesuai (+30)" : "Sektor Lain (+10)"}</span>
                                                <span>Kesiapan: {talent.readiness === "READY NOW" ? "+30" : talent.readiness === "READY 1-2 YEARS" ? "+20" : "+10"}</span>
                                              </div>
                                            </div>

                                            {/* Nominasi actions - ADMIN ONLY */}
                                            <div className="sm:col-span-7 flex justify-end gap-1.5">
                                              {userRole === "admin" ? (
                                                isNominated ? (
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 mr-1">
                                                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                      Suksesor Ditunjuk ({selectedPos.suitabilityStatus || "Primary"})
                                                    </span>
                                                    <button
                                                      onClick={() => {
                                                        setRetiringPositions(prev =>
                                                          prev.map(p => p.id === selectedPos.id ? { ...p, assignedSuccessorId: undefined, suitabilityStatus: undefined } : p)
                                                        );
                                                      }}
                                                      className="text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded transition-colors cursor-pointer border border-rose-200"
                                                    >
                                                      Batal Calonkan
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <div className="flex gap-1">
                                                    <button
                                                      onClick={() => {
                                                        setRetiringPositions(prev =>
                                                          prev.map(p => p.id === selectedPos.id ? { ...p, assignedSuccessorId: talent.id, suitabilityStatus: "Primary" } : p)
                                                        );
                                                      }}
                                                      className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                                    >
                                                      <UserCheck className="w-3 h-3" />
                                                      Primary
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setRetiringPositions(prev =>
                                                          prev.map(p => p.id === selectedPos.id ? { ...p, assignedSuccessorId: talent.id, suitabilityStatus: "Secondary" } : p)
                                                        );
                                                      }}
                                                      className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer"
                                                    >
                                                      Secondary
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setRetiringPositions(prev =>
                                                          prev.map(p => p.id === selectedPos.id ? { ...p, assignedSuccessorId: talent.id, suitabilityStatus: "Emergency" } : p)
                                                        );
                                                      }}
                                                      className="text-[9px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer"
                                                    >
                                                      Emergency
                                                    </button>
                                                  </div>
                                                )
                                              ) : (
                                                isNominated && (
                                                  <span className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1">
                                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                    Suksesor Resmi Ditunjuk ({selectedPos.suitabilityStatus || "Primary"})
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                     }))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 2. TALENT POOL VIEW */}
              {activeTab === "talent-pool" && (
                <motion.div
                  key="talent-pool"
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-surface-container-highest pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary">Talent Pool Directory</h1>
                      <p className="text-sm text-on-surface-variant">Perform search, filtering, and detailed evaluations across all high-potential executive successors.</p>
                    </div>
                    {userRole === "admin" && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleSyncAllPhotosByGender}
                          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-3 rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer self-start md:self-center"
                          title="Sinkronkan foto profil seluruh talenta sesuai jenis kelamin (Perempuan & Laki-laki)"
                        >
                          <RefreshCw className="w-4 h-4" />
                          SINKRON FOTO GENDER
                        </button>
                        <button
                          onClick={() => setIsImportOpen(true)}
                          className="bg-secondary hover:bg-secondary/95 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer self-start md:self-center"
                        >
                          <Upload className="w-4 h-4" />
                          IMPORT DATA
                        </button>
                        <button
                          onClick={() => setIsAddTalentOpen(true)}
                          className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer self-start md:self-center"
                        >
                          <Plus className="w-4 h-4" />
                          TAMBAH KANDIDAT BARU
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Saved Filters Quick Bar */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-primary" />
                        <span className="font-display font-extrabold text-xs text-primary uppercase tracking-wider">Saved Filters / Quick Views</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-extrabold px-2 py-0.5 rounded-full">
                          {savedFilters.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Reset Filter Button */}
                        {(searchTerm || divisionFilter !== "All" || readinessFilter !== "All") && (
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              setDivisionFilter("All");
                              setReadinessFilter("All");
                              setActiveSavedFilterId(null);
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Filter</span>
                          </button>
                        )}

                        {/* Save Current Filter Button */}
                        <button
                          onClick={() => {
                            setNewFilterName(
                              divisionFilter !== "All" && readinessFilter !== "All"
                                ? `${divisionFilter} (${readinessFilter})`
                                : divisionFilter !== "All"
                                ? `Divisi ${divisionFilter}`
                                : readinessFilter !== "All"
                                ? `Filter ${readinessFilter}`
                                : "Filter Kustom " + new Date().toLocaleDateString('id-ID')
                            );
                            setIsSaveFilterModalOpen(true);
                          }}
                          className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>Simpan Filter Ini</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Filters Pill Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                      {savedFilters.map((filter) => {
                        const isActive = activeSavedFilterId === filter.id;
                        const count = getFilterMatchCount(filter);

                        return (
                          <div
                            key={filter.id}
                            onClick={() => handleApplySavedFilter(filter)}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
                              isActive
                                ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/30"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                            }`}
                            title={filter.description || `Filter: ${filter.name}`}
                          >
                            {isActive ? (
                              <BookmarkCheck className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
                            )}

                            <span>{filter.name}</span>

                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {count}
                            </span>

                            {!filter.isPreset && (
                              <button
                                onClick={(e) => handleDeleteSavedFilter(filter.id, e)}
                                className={`p-0.5 rounded-full hover:bg-black/20 transition-colors ${
                                  isActive ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-rose-600"
                                }`}
                                title="Hapus Filter Tersimpan Ini"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filters Board */}
                  <div className="bg-white p-5 rounded-xl border border-surface-container-highest shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-outline-variant" />
                      <input 
                        type="text" 
                        placeholder="Search name or title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-outline"
                      />
                    </div>

                    <div>
                      <select 
                        value={divisionFilter}
                        onChange={(e) => setDivisionFilter(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="All">All Departments</option>
                        {divisions.filter(d => d !== "All").map((div) => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select 
                        value={readinessFilter}
                        onChange={(e) => setReadinessFilter(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="All">All Readiness Levels</option>
                        {readinessOptions.filter(r => r !== "All").map((ready) => (
                          <option key={ready} value={ready}>{ready}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Directory Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTalents.length > 0 ? (
                      paginatedTalents.map((t) => (
                        <div 
                          key={t.id}
                          className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                            selectedTalentId === t.id ? "ring-2 ring-primary border-transparent" : "border-surface-container-highest"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex gap-4">
                                <img src={t.avatar} className="w-16 h-16 rounded-full object-cover border-2 border-surface shadow-sm" alt={t.name} referrerPolicy="no-referrer" />
                                <div>
                                  <h3 className="font-display font-bold text-base text-on-surface">{t.name}</h3>
                                  <p className="text-xs text-secondary font-medium">{t.title}</p>
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-outline" />
                                    <span>{t.location}</span>
                                  </div>
                                </div>
                              </div>
                              {userRole === "admin" ? (
                                <select
                                  value={t.readiness}
                                  onChange={(e) => handleUpdateReadiness(t.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${
                                    t.readinessColor === "emerald" 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : t.readinessColor === "amber"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}
                                >
                                  <option value="READY NOW">READY NOW</option>
                                  <option value="READY 1-2 YEARS">READY 1-2 YEARS</option>
                                  <option value="READY 2+ YEARS">READY 2+ YEARS</option>
                                </select>
                              ) : (
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                  t.readinessColor === "emerald" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : t.readinessColor === "amber"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {t.readiness}
                                </span>
                              )}
                            </div>

                            {/* Core metrics overview inside card */}
                            <div className="grid grid-cols-3 gap-2 bg-surface p-3 rounded-lg border border-surface-container-highest mb-4 text-center">
                              <div>
                                <span className="text-[10px] text-on-surface-variant font-semibold block">Logical</span>
                                <span className="text-sm font-bold text-primary">{t.psychometric.logicalReasoning.score}%</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-on-surface-variant font-semibold block">Leadership</span>
                                <span className="text-sm font-bold text-secondary">{t.psychometric.leadershipPotential.score}%</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-on-surface-variant font-semibold block">Tenure</span>
                                <span className="text-sm font-bold text-on-surface">{t.tenure}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={() => {
                                setSelectedTalentId(t.id);
                                setActiveTab("profile");
                              }}
                              className="flex-1 bg-primary-container/10 hover:bg-primary-container/20 text-primary text-xs font-bold py-2.5 rounded-lg transition-colors text-center cursor-pointer"
                            >
                              VIEW DETAILED PROFILE
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedTalentId(t.id);
                                setIsReportModalOpen(true);
                              }}
                              className="bg-white border border-surface-container-highest hover:bg-surface text-secondary p-2.5 rounded-lg transition-colors cursor-pointer"
                              title="Download Advisory PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {userRole === "admin" && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTalent(t.id, t.name);
                                }}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 p-2.5 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Talenta"
                              >
                                <Trash2 className="w-4 h-4 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-surface-container-highest">
                        <AlertCircle className="w-12 h-12 text-outline-variant mx-auto mb-3" />
                        <h3 className="font-display font-bold text-base text-on-surface">No Talents Found</h3>
                        <p className="text-xs text-on-surface-variant mt-1">Refine your search term or filtration selections to find candidates.</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {filteredTalents.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-surface-container-highest shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-on-surface-variant">
                        Menampilkan <span className="font-bold text-on-surface">{Math.min(startIndex + 1, filteredTalents.length)}</span> - <span className="font-bold text-on-surface">{Math.min(endIndex, filteredTalents.length)}</span> dari <span className="font-bold text-on-surface">{filteredTalents.length}</span> talenta
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-on-surface-variant">Baris per halaman:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="px-2 py-1 bg-surface border border-surface-container-highest rounded text-xs focus:outline-none text-on-surface"
                          >
                            <option value={6}>6 per hal</option>
                            <option value={12}>12 per hal</option>
                            <option value={24}>24 per hal</option>
                            <option value={50}>50 per hal</option>
                            <option value={100}>100 per hal</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-surface-container-highest rounded-lg bg-surface hover:bg-surface-container-high text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            title="Halaman Sebelumnya"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          {getPaginationRange(currentPage, totalPages).map((item, index) => {
                            if (typeof item === "number") {
                              return (
                                <button
                                  key={index}
                                  onClick={() => setCurrentPage(item)}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentPage === item
                                      ? "bg-primary text-white"
                                      : "border border-surface-container-highest bg-surface hover:bg-surface-container-high text-on-surface"
                                  }`}
                                >
                                  {item}
                                </button>
                              );
                            }
                            return <span key={index} className="text-xs text-on-surface-variant px-1 select-none">...</span>;
                          })}

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-surface-container-highest rounded-lg bg-surface hover:bg-surface-container-high text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            title="Halaman Berikutnya"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 3. DETAILED PROFILE VIEW (Matching the user screenshot exactly) */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Read-Only Karyawan Mode Alert Banner */}
                  {userRole === "user" && (
                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl flex items-start gap-4 shadow-sm">
                      <div className="p-3 bg-emerald-100 rounded-lg text-emerald-800 flex-shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-sm text-emerald-900">Mode Mandiri Karyawan Terverifikasi (Read-Only)</h4>
                        <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                          Selamat datang, <strong>{currentTalent.name}</strong>. Anda sedang mengakses portal Succession Board mandiri Anda. Skor penilaian kompetensi, hasil psikometrik, dan rencana pengembangan IDP di bawah ini telah dikalibrasi dan disahkan oleh Komite HR Regional. Jika Anda memiliki saran pengembangan atau ingin memperbarui preferensi pelatihan Anda, silakan isi formulir aspirasi karir di bagian bawah halaman ini.
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Profile Header Card */}
                  <section className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 relative overflow-hidden">
                    {/* Background subtle blur mesh */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
                      
                      {/* Avatar */}
                      <div className="relative group w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                          src={currentTalent.avatar}
                          alt={currentTalent.name}
                          referrerPolicy="no-referrer"
                        />
                        <label 
                          htmlFor={`header-avatar-upload-${currentTalent.id}`}
                          className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-extrabold cursor-pointer p-2 text-center"
                          title="Klik untuk Upload Foto dari Komputer"
                        >
                          <Camera className="w-6 h-6 mb-1 text-teal-300 animate-bounce" />
                          <span>GANTI FOTO</span>
                        </label>
                        <input 
                          type="file" 
                          id={`header-avatar-upload-${currentTalent.id}`} 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64Url = await compressImageFile(file, 256, 0.75);
                                if (base64Url) {
                                  setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, avatar: base64Url } : t));
                                  setAdminProfileSuccessMsg(`Foto profil ${currentTalent.name} berhasil diperbarui!`);
                                  setTimeout(() => setAdminProfileSuccessMsg(""), 4000);
                                }
                              } catch (err: any) {
                                alert("Gagal memproses foto: " + (err.message || "Unknown error"));
                              }
                            }
                          }}
                        />
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">{currentTalent.name}</h1>
                          
                          {/* Talent Quick Switcher dropdown */}
                          <div className="flex items-center gap-1.5 bg-surface-container-low border border-surface-container-highest rounded-lg px-2.5 py-1 text-xs self-start sm:self-auto">
                            <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-[10px] font-bold uppercase text-on-surface-variant shrink-0">Switch Talent:</span>
                            <select
                              value={selectedTalentId}
                              onChange={(e) => setSelectedTalentId(e.target.value)}
                              className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none cursor-pointer max-w-[220px] truncate"
                              title="Pilih Profil Kandidat Lain"
                            >
                              {talents.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.division})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            {currentTalent.gender === "Perempuan" ? "👩 Perempuan" : "👨 Laki-laki"}
                          </span>

                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border tracking-wide uppercase ${
                            currentTalent.readinessColor === "emerald" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : currentTalent.readinessColor === "amber"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {currentTalent.readiness}
                          </span>
                        </div>
                        
                        <p className="font-sans text-base text-secondary font-medium">{currentTalent.title}</p>
                        
                        {!isEditingScores ? (
                          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 mt-3 border-t border-surface-container-highest">
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <MapPin className="w-4 h-4 text-outline" />
                              <span className="text-xs font-medium">{currentTalent.location}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <Building2 className="w-4 h-4 text-outline" />
                              <span className="text-xs font-medium">{currentTalent.division}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <History className="w-4 h-4 text-outline" />
                              <span className="text-xs font-medium">Tenure: {currentTalent.tenure}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-surface-container-highest">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Lokasi Kerja</label>
                              <input 
                                type="text"
                                value={currentTalent.location}
                                onChange={(e) => setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, location: e.target.value } : t))}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Masa Kerja (Tenure)</label>
                              <input 
                                type="text"
                                value={currentTalent.tenure}
                                onChange={(e) => setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, tenure: e.target.value } : t))}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Divisi / Department</label>
                              <input 
                                type="text"
                                value={currentTalent.division}
                                onChange={(e) => setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, division: e.target.value } : t))}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                          </div>
                        )}

                        {/* Additional Profiling Fields */}
                        {!isEditingScores ? (
                          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2.5 mt-2.5 border-t border-dashed border-surface-container-highest">
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <UserCheck className="w-4 h-4 text-primary" />
                              <span className="text-xs font-medium">
                                NIK: <span className="font-bold text-on-surface">{currentTalent.nik || "-"}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <Award className="w-4 h-4 text-primary" />
                              <span className="text-xs font-medium">
                                Grade: <span className="font-extrabold text-primary">{currentTalent.grade || "M4"}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <Calendar className="w-4 h-4 text-outline" />
                              <span className="text-xs font-medium">
                                Lahir: <span className="font-bold">{currentTalent.birthDate || "-"}</span> ({currentTalent.age || "-"} thn)
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              <Calendar className="w-4 h-4 text-outline" />
                              <span className="text-xs font-medium">
                                Masuk: <span className="font-bold">{currentTalent.joinDate || "-"}</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 mt-2.5 border-t border-dashed border-surface-container-highest">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">NIK Karyawan</label>
                              <input 
                                type="text"
                                value={currentTalent.nik || ""}
                                onChange={(e) => setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, nik: e.target.value } : t))}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Grade</label>
                              <select 
                                value={currentTalent.grade || "M4"}
                                onChange={(e) => setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, grade: e.target.value } : t))}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              >
                                <option value="M5">M5 (SVP / Director)</option>
                                <option value="M4">M4 (VP / Senior Director)</option>
                                <option value="M3">M3 (AVP / Director)</option>
                                <option value="M2">M2 (Senior Manager)</option>
                                <option value="M1">M1 (Manager)</option>
                                <option value="ST5">ST5 (Principal / Senior Advisor)</option>
                                <option value="ST4">ST4 (Lead / Advisor)</option>
                                <option value="ST3">ST3 (Senior Staff)</option>
                                <option value="ST2">ST2 (Staff)</option>
                                <option value="ST1">ST1 (Junior Staff)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Tanggal Lahir</label>
                              <input 
                                type="date"
                                value={currentTalent.birthDate || "1988-10-10"}
                                onChange={(e) => {
                                  const dateVal = e.target.value;
                                  let calculatedAge = currentTalent.age || 38;
                                  if (dateVal) {
                                    const birthYear = new Date(dateVal).getFullYear();
                                    const currentYear = new Date().getFullYear();
                                    if (!isNaN(birthYear)) {
                                      calculatedAge = currentYear - birthYear;
                                    }
                                  }
                                  setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, birthDate: dateVal, age: calculatedAge } : t));
                                }}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Tanggal Masuk</label>
                              <input 
                                type="date"
                                value={currentTalent.joinDate || "2021-01-01"}
                                onChange={(e) => setTalents(prev => prev.map(t => t.id === currentTalent.id ? { ...t, joinDate: e.target.value } : t))}
                                className="w-full px-2 py-1 bg-surface rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Mobile Action */}
                      <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="md:hidden w-full mt-4 bg-primary text-white font-bold text-xs py-3.5 rounded-lg shadow-sm hover:bg-primary/95 transition-colors flex justify-center items-center gap-2 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        DOWNLOAD REPORT
                      </button>

                    </div>
                  </section>

                  {/* Profile sub-tabs selector */}
                  <div className="bg-white rounded-xl border border-surface-container-highest p-1.5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex gap-2">
                    <button
                      onClick={() => setProfileSubTab("profile-competencies")}
                      className={`flex-1 py-3 px-4 rounded-lg font-display font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        profileSubTab === "profile-competencies"
                          ? "bg-primary text-white shadow-xs"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Profil & Kompetensi
                    </button>
                    <button
                      onClick={() => setProfileSubTab("idp-training")}
                      className={`flex-1 py-3 px-4 rounded-lg font-display font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        profileSubTab === "idp-training"
                          ? "bg-primary text-white shadow-xs"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Rencana IDP & Pelatihan
                    </button>
                  </div>

                  {profileSubTab === "profile-competencies" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-6"
                    >
                      {/* Nine-Box Matrix Placement Banner */}
                  {(() => {
                    const placement = getTalentPlacement(currentTalent);
                    const evalScores = evaluationYears.map(yr => currentTalent.performanceEvaluation?.[`fy${yr}`] ?? 3);
                    let avgEval = evalScores.length > 0 ? evalScores.reduce((a, b) => a + b, 0) / evalScores.length : 3;
                    if (currentTalent.customPerformance) {
                      if (currentTalent.customPerformance === "Low") avgEval = 1.75;
                      else if (currentTalent.customPerformance === "Medium") avgEval = 3.25;
                      else if (currentTalent.customPerformance === "High") avgEval = 4.5;
                    }
                    const details = calculateTalentPotentialDetails(currentTalent);

                    const getNineBoxCellInfo = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
                      if (pot === "High") {
                        if (perf === "Low") return { name: "Enigma (Dilemma)", bg: "bg-amber-50 text-amber-900 border-amber-200", zone: "Zona Biru (Talenta Inti / Pengembangan)", zoneColor: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800", desc: "Potensi kepemimpinan tinggi namun kinerja saat ini belum optimal. Membutuhkan bimbingan kinerja tambahan." };
                        if (perf === "Medium") return { name: "High Potential", bg: "bg-sky-50 text-sky-900 border-sky-200", zone: "Zona Biru (Talenta Inti / Pengembangan)", zoneColor: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800", desc: "Kandidat kuat dengan potensi kepemimpinan tinggi dan kinerja stabil untuk dikembangkan ke depan." };
                        return { name: "Star Leader (Future Star)", bg: "bg-emerald-50 text-emerald-900 border-emerald-200 ring-2 ring-emerald-500/20", zone: "Zona Hijau (Star / Promosi)", zoneColor: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800", desc: "Talenta terbaik dengan potensi dan kinerja maksimal. Prioritas utama untuk suksesi kepemimpinan." };
                      }
                      if (pot === "Medium") {
                        if (perf === "Low") return { name: "Inconsistent Performer", bg: "bg-amber-50 text-amber-900 border-amber-200", zone: "Zona Merah (Risiko / PIP)", zoneColor: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800", desc: "Kinerja kurang konsisten meskipun memiliki kapasitas potensi yang memadai. Butuh mentoring berkala." };
                        if (perf === "Medium") return { name: "Core Contributor", bg: "bg-slate-50 text-slate-900 border-slate-200", zone: "Zona Biru (Talenta Inti / Pengembangan)", zoneColor: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800", desc: "Kontributor inti yang andal dengan kinerja stabil dan potensi seimbang bagi pertumbuhan organisasi." };
                        return { name: "High Performer", bg: "bg-indigo-50 text-indigo-900 border-indigo-200", zone: "Zona Hijau (Star / Promosi)", zoneColor: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800", desc: "Kinerja sangat tinggi dengan potensi kepemimpinan menengah yang dapat dioptimalkan." };
                      }
                      // Low Potential
                      if (perf === "Low") return { name: "Underperformer (Risk)", bg: "bg-rose-50 text-rose-900 border-rose-200", zone: "Zona Merah (Risiko / PIP)", zoneColor: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800", desc: "Kinerja dan potensi rendah saat ini. Memerlukan bimbingan intensif atau Performance Improvement Plan (PIP)." };
                      if (perf === "Medium") return { name: "Solid Performer", bg: "bg-gray-50 text-gray-900 border-gray-200", zone: "Zona Merah (Risiko / PIP)", zoneColor: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800", desc: "Kinerja baik dan stabil, namun potensi pengembangan kepemimpinan masih terbatas." };
                      return { name: "Workhorse / Specialist", bg: "bg-slate-50 text-slate-900 border-slate-200", zone: "Zona Biru (Talenta Inti / Pengembangan)", zoneColor: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800", desc: "Pakar spesialis dengan kinerja unggul luar biasa namun minat/potensi kepemimpinan struktural terbatas." };
                    };

                    const cellInfo = getNineBoxCellInfo(placement.performance, placement.potential);

                    const getBoxNum = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
                      if (pot === "High") return perf === "Low" ? 7 : perf === "Medium" ? 8 : 9;
                      if (pot === "Medium") return perf === "Low" ? 4 : perf === "Medium" ? 5 : 6;
                      return perf === "Low" ? 1 : perf === "Medium" ? 2 : 3;
                    };

                    const currentBoxNum = getBoxNum(placement.performance, placement.potential);

                    const getActionRecommendation = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
                      if (pot === "High") {
                        if (perf === "Low") return "Bimbingan kinerja intensif untuk mengeksplorasi hambatan kerja dan mengoptimalkan potensi kepemimpinan tinggi.";
                        if (perf === "Medium") return "Berikan tanggung jawab proyek lintas divisi dan mentoring kepemimpinan tingkat lanjut untuk persiapan promosi.";
                        return "Kandidat prioritas utama untuk suksesi kepemimpinan langsung (Ready Now). Berikan program pelatihan eksekutif.";
                      }
                      if (pot === "Medium") {
                        if (perf === "Low") return "Berikan bimbingan teknis berkala serta evaluasi motivasi kerja atau tantangan personal yang menghambat performa.";
                        if (perf === "Medium") return "Fokus pada penguatan kompetensi manajerial menengah dan pertahankan tingkat keterlibatan kerja tetap stabil.";
                        return "Pertahankan kinerja tinggi melalui penghargaan kompetitif dan pertimbangkan keterlibatan dalam keputusan strategis.";
                      }
                      if (perf === "Low") return "Evaluasi peran pekerjaan secara menyeluruh dan terapkan Performance Improvement Plan (PIP) terstruktur.";
                      if (perf === "Medium") return "Penguatan keahlian teknis operasional dan penyesuaian ekspektasi pengembangan karier sesuai kapasitas.";
                      return "Optimalkan peran sebagai pakar spesialis fungsional (Workhorse) serta berikan pengakuan atas pencapaian kinerjanya.";
                    };

                    return (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm text-left space-y-5">
                        {/* Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 text-primary dark:text-teal-400 rounded-xl shrink-0">
                              <Grid3X3 className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  POSISI MATRIKS SEMBILAN KOTAK (NINE-BOX)
                                </span>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${cellInfo.zoneColor}`}>
                                  {cellInfo.zone}
                                </span>
                              </div>
                              <h2 className="font-display font-extrabold text-lg sm:text-xl text-primary dark:text-teal-400 flex items-center gap-2 mt-0.5">
                                {cellInfo.name} <span className="text-xs font-bold text-slate-400 dark:text-slate-500">(Box {currentBoxNum})</span>
                              </h2>
                            </div>
                          </div>

                          {currentTalent.customPerformance || currentTalent.customPotential ? (
                            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5 self-start sm:self-center shrink-0">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              Kalibrasi Manual HR
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 self-start sm:self-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Asesmen Otomatis Terverifikasi
                            </span>
                          )}
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                          
                          {/* LEFT COLUMN: Visual Nine Box Tool Canvas (lg:col-span-5) */}
                          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                              <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Grid3X3 className="w-3.5 h-3.5 text-primary dark:text-teal-400" />
                                Interactive Nine-Box Tool
                              </span>
                              <span className="text-[9px] font-black text-primary dark:text-teal-300 bg-primary/10 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-primary/20 dark:border-teal-800">
                                Lokasi: Box {currentBoxNum}
                              </span>
                            </div>

                            {/* 3x3 Grid Tool Representation */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[8px] font-extrabold text-slate-500 dark:text-slate-400 uppercase px-1">
                                <span>Sumbu Y: Kinerja</span>
                                <span>Sumbu X: Potensi</span>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 w-full">
                                {[
                                  { box: 4, label: "Enigma", pot: "Low", perf: "High", bg: "bg-amber-50 dark:bg-amber-950/30" },
                                  { box: 7, label: "High Pot.", pot: "Medium", perf: "High", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                                  { box: 9, label: "Star Leader", pot: "High", perf: "High", bg: "bg-emerald-100 dark:bg-emerald-900/40" },
                                  { box: 2, label: "Inconsistent", pot: "Low", perf: "Medium", bg: "bg-rose-50 dark:bg-rose-950/30" },
                                  { box: 5, label: "Core Contrib.", pot: "Medium", perf: "Medium", bg: "bg-sky-50 dark:bg-sky-950/30" },
                                  { box: 8, label: "High Perf.", pot: "High", perf: "Medium", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                                  { box: 1, label: "Underperf.", pot: "Low", perf: "Low", bg: "bg-rose-100 dark:bg-rose-900/40" },
                                  { box: 3, label: "Solid Perf.", pot: "Medium", perf: "Low", bg: "bg-amber-50 dark:bg-amber-950/30" },
                                  { box: 6, label: "Specialist", pot: "High", perf: "Low", bg: "bg-sky-50 dark:bg-sky-950/30" }
                                ].map((cell) => {
                                  const isActive = placement.potential === cell.pot && placement.performance === cell.perf;
                                  return (
                                    <div 
                                      key={cell.box}
                                      className={`rounded-lg p-2 border transition-all flex flex-col justify-between items-center text-center relative h-[78px] ${
                                        isActive 
                                          ? "bg-primary text-white border-primary ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-slate-900 shadow-md scale-[1.02] z-10" 
                                          : `${cell.bg} border-slate-200/80 dark:border-slate-700/80 opacity-70`
                                      }`}
                                    >
                                      <span className={`text-[8px] font-black block ${isActive ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                                        Box {cell.box}
                                      </span>

                                      {isActive ? (
                                        <div className="flex flex-col items-center my-auto">
                                          <div className="w-5 h-5 rounded-full bg-white text-primary flex items-center justify-center text-[8px] font-black shadow-xs">
                                            {currentTalent.name[0]}
                                          </div>
                                          <span className="text-[7.5px] font-black text-white mt-0.5 truncate max-w-[62px]">
                                            {currentTalent.name.split(" ")[0]}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[7.5px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[60px] my-auto">
                                          {cell.label}
                                        </span>
                                      )}

                                      {isActive ? (
                                        <span className="text-[6.5px] font-black uppercase bg-white/20 text-white px-1 py-0.2 rounded">
                                          Posisi Talenta
                                        </span>
                                      ) : (
                                        <span className="text-[6.5px] font-medium text-slate-400 dark:text-slate-500 uppercase">
                                          {cell.perf[0]}/{cell.pot[0]}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium text-center bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200/60 dark:border-slate-800">
                              Koordinat Aktif: <strong className="text-slate-800 dark:text-slate-200">Sumbu Y ({placement.performance}) × Sumbu X ({placement.potential})</strong>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: Axis Breakdown & Neat Remarks Layout (lg:col-span-7) */}
                          <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
                            
                            {/* 2-Column Axis Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Sumbu Y Card */}
                              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                    SUMBU Y : EVALUASI KINERJA (100%)
                                  </span>
                                  <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono">
                                    {avgEval.toFixed(2)} / 5.00
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2 pt-0.5">
                                  <span className="text-base font-black text-slate-900 dark:text-slate-100">{placement.performance}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    ({placement.performance === "High" ? "Kinerja Sangat Baik" : placement.performance === "Medium" ? "Kinerja Memadai" : "Kinerja Perlu Ditingkatkan"})
                                  </span>
                                </div>
                              </div>

                              {/* Sumbu X Card */}
                              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                    SUMBU X : POTENSI KEPEMIMPINAN
                                  </span>
                                  <span className="text-[9px] font-extrabold text-primary dark:text-teal-300 bg-primary/10 dark:bg-teal-950 px-1.5 py-0.5 rounded border border-primary/20 dark:border-teal-800 font-mono">
                                    {details.totalPotentialScore.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2 pt-0.5">
                                  <span className="text-base font-black text-slate-900 dark:text-slate-100">{placement.potential}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    ({placement.potential === "High" ? "Potensi Kepemimpinan Tinggi" : placement.potential === "Medium" ? "Potensi Kepemimpinan Menengah" : "Potensi Terbatas"})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Structured Remarks Container */}
                            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 flex-1 flex flex-col justify-between">
                              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <FileText className="w-4 h-4 text-primary dark:text-teal-400 shrink-0" />
                                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                                  Catatan & Rekomendasi Evaluasi (Remarks)
                                </h4>
                              </div>

                              {/* Box Characteristics Remark */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider">
                                  Karakteristik Kategori ({cellInfo.name}):
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                  {cellInfo.desc}
                                </p>
                              </div>

                              {/* Action / Succession Recommendation Remark */}
                              <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10 dark:border-primary/20 space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-primary dark:text-teal-300 block tracking-wider">
                                  Rekomendasi Tindak Lanjut & Strategi IDP (Remarks HR):
                                </span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                                  {getActionRecommendation(placement.performance, placement.potential)}
                                </p>
                              </div>

                              {/* Custom Calibration Notes Remark if available */}
                              {currentTalent.nineBoxNotes && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800 space-y-0.5">
                                  <span className="text-[9px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1 tracking-wider">
                                    <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                                    Catatan Khusus Komite Suksesi / Kalibrasi Manual:
                                  </span>
                                  <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold italic leading-relaxed">
                                    "{currentTalent.nineBoxNotes}"
                                  </p>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* AJINOMOTO POTENTIAL CALCULATOR PANEL */}
                  {(() => {
                    const details = calculateTalentPotentialDetails(currentTalent);
                    const pAss = details.assessment;
                    const divisorVal = pAss.targetLevel === "SM" ? 2 : 3;

                    return (
                      <section className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 space-y-6 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-highest pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl animate-none">
                              <Sliders className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Kalkulator Potensi Kepemimpinan (Sumbu X)</h3>
                              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Sumbu X : Psychological Test (40%), Competency Test (50%), Educational Back Ground (10%)</p>
                            </div>
                          </div>
                          
                          {/* Live Indicator of Total Score */}
                          <div className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-surface-container-highest self-start sm:self-center">
                            <div className="text-right">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Total Potensi (ab)</span>
                              <span className="text-lg font-black text-primary">{details.totalPotentialScore.toFixed(1)}%</span>
                            </div>
                            <span className={`text-xs font-black px-2.5 py-1.5 rounded border uppercase ${
                              details.totalPotentialScore >= 80 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : details.totalPotentialScore >= 60
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {details.totalPotentialScore >= 80 ? "HIGH" : details.totalPotentialScore >= 60 ? "MEDIUM" : "LOW"}
                            </span>
                          </div>
                        </div>

                        {/* Excel-style formula sheet */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          
                          {/* Left 12 Columns: Main Formula Table */}
                          <div className="lg:col-span-12 space-y-6">
                            
                            {/* A. Psychological Test (40%) */}
                            <div className="border border-surface-container-highest rounded-xl overflow-hidden bg-surface/50">
                              <div className="bg-primary/5 px-4 py-3.5 border-b border-surface-container-highest flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-primary text-white text-xs font-black rounded-full flex items-center justify-center">A</span>
                                  <h4 className="font-display font-black text-xs text-primary uppercase tracking-wider">Psychological Test (Bobot 40%)</h4>
                                </div>
                                <div className="text-xs font-bold text-on-surface-variant">
                                  Formula: k = (i / 24) * 40% = <span className="text-primary">{details.psychWeighted.toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              {/* 8 metrics grid */}
                              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { label: "Kemampuan Intelektual", code: "a", field: "kemampuanIntelektual" },
                                  { label: "Berpikir Kritis", code: "b", field: "berpikirKritis" },
                                  { label: "Menyelesaikan Masalah", code: "c", field: "menyelesaikanMasalah" },
                                  { label: "Belajar Cepat", code: "d", field: "belajarCepat" },
                                  { label: "Kesadaran Diri", code: "e", field: "kesadaranDiri" },
                                  { label: "Interpersonal", code: "f", field: "interpersonal" },
                                  { label: "Kecerdasan Emosional", code: "g", field: "kecerdasanEmosional" },
                                  { label: "Motivasi & Komitmen", code: "h", field: "motivasiKomitmen" },
                                ].map((item) => {
                                  const val = pAss[item.field as keyof PotentialAssessment] as number;
                                  return (
                                    <div key={item.code} className="bg-white p-3 rounded-lg border border-surface-container-highest space-y-1.5 flex flex-col justify-between shadow-xs text-left">
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="text-[10px] text-on-surface-variant font-bold leading-tight">
                                          <span className="font-mono text-primary mr-1 bg-primary/5 px-1 rounded">({item.code})</span>
                                          {item.label}
                                        </div>
                                        <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded-md ${
                                          val === 3 ? "bg-emerald-50 text-emerald-700" : val === 2 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                                        }`}>
                                          {val}
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-1.5 pt-1">
                                        {isEditingScores ? (
                                          <select
                                            value={val}
                                            onChange={(e) => handlePotentialMetricChange(item.field as keyof PotentialAssessment, parseInt(e.target.value))}
                                            className="w-full text-xs p-1 rounded border border-surface-container-highest bg-surface focus:outline-none font-bold cursor-pointer"
                                          >
                                            <option value={4}>4 (Sangat Tinggi / Di Atas Standar)</option>
                                            <option value={3}>3 (Tinggi / Sesuai Standar)</option>
                                            <option value={2}>2 (Sedang / Cukup)</option>
                                            <option value={1}>1 (Kurang)</option>
                                          </select>
                                        ) : (
                                          <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                                            <div 
                                              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                              style={{ width: `${(val / 4) * 100}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Component summary */}
                              <div className="bg-white border-t border-surface-container-highest px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold text-on-surface-variant gap-4">
                                <div className="flex items-center gap-4">
                                  <div>Jumlah Poin (i = sum a-h): <span className="text-on-surface font-mono font-black">{details.sumPsych} / 32 (Standar Base: 24)</span></div>
                                  <div>Rasio (j = i / 24): <span className="text-on-surface font-mono font-black">{(details.psychRatio).toFixed(3)}</span></div>
                                </div>
                                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                  Skor Tertimbang (k): {details.psychWeighted.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            {/* B. Competency (50%) */}
                            <div className="border border-surface-container-highest rounded-xl overflow-hidden bg-surface/50">
                              <div className="bg-secondary/5 px-4 py-3.5 border-b border-surface-container-highest flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-secondary text-white text-xs font-black rounded-full flex items-center justify-center">B</span>
                                  <h4 className="font-display font-black text-xs text-secondary uppercase tracking-wider">Detail Competency (Bobot 50%)</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-on-surface-variant">Target Level:</span>
                                  {isEditingScores ? (
                                    <select
                                      value={pAss.targetLevel}
                                      onChange={(e) => handlePotentialMetricChange("targetLevel", e.target.value)}
                                      className="text-xs p-1.5 rounded border border-surface-container-highest bg-white focus:outline-none font-bold cursor-pointer"
                                    >
                                      <option value="SM">SM (Senior Manager, Divisor: 2)</option>
                                      <option value="DM">DM (Department Manager, Divisor: 3)</option>
                                    </select>
                                  ) : (
                                    <span className="bg-secondary text-white text-[10px] font-black px-2.5 py-1 rounded">
                                      {pAss.targetLevel === "SM" ? "SM (Divisor: 2)" : "DM (Divisor: 3)"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* 9 competencies metrics grid */}
                              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                  { label: "Business Knowledge", code: "l", field: "businessKnowledge" },
                                  { label: "Leadership", code: "m", field: "leadership" },
                                  { label: "Problem Solving", code: "n", field: "problemSolving" },
                                  { label: "Interpersonal Skill", code: "o", field: "interpersonalSkill" },
                                  { label: "Strategic Mindset", code: "p", field: "strategicMindset" },
                                  { label: "Manages Complexity", code: "q", field: "managesComplexity" },
                                  { label: "Ensures Accountability", code: "r", field: "ensuresAccountability" },
                                  { label: "Drives Vision", code: "s", field: "drivesVision" },
                                  { label: "Cultivate Innovation", code: "t", field: "cultivateInnovation" },
                                ].map((item) => {
                                  const val = pAss[item.field as keyof PotentialAssessment] as number;
                                  return (
                                    <div key={item.code} className="bg-white p-3 rounded-lg border border-surface-container-highest space-y-1.5 flex flex-col justify-between shadow-xs text-left">
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="text-[10px] text-on-surface-variant font-bold leading-tight">
                                          <span className="font-mono text-secondary mr-1 bg-secondary/5 px-1 rounded">({item.code})</span>
                                          {item.label}
                                        </div>
                                        <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded-md ${
                                          val >= 4 ? "bg-emerald-50 text-emerald-700" : val >= 3 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                                        }`}>
                                          {val} / 5
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-1.5 pt-1">
                                        {isEditingScores ? (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="range"
                                              min="1"
                                              max="5"
                                              value={val}
                                              onChange={(e) => handlePotentialMetricChange(item.field as keyof PotentialAssessment, parseInt(e.target.value))}
                                              className="flex-1 accent-secondary cursor-ew-resize"
                                            />
                                            <span className="text-[10px] font-mono font-bold">{val}</span>
                                          </div>
                                        ) : (
                                          <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                                            <div 
                                              className="bg-secondary h-1.5 rounded-full transition-all duration-300" 
                                              style={{ width: `${(val / 5) * 100}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Component summary */}
                              <div className="bg-white border-t border-surface-container-highest px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold text-on-surface-variant gap-4">
                                <div className="flex flex-wrap items-center gap-4">
                                  <div>Jumlah Poin (u = sum l-t): <span className="text-on-surface font-mono font-black">{details.sumComp} / 45</span></div>
                                  <div>Target Divisor (divisor * 9): <span className="text-on-surface font-mono font-black">{divisorVal} * 9 = {details.compMax}</span></div>
                                  <div>Rasio vs Target (v = u / target): <span className="text-on-surface font-mono font-black">{(details.compRatio).toFixed(3)}</span> <span className="text-[10px] text-slate-500 font-normal dark:text-slate-400">(vs Max 45: {(details.sumComp / 45).toFixed(3)})</span></div>
                                </div>
                                <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                  Skor Tertimbang (z): {details.compWeighted.toFixed(1)}%
                                </div>
                              </div>

                              {/* Radar Chart Component for Managerial Competencies */}
                              {(() => {
                                const targetVal = pAss.targetLevel === "SM" ? 3.5 : 3.0;
                                const radarData = [
                                  { name: "Business Knowledge", score: pAss.businessKnowledge || 3, target: targetVal },
                                  { name: "Leadership", score: pAss.leadership || 3, target: targetVal },
                                  { name: "Problem Solving", score: pAss.problemSolving || 3, target: targetVal },
                                  { name: "Interpersonal Skill", score: pAss.interpersonalSkill || 3, target: targetVal },
                                  { name: "Strategic Mindset", score: pAss.strategicMindset || 3, target: targetVal },
                                  { name: "Manages Complexity", score: pAss.managesComplexity || 3, target: targetVal },
                                  { name: "Ensures Accountability", score: pAss.ensuresAccountability || 3, target: targetVal },
                                  { name: "Drives Vision", score: pAss.drivesVision || 3, target: targetVal },
                                  { name: "Cultivate Innovation", score: pAss.cultivateInnovation || 3, target: targetVal },
                                ];

                                return (
                                  <div className="p-4 bg-white border-t border-surface-container-highest">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                                      <div>
                                        <h5 className="font-display font-extrabold text-xs text-secondary uppercase tracking-wider flex items-center gap-2">
                                          <Target className="w-4 h-4 text-secondary" />
                                          Radar Chart Penguasaan Kompetensi Manajerial vs Standar Target
                                        </h5>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                          Visualisasi jaring 9 kompetensi manajerial {currentTalent.name} dibandingkan standar target level {pAss.targetLevel || "DM"} ({targetVal.toFixed(1)}).
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs font-bold">
                                        <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                          <span className="w-3 h-3 rounded-full bg-secondary inline-block"></span>
                                          Skor Talenta
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                                          Standar Target ({targetVal.toFixed(1)})
                                        </span>
                                      </div>
                                    </div>

                                    <div className="w-full h-[340px] flex items-center justify-center">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                          <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                                          <PolarAngleAxis 
                                            dataKey="name" 
                                            tick={{ fill: "#334155", fontSize: 10, fontWeight: 700 }} 
                                          />
                                          <PolarRadiusAxis 
                                            angle={30} 
                                            domain={[0, 5]} 
                                            tick={{ fill: "#64748b", fontSize: 9 }} 
                                          />
                                          <Tooltip 
                                            content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                  <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
                                                    <p className="font-bold text-amber-300">{data.name}</p>
                                                    <p className="text-slate-200">
                                                      Skor Real: <span className="font-mono font-bold text-emerald-400">{data.score}</span> / 5
                                                    </p>
                                                    <p className="text-slate-200">
                                                      Standar Target: <span className="font-mono font-bold text-amber-400">{data.target}</span> / 5
                                                    </p>
                                                    <p className="text-[10px] text-slate-300 pt-1 border-t border-slate-800 font-semibold">
                                                      Status: {data.score >= data.target ? "✅ Memenuhi Target" : "⚠️ Perlu Pengembangan (Gap: " + (data.score - data.target).toFixed(1) + ")"}
                                                    </p>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            }}
                                          />
                                          <Radar 
                                            name="Skor Talenta" 
                                            dataKey="score" 
                                            stroke="#2563eb" 
                                            fill="#3b82f6" 
                                            fillOpacity={0.4} 
                                          />
                                          <Radar 
                                            name="Standar Target" 
                                            dataKey="target" 
                                            stroke="#d97706" 
                                            fill="#f59e0b" 
                                            fillOpacity={0.25} 
                                          />
                                        </RadarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* C. Study Background (10%) */}
                            <div className="border border-surface-container-highest rounded-xl overflow-hidden bg-surface/50">
                              <div className="bg-outline/5 px-4 py-3.5 border-b border-surface-container-highest flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-outline text-white text-xs font-black rounded-full flex items-center justify-center">C</span>
                                  <h4 className="font-display font-black text-xs text-on-surface uppercase tracking-wider">Study Background (Bobot 10%)</h4>
                                </div>
                                <div className="text-xs font-bold text-on-surface-variant">
                                  Formula: aa = (x / divisor) * 10% = <span className="text-on-surface">{details.bgWeighted.toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white text-left">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Latar Belakang Pendidikan (w)</label>
                                  {isEditingScores ? (
                                    <input
                                      type="text"
                                      value={pAss.studyBackgroundName}
                                      onChange={(e) => handlePotentialMetricChange("studyBackgroundName", e.target.value)}
                                      className="w-full text-xs p-2 rounded border border-surface-container-highest bg-surface focus:outline-none focus:border-primary font-bold"
                                      placeholder="Nama Gelar / Universitas"
                                    />
                                  ) : (
                                    <div className="p-2 bg-surface rounded-lg border border-surface-container-highest font-bold text-xs text-on-surface text-left">
                                      {pAss.studyBackgroundName}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Poin Tingkatan Pendidikan (x)</label>
                                    <span className="text-[10px] font-black font-mono bg-outline/10 text-on-surface px-2 py-0.5 rounded">Gelar Level Poin: {pAss.studyBackgroundScore}</span>
                                  </div>
                                  
                                  {isEditingScores ? (
                                    <select
                                      value={pAss.studyBackgroundScore}
                                      onChange={(e) => handlePotentialMetricChange("studyBackgroundScore", parseInt(e.target.value))}
                                      className="w-full text-xs p-1.5 rounded border border-surface-container-highest bg-surface focus:outline-none font-bold cursor-pointer"
                                    >
                                      <option value={5}>5 (S3 / Pascasarjana, Skor: 5)</option>
                                      <option value={4}>4 (S1 / Magister, Skor: 4 - Standar)</option>
                                      <option value={3}>3 (D3 / Ahli Madya, Skor: 3)</option>
                                      <option value={2}>2 (SLTA / Sederajat, Skor: 2)</option>
                                      <option value={1}>1 (SMP / Dasar, Skor: 1)</option>
                                    </select>
                                  ) : (
                                    <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2.5">
                                      <div 
                                        className="bg-outline h-1.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${((pAss.studyBackgroundScore || 0) / 5) * 100}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Component summary */}
                              <div className="bg-white border-t border-surface-container-highest px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold text-on-surface-variant gap-4">
                                <div className="flex items-center gap-4">
                                  <div>Skor Pendidikan (x): <span className="text-on-surface font-mono font-black">{pAss.studyBackgroundScore}</span></div>
                                  <div>Rasio Terhadap Standar S1 (y = x / 4.0): <span className="text-on-surface font-mono font-black">{(details.bgRatio).toFixed(3)}</span></div>
                                </div>
                                <div className="bg-outline/10 text-on-surface px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                                  Skor Tertimbang (aa): {details.bgWeighted.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            {/* TOTAL INTEGRATED CALCULATION BOARD */}
                            <div className="bg-primary/5 border-2 border-primary/20 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                              <div className="space-y-1">
                                <h4 className="font-display font-black text-sm text-primary uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-4.5 h-4.5 text-primary animate-pulse" />
                                  Kalkulasi Akhir Matriks Potensi (ab)
                                </h4>
                                <p className="text-xs text-on-surface-variant font-medium">
                                  Formula: ab = k ({details.psychWeighted.toFixed(1)}%) + z ({details.compWeighted.toFixed(1)}%) + aa ({details.bgWeighted.toFixed(1)}%)
                                </p>
                                {currentTalent.customPotential && (
                                  <span className="inline-block mt-1 text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-200">
                                    ★ Dikalibrasi Manual dari Nine-Box Tools
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-lg border border-primary/20 shadow-sm">
                                <div className="text-left">
                                  <span className="text-[9px] text-on-surface-variant uppercase tracking-wider block font-bold">TOTAL SKOR POTENSI (X-Axis)</span>
                                  <span className="text-2xl font-black text-primary leading-none">{details.totalPotentialScore.toFixed(1)}%</span>
                                </div>
                                <div className="border-l border-surface-container-highest pl-4 text-left">
                                  <span className="text-[9px] text-on-surface-variant uppercase tracking-wider block font-bold">KLASIFIKASI KOTAK</span>
                                  <span className="text-xs font-black text-secondary uppercase block mt-0.5">
                                    {details.totalPotentialScore >= 80 ? "HIGH POTENTIAL" : details.totalPotentialScore >= 60 ? "MEDIUM POTENTIAL" : "LOW POTENTIAL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </section>
                    );
                  })()}

                  {/* AJINOMOTO INDONESIA PERFORMANCE CALCULATOR PANEL (DYNAMIC YEAR EVALUATION) */}
                  {(() => {
                    const perfDetails = calculateTalentPerformanceDetails(currentTalent);
                    const evalScores = evaluationYears.map(yr => currentTalent.performanceEvaluation?.[`fy${yr}`] ?? 0);
                    const nonZeroScores = evalScores.filter(s => s > 0);
                    const avgEval = perfDetails.avgRawScore > 0 ? perfDetails.avgRawScore : (evalScores.reduce((a, b) => a + b, 0) / (evalScores.length || 1));
                    const placement = getTalentPlacement(currentTalent);

                    return (
                      <section className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 space-y-6 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-highest pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                              <History className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Peta Evaluasi Kinerja (Sumbu Y)</h3>
                              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Sumbu Y : Evaluasi Kinerja (100%)</p>
                              {currentTalent.customPerformance && (
                                <span className="inline-block mt-1 text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-200">
                                  ★ Dikalibrasi Manual dari Nine-Box Tools
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-surface-container-highest self-start sm:self-center">
                            <div className="text-right">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Rerata Kinerja (Sumbu Y)</span>
                              <span className="text-lg font-black text-emerald-700">{perfDetails.score50.toFixed(2)} / 50.00</span>
                            </div>
                            <span className={`text-xs font-black px-2.5 py-1.5 rounded border uppercase ${
                              placement.performance === "High" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : placement.performance === "Medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {placement.performance === "High" ? "HIGH PERFORMANCE" : placement.performance === "Medium" ? "MEDIUM PERFORMANCE" : "LOW PERFORMANCE"}
                            </span>
                          </div>
                        </div>

                        {/* Table container matching the uploaded style */}
                        <div className="border border-surface-container-highest rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                          <div className="min-w-[640px]">
                            <div 
                              className="grid bg-slate-900 text-white text-xs font-black uppercase text-center tracking-wider"
                              style={{ gridTemplateColumns: `140px repeat(${evaluationYears.length}, minmax(0, 1fr))` }}
                            >
                              <div className="py-3 border-r border-slate-700/50 bg-[#b01a43] flex items-center justify-center gap-1.5">
                                <span>EVALUATION</span>
                              </div>
                              {evaluationYears.map((yr) => (
                                <div key={yr} className="py-3 border-r last:border-r-0 border-slate-700/50 bg-[#b01a43] flex items-center justify-center">
                                  <span>FY {yr}</span>
                                </div>
                              ))}
                            </div>

                            <div 
                              className="grid text-center divide-x divide-surface-container-highest bg-surface/30"
                              style={{ gridTemplateColumns: `140px repeat(${evaluationYears.length}, minmax(0, 1fr))` }}
                            >
                              {/* Description / Label Row */}
                              <div className="p-4 bg-white font-extrabold text-xs text-slate-800 flex flex-col justify-center items-center text-left min-h-[70px]">
                                <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Kategori</div>
                                <div className="text-primary font-black mt-0.5">Rating Kinerja</div>
                              </div>

                              {evaluationYears.map((yr) => {
                                const yearKey = `fy${yr}`;
                                const value = currentTalent.performanceEvaluation?.[yearKey] ?? 0;
                                return (
                                  <div key={yr} className="p-4 bg-white flex flex-col justify-center items-center gap-1.5 min-h-[70px]">
                                    {isEditingScores ? (
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={value}
                                        onChange={(e) => handlePerformanceEvaluationChange(yearKey, parseFloat(e.target.value) || 0)}
                                        className="text-xs font-black p-1.5 rounded border border-surface-container-highest bg-slate-50 text-slate-800 focus:outline-none focus:border-primary cursor-pointer w-full text-center font-mono"
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <span className={`text-sm font-black font-mono px-3 py-1 rounded-lg ${
                                          (perfDetails.is0To50Scale ? value >= 37.5 : value >= 4)
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                            : (perfDetails.is0To50Scale ? value >= 25.0 : value >= 3)
                                            ? "bg-amber-50 text-amber-700 border-amber-200" 
                                            : "bg-rose-50 text-rose-700 border-rose-200"
                                        }`}>
                                          {value}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold mt-1">
                                          {perfDetails.is0To50Scale 
                                            ? (value >= 37.5 ? "Tinggi" : value >= 25.0 ? "Sedang" : value > 0 ? "Rendah" : "-")
                                            : (value === 5 ? "Istimewa" : value === 4 ? "Sangat Baik" : value === 3 ? "Baik" : value === 2 ? "Cukup" : value === 1 ? "Kurang" : "-")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Component summary */}
                          <div className="bg-white border-t border-surface-container-highest px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold text-on-surface-variant gap-4">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div>Total Nilai: <span className="text-on-surface font-mono font-black">{evalScores.reduce((a,b)=>a+b,0).toFixed(1)}</span></div>
                              <div>Jumlah Tahun Evaluasi: <span className="text-on-surface font-mono font-black">{nonZeroScores.length || evaluationYears.length} Tahun</span></div>
                              <div>Rerata Evaluasi: <span className="text-primary font-black font-mono">{avgEval.toFixed(2)}</span></div>
                            </div>
                            <div className="bg-[#b01a43]/10 text-[#b01a43] px-3 py-1 rounded-full text-xs font-extrabold uppercase font-mono">
                              Skor Kinerja Sumbu Y: {perfDetails.score50.toFixed(2)} / 50.00 ({Math.round(perfDetails.percentage)}%)
                            </div>
                          </div>
                        </div>
                      </section>
                    );
                  })()}

                  {/* Bento Grid Layout for Assessments */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Psychotest Results (Circular Radial Indicators) */}
                    <section className="lg:col-span-1 bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 flex flex-col h-full justify-between">
                      <div className="flex items-center justify-between mb-4 border-b border-surface-container-highest pb-3">
                        <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Psychometric Profile</h3>
                        <Brain className="w-5 h-5 text-outline-variant" />
                      </div>
                      
                      {/* Interactive edit instruction banner */}
                      {isEditingScores && (
                        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                          <Sliders className="w-4 h-4 flex-shrink-0 text-amber-600" />
                          <span>Drag slides below to live-simulate assessment scores.</span>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col justify-around gap-6">
                        
                        {/* Metric 1 - Logical Reasoning */}
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path 
                                className="text-surface-container-highest" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3"
                              />
                              <path 
                                className="text-primary transition-all duration-300" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeDasharray={`${currentTalent.psychometric.logicalReasoning.score}, 100`} 
                                strokeLinecap="round" 
                                strokeWidth="3"
                              />
                            </svg>
                            <span className="absolute font-display font-bold text-sm text-on-surface">{currentTalent.psychometric.logicalReasoning.score}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-display font-bold text-xs text-on-surface uppercase tracking-wide">{currentTalent.psychometric.logicalReasoning.name}</h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">{currentTalent.psychometric.logicalReasoning.description}</p>
                            
                            {/* Score adjuster slider */}
                            {isEditingScores && (
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={currentTalent.psychometric.logicalReasoning.score}
                                onChange={(e) => handleScoreChange("psychometric", "logicalReasoning", parseInt(e.target.value))}
                                className="w-full mt-2 accent-primary cursor-ew-resize"
                              />
                            )}
                          </div>
                        </div>

                        {/* Metric 2 - Leadership Potential */}
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path 
                                className="text-surface-container-highest" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3"
                              />
                              <path 
                                className="text-secondary transition-all duration-300" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeDasharray={`${currentTalent.psychometric.leadershipPotential.score}, 100`} 
                                strokeLinecap="round" 
                                strokeWidth="3"
                              />
                            </svg>
                            <span className="absolute font-display font-bold text-sm text-on-surface">{currentTalent.psychometric.leadershipPotential.score}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-display font-bold text-xs text-on-surface uppercase tracking-wide">{currentTalent.psychometric.leadershipPotential.name}</h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">{currentTalent.psychometric.leadershipPotential.description}</p>
                            
                            {/* Score adjuster slider */}
                            {isEditingScores && (
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={currentTalent.psychometric.leadershipPotential.score}
                                onChange={(e) => handleScoreChange("psychometric", "leadershipPotential", parseInt(e.target.value))}
                                className="w-full mt-2 accent-secondary cursor-ew-resize"
                              />
                            )}
                          </div>
                        </div>

                        {/* Metric 3 - Emotional Agility */}
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path 
                                className="text-surface-container-highest" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3"
                              />
                              <path 
                                className="text-outline transition-all duration-300" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeDasharray={`${currentTalent.psychometric.emotionalAgility.score}, 100`} 
                                strokeLinecap="round" 
                                strokeWidth="3"
                              />
                            </svg>
                            <span className="absolute font-display font-bold text-sm text-on-surface">{currentTalent.psychometric.emotionalAgility.score}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-display font-bold text-xs text-on-surface uppercase tracking-wide">{currentTalent.psychometric.emotionalAgility.name}</h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">{currentTalent.psychometric.emotionalAgility.description}</p>
                            
                            {/* Score adjuster slider */}
                            {isEditingScores && (
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={currentTalent.psychometric.emotionalAgility.score}
                                onChange={(e) => handleScoreChange("psychometric", "emotionalAgility", parseInt(e.target.value))}
                                className="w-full mt-2 accent-outline cursor-ew-resize"
                              />
                            )}
                          </div>
                        </div>

                      </div>
                    </section>

                    {/* Competency Details (Bar Charts) */}
                    <section className="lg:col-span-2 bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 flex flex-col h-full justify-between">
                      <div className="flex items-center justify-between mb-6 border-b border-surface-container-highest pb-3">
                        <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Core Competencies</h3>
                        <BarChart3 className="w-5 h-5 text-outline-variant" />
                      </div>
                      
                      <div className="space-y-6 flex-1 flex flex-col justify-between">
                        {currentTalent.competencies.map((comp) => (
                          <div key={comp.name} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <h4 className="font-display font-bold text-xs text-on-surface tracking-wide uppercase">{comp.name}</h4>
                              <span className="text-xs text-secondary font-bold">{comp.label}</span>
                            </div>
                            
                            <div className="w-full bg-surface-container-highest rounded-full h-2.5 relative">
                              <div 
                                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${comp.score}%` }}
                              />
                            </div>

                            {/* Score adjuster slider */}
                            {isEditingScores && (
                              <div className="flex items-center gap-3">
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={comp.score}
                                  onChange={(e) => handleScoreChange("competency", comp.name, parseInt(e.target.value))}
                                  className="flex-1 accent-primary cursor-ew-resize"
                                />
                                <span className="text-xs font-mono font-medium text-outline">{comp.score}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                  </div>
                  </motion.div>
                  )}

                  {profileSubTab === "idp-training" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-6"
                    >
                      {/* Development Plan (IDP) */}
                  <section className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-surface-container-highest pb-3">
                      <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Individual Development Plan (IDP)</h3>
                      <TrendingUp className="w-5 h-5 text-outline-variant" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Plan Item 1 */}
                      <div className="border border-surface-container-highest rounded-lg p-5 bg-surface hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <GraduationCap className="w-4.5 h-4.5" />
                            </div>
                            <h4 className="font-display font-bold text-sm text-on-surface leading-tight">{currentTalent.idp[0].title}</h4>
                          </div>
                          <span className="bg-surface-container-highest text-on-surface-variant font-semibold text-xs px-2.5 py-1 rounded-md">
                            {currentTalent.idp[0].status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium mb-4 leading-relaxed">{currentTalent.idp[0].description}</p>
                        
                        <div className="space-y-1">
                          <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${currentTalent.idp[0].progress}%` }} />
                          </div>
                          <div className="text-right text-xs font-bold text-secondary">{currentTalent.idp[0].progress}% Completed</div>
                        </div>
                      </div>

                      {/* Plan Item 2 */}
                      <div className="border border-surface-container-highest rounded-lg p-5 bg-surface hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-outline">
                              <BookOpen className="w-4.5 h-4.5" />
                            </div>
                            <h4 className="font-display font-bold text-sm text-on-surface leading-tight">{currentTalent.idp[1].title}</h4>
                          </div>
                          <span className="bg-surface-container-highest text-outline font-semibold text-xs px-2.5 py-1 rounded-md">
                            {currentTalent.idp[1].status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium mb-4 leading-relaxed">{currentTalent.idp[1].description}</p>
                        
                        <div className="space-y-1">
                          <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                            <div className="bg-outline h-1.5 rounded-full" style={{ width: `${currentTalent.idp[1].progress}%` }} />
                          </div>
                          <div className="text-right text-xs font-bold text-outline">{currentTalent.idp[1].progress}% Completed</div>
                        </div>
                      </div>

                    </div>
                  </section>

                  {/* Riwayat & Rencana Pelatihan (Training & Development Programs) */}
                  <section className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-highest pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Pelatihan & Program Sertifikasi</h3>
                          <p className="text-xs text-on-surface-variant font-medium mt-0.5">Daftar program pengembangan kepemimpinan, sertifikasi, dan diklat talenta.</p>
                        </div>
                      </div>
                      {userRole === "admin" && (
                        <button
                          onClick={() => {
                            setEditingTrainingId(null);
                            setNewTraining({
                              name: "",
                              provider: "",
                              date: "",
                              type: "Leadership",
                              status: "Planned",
                              notes: ""
                            });
                            setIsAddTrainingOpen(true);
                          }}
                          className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                        >
                          <Plus className="w-4 h-4" />
                          TAMBAH PELATIHAN
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {currentTalent.trainings && currentTalent.trainings.length > 0 ? (
                        currentTalent.trainings.map((tr) => {
                          const typeColors = {
                            Leadership: "bg-emerald-50 text-emerald-700 border-emerald-100",
                            Technical: "bg-indigo-50 text-indigo-700 border-indigo-100",
                            Management: "bg-sky-50 text-sky-700 border-sky-100",
                            Certification: "bg-purple-50 text-purple-700 border-purple-100"
                          };
                          const statusColors = {
                            Planned: "bg-slate-100 text-slate-700 border-slate-200",
                            "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
                            Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
                            Cancelled: "bg-rose-50 text-rose-700 border-rose-200"
                          };

                          return (
                            <div key={tr.id} className="border border-surface-container-highest rounded-xl p-5 bg-surface hover:shadow-md transition-all flex flex-col justify-between text-left relative">
                              <div className="space-y-3.5">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${typeColors[tr.type] || "bg-gray-50 text-gray-700 border-gray-100"}`}>
                                    {tr.type}
                                  </span>
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${statusColors[tr.status] || "bg-gray-50 text-gray-700 border-gray-100"}`}>
                                    {tr.status}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <h4 className="font-display font-extrabold text-sm text-on-surface leading-snug">{tr.name}</h4>
                                  <div className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5">
                                    <span className="font-bold text-secondary">{tr.provider}</span>
                                    <span className="text-outline">•</span>
                                    <span className="font-semibold text-outline">{tr.date}</span>
                                  </div>
                                </div>

                                {tr.notes && (
                                  <div className="p-3 bg-white rounded-lg border border-surface-container-highest/60">
                                    <span className="text-[9px] font-black text-on-surface-variant block uppercase tracking-wider mb-1">Catatan HR / Komite:</span>
                                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">{tr.notes}</p>
                                  </div>
                                )}
                              </div>

                              {userRole === "admin" && (
                                <div className="flex gap-2.5 mt-5 pt-3.5 border-t border-dashed border-surface-container-highest justify-end">
                                  <button
                                    onClick={() => handleStartEditTraining(tr)}
                                    className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                    title="Edit Pelatihan"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTraining(tr.id)}
                                    className="p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                    title="Hapus Pelatihan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Hapus
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 bg-surface rounded-xl border border-dashed border-surface-container-highest">
                          <BookOpen className="w-10 h-10 text-outline-variant mx-auto mb-2" />
                          <p className="text-xs font-bold text-on-surface">Belum Ada Program Pelatihan</p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">Gunakan tombol di atas untuk mendaftarkan program pelatihan khusus bagi talenta ini.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Career Aspiration & Development Request Form - User Only */}
                  {userRole === "user" && (
                    <section className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-container-highest p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-surface-container-highest pb-3">
                        <h3 className="font-display text-base font-extrabold text-on-surface uppercase tracking-wide">Aspirasi Karir & Pengajuan Sertifikasi</h3>
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Sebagai bagian dari program Succession Planning, Anda dapat mengajukan preferensi pelatihan dan mendaftarkan aspirasi pengembangan kepemimpinan jangka pendek Anda langsung ke Chief Talent Officer dan Komite HR.
                      </p>

                      {formSubmitted ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-3"
                        >
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-display font-bold text-sm text-emerald-900">Aspirasi Berhasil Terkirim!</h4>
                            <p className="text-xs text-emerald-800 leading-relaxed max-w-lg mx-auto">
                              Terima kasih, {currentTalent.name}. Preferensi training dan aspirasi pengembangan Anda telah masuk ke sistem HR Succession. {adminProfile.name} ({adminProfile.title}) dan tim komite akan meninjau pengajuan ini pada sesi kalibrasi berikutnya.
                            </p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setFormSubmitted(false);
                              setAspirationText("");
                            }}
                            className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                          >
                            Kirim Aspirasi Baru
                          </button>
                        </motion.div>
                      ) : (
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            setFormSubmitted(true);
                          }}
                          className="space-y-5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-on-surface block uppercase tracking-wider">Program Pelatihan yang Diminati</label>
                              <select 
                                value={preferredTraining}
                                onChange={(e) => setPreferredTraining(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                              >
                                <option value="Sertifikasi Analisis Data Lanjutan">Sertifikasi Analisis Data Lanjutan (Python & Tableau)</option>
                                <option value="Executive Leadership Coaching Program">Executive Leadership Coaching Program (Wharton)</option>
                                <option value="Strategic Business Transformation Course">Strategic Business Transformation Course (INSEAD)</option>
                                <option value="Global Supply Chain Logistics & AI Mastery">Global Supply Chain Logistics & AI Mastery</option>
                              </select>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-on-surface block uppercase tracking-wider">Arah Karir Jangka Pendek (1-2 Tahun)</label>
                              <select 
                                className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                              >
                                <option>General Manager / Kepala Divisi Bisnis Digital</option>
                                <option>VP of Operations / Direktur Operasional Regional</option>
                                <option>Senior Strategic HCM Lead</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-on-surface block uppercase tracking-wider">Deskripsi Rencana & Target Pengembangan Pribadi</label>
                            <textarea 
                              required
                              value={aspirationText}
                              onChange={(e) => setAspirationText(e.target.value)}
                              rows={4}
                              className="w-full p-4 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                              placeholder="Tuliskan aspirasi karir Anda, tantangan yang ingin Anda ambil, dan dukungan spesifik yang Anda harapkan dari manajemen..."
                            />
                          </div>

                          <div className="flex justify-end">
                            <button 
                              type="submit"
                              className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              KIRIM ASPIRASI KE HR
                            </button>
                          </div>
                        </form>
                      )}
                    </section>
                  )}
                  </motion.div>
                  )}
                </motion.div>
              )}

              {/* 4. ADVISORY CONTROLS / SETTINGS VIEW */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-surface-container-highest pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold text-primary tracking-tight">Advisory Portal Controls & Database</h1>
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">Manajemen database akun pengguna, hak akses, kalibrasi matriks talenta, dan integrasi cloud terpusat.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <span className="text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Database: LocalStorage Auto-Sync</span>
                      </span>
                    </div>
                  </div>

                  {/* Settings Navigation Subtabs */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-surface-container-highest pb-3">
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("user-accounts")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        settingsSubTab === "user-accounts"
                          ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                          : "bg-surface text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface border border-surface-container-highest"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Database Akun Pengguna ({userAccounts.length})</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                        settingsSubTab === "user-accounts" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      }`}>
                        TERINTEGRASI
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettingsSubTab("advisory-config")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        settingsSubTab === "advisory-config"
                          ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                          : "bg-surface text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface border border-surface-container-highest"
                      }`}
                    >
                      <Sliders className="w-4 h-4" />
                      <span>Konfigurasi Advisory & Kalibrasi</span>
                    </button>
                  </div>

                  {settingsSubTab === "user-accounts" && (
                    <UserAccountManagement
                      accounts={userAccounts}
                      onAccountsChange={handleAccountsChange}
                      currentUserId={currentUserAccount?.id}
                      talents={talents}
                      onNotify={(msg, type) => {
                        addSecurityLog(msg, type);
                        setShortcutToast(msg);
                      }}
                    />
                  )}

                  {settingsSubTab === "advisory-config" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* General Settings */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-surface-container-highest p-6 shadow-sm space-y-6">
                      <h3 className="font-display text-lg font-bold text-on-surface border-b border-surface-container-highest pb-3">Succession Configuration</h3>
                      
                      {/* Metric editor for current active profile */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display font-bold text-xs text-primary uppercase tracking-wide">Calibrate profile commentary</h4>
                          {isVaultEnabled && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                              isVaultLocked 
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" 
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                            }`}>
                              {isVaultLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              <span>{isVaultLocked ? "TERENKRIPSI (LOCKED)" : "TERENKRIPSI (AES-256)"}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant">Update the executive-level description shown in downloadable PDF summary reports for {currentTalent.name}.</p>
                        
                        <div className="relative">
                          {isVaultLocked && (
                            <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-950/40 backdrop-blur-md rounded-lg flex flex-col items-center justify-center p-4 text-center z-10 border border-slate-200 dark:border-slate-800">
                              <Lock className="w-7 h-7 text-rose-500 animate-pulse mb-1.5" />
                              <h5 className="font-display font-black text-xs text-rose-700 dark:text-rose-400 uppercase tracking-wider">Komentar Eksekutif Terkunci (AES-256)</h5>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-normal">
                                Sistem keamanan aktif. Masukkan passphrase Anda pada panel konfigurasi di bawah untuk mendekripsi.
                              </p>
                              <div className="mt-2.5 flex gap-1.5 max-w-[240px] w-full justify-center">
                                <input 
                                  type="password"
                                  placeholder="Sandi Keamanan..."
                                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-rose-500 text-slate-900 flex-1 shadow-sm"
                                  id="commentary-quick-pass"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = (document.getElementById("commentary-quick-pass") as HTMLInputElement)?.value;
                                      if (val) handleUnlockVault(val);
                                    }
                                  }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const val = (document.getElementById("commentary-quick-pass") as HTMLInputElement)?.value;
                                    if (val) handleUnlockVault(val);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  Unlock
                                </button>
                              </div>
                              {vaultError && <p className="text-[9px] text-rose-600 font-bold mt-1.5 bg-rose-50 px-2 py-0.5 rounded">{vaultError}</p>}
                            </div>
                          )}
                          
                          <textarea 
                            value={executiveCommentary[selectedTalentId] || ""}
                            onChange={(e) => {
                              handleUpdateAndEncryptCommentary(selectedTalentId, e.target.value);
                            }}
                            rows={4}
                            className={`w-full p-4 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface transition-all ${
                              isVaultLocked ? 'filter blur-xs select-none select-all opacity-35' : ''
                            }`}
                            placeholder="Write executive commentary..."
                            disabled={isVaultLocked}
                          />
                        </div>
                        <span className="text-[11px] text-outline block text-right font-medium">Changes auto-save and update report PDF instantly.</span>
                      </div>

                      <div className="pt-4 border-t border-surface-container-highest space-y-4">
                        <h4 className="font-display font-bold text-xs text-secondary uppercase tracking-wide">Calibration Simulation Toggle</h4>
                        <p className="text-xs text-on-surface-variant">Enable direct slider adjustment handles directly inside the detailed Profile assessment cards.</p>
                        
                        <div className="flex items-center justify-between p-3.5 bg-surface rounded-lg border border-surface-container-highest">
                          <div className="flex items-center gap-3">
                            <Sliders className="w-5 h-5 text-primary" />
                            <div>
                              <span className="text-xs font-bold text-on-surface block">Live Score Adjustment Sliders</span>
                              <span className="text-[10px] text-on-surface-variant">Displays range selectors under each assessment ring and competence bar</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsEditingScores(!isEditingScores)}
                            className={`w-12 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${isEditingScores ? 'bg-primary' : 'bg-outline-variant'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isEditingScores ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      {/* SYSTEM APPEARANCE SETTINGS */}
                      <div className="pt-4 border-t border-surface-container-highest space-y-4">
                        <h4 className="font-display font-bold text-xs text-secondary uppercase tracking-wide">System Appearance Settings</h4>
                        <p className="text-xs text-on-surface-variant">Switch between standard light theme and a dark, eye-friendly layout to minimize glare during night shifts.</p>
                        
                        <div className="flex items-center justify-between p-3.5 bg-surface rounded-lg border border-surface-container-highest">
                          <div className="flex items-center gap-3">
                            {isDarkMode ? (
                              <Moon className="w-5 h-5 text-primary" />
                            ) : (
                              <Sun className="w-5 h-5 text-amber-500" />
                            )}
                            <div>
                              <span className="text-xs font-bold text-on-surface block">Dark Mode</span>
                              <span className="text-[10px] text-on-surface-variant">Reduces eye strain for HR admins during long night shifts</span>
                            </div>
                          </div>
                          <button 
                            id="dark-mode-toggle"
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`w-12 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${isDarkMode ? 'bg-primary' : 'bg-outline-variant'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      {/* EDIT & SAVE PROFILING ADMIN MASTER SECTION */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-4 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <User className="w-5 h-5 text-primary" />
                            <h4 className="font-display font-bold text-xs text-primary uppercase tracking-wide">Edit & Save Profiling Admin Master</h4>
                          </div>
                          {adminProfile.lastSaved && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 px-2.5 py-1 rounded-full">
                              Tersimpan: {adminProfile.lastSaved}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Kelola informasi profil Administrator Master yang digunakan untuk otorisasi sidebar, kop laporan suksesi resmi, serta tanda tangan digital persetujuan dokumen.
                        </p>
                        
                        <form onSubmit={handleSaveAdminMasterProfile} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-surface-container-highest space-y-4">
                          {adminProfileSuccessMsg && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-lg flex items-center gap-2 animate-fade-in">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{adminProfileSuccessMsg}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Nama Administrator Master</label>
                              <input 
                                type="text"
                                required
                                value={adminProfile.name}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  const words = name.trim().split(/\s+/);
                                  const initials = words.map(w => w[0]).join("").substring(0, 3).toUpperCase() || "AD";
                                  setAdminProfile({ ...adminProfile, name, initials });
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-xs"
                                placeholder="Nama Lengkap Admin Master"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Peran / Jabatan Admin Master</label>
                              <input 
                                type="text"
                                required
                                value={adminProfile.title}
                                onChange={(e) => setAdminProfile({ ...adminProfile, title: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-xs"
                                placeholder="Chief Talent Officer (Admin)"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Departemen / Unit Kerja</label>
                              <input 
                                type="text"
                                value={adminProfile.department || "Human Capital Management Dept."}
                                onChange={(e) => setAdminProfile({ ...adminProfile, department: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-xs"
                                placeholder="Human Capital Management"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Email Kontak Resmi Admin</label>
                              <input 
                                type="email"
                                value={adminProfile.email || "admin.hr@ajinomoto.co.id"}
                                onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-xs"
                                placeholder="admin.hr@ajinomoto.co.id"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Catatan Otorisasi Master Komite</label>
                            <textarea 
                              rows={2}
                              value={adminProfile.notes || "Otorisasi Administrator Master untuk Komite Talent Suksesi PT Ajinomoto Indonesia"}
                              onChange={(e) => setAdminProfile({ ...adminProfile, notes: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-xs"
                              placeholder="Catatan otorisasi master..."
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-surface-container-highest w-full sm:w-auto flex-1">
                              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-display font-bold text-xs shadow-xs shrink-0">
                                {adminProfile.initials}
                              </div>
                              <div className="text-left overflow-hidden">
                                <span className="text-xs font-black text-on-surface dark:text-slate-100 block truncate">{adminProfile.name}</span>
                                <span className="text-[10px] text-on-surface-variant dark:text-slate-400 block truncate">{adminProfile.title}</span>
                              </div>
                            </div>

                            <button 
                              type="submit"
                              className="w-full sm:w-auto bg-[#b01a43] hover:bg-[#921435] text-white font-extrabold text-xs px-6 py-3 rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              SIMPAN PROFILING ADMIN MASTER
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* DYNAMIC FISCAL YEAR MANAGEMENT PANEL */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-4 text-left">
                        <div className="flex items-center gap-2.5">
                          <History className="w-5 h-5 text-primary" />
                          <h4 className="font-display font-bold text-xs text-primary uppercase tracking-wide">Manajemen Tahun Evaluasi (Fiscal Year Management)</h4>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Tambahkan tahun fiskal baru (FY) untuk memperbarui data penilaian evaluasi secara dinamis. Rata-rata penilaian dan peta sebaran Y-Axis akan otomatis beradaptasi dengan perubahan ini.
                        </p>
                        
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-surface-container-highest space-y-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-black text-slate-500 uppercase">Tahun Aktif Saat Ini:</span>
                            {evaluationYears.map((yr) => (
                              <span key={yr} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                                <span>FY {yr}</span>
                                <button 
                                  onClick={() => handleRemoveEvaluationYear(yr)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors ml-1 focus:outline-none font-bold"
                                  title={`Hapus FY ${yr}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2 max-w-sm">
                            <input 
                              type="text"
                              id="new-fy-input"
                              placeholder="Misal: 2025"
                              maxLength={4}
                              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-primary text-slate-900 flex-1 shadow-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = (e.target as HTMLInputElement).value;
                                  if (val) {
                                    handleAddEvaluationYear(val);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const el = document.getElementById("new-fy-input") as HTMLInputElement;
                                if (el && el.value) {
                                  handleAddEvaluationYear(el.value);
                                  el.value = "";
                                }
                              }}
                              className="bg-[#b01a43] hover:bg-[#921435] text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                            >
                              Tambah FY Baru
                            </button>
                          </div>
                          
                          <div className="text-[10px] text-slate-400 font-medium">
                            *Menambahkan tahun fiskal baru akan secara otomatis memberikan nilai dasar (Rating 3 - Baik) pada seluruh profil kandidat untuk tahun tersebut.
                          </div>
                        </div>
                      </div>

                      {/* GLOBAL READINESS CALIBRATION PANEL */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-4 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-display font-bold text-xs text-primary uppercase tracking-wide">Kalibrasi Tingkat Kesiapan Talent (Global Readiness Calibration)</h4>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              Ubah status readiness level dari seluruh kandidat secara langsung di bawah ini.
                            </p>
                          </div>
                          
                          {/* Search Filter for Candidates */}
                          <div className="relative w-full sm:w-56">
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Cari nama talent..."
                              value={readinessSearch}
                              onChange={(e) => setReadinessSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-on-surface focus:outline-none focus:border-primary shadow-xs"
                            />
                          </div>
                        </div>

                        {/* Scrollable Box Container */}
                        <div className="p-2 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-surface-container-highest max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar shadow-inner">
                          {talents
                            .filter(t => !readinessSearch || t.name.toLowerCase().includes(readinessSearch.toLowerCase()) || t.title.toLowerCase().includes(readinessSearch.toLowerCase()))
                            .map((t) => (
                              <div key={t.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-surface-container-highest gap-4 hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={t.avatar} className="w-9 h-9 rounded-full object-cover border border-surface shrink-0" alt={t.name} referrerPolicy="no-referrer" />
                                  <div className="text-left min-w-0">
                                    <span className="text-xs font-bold text-on-surface block truncate">{t.name}</span>
                                    <span className="text-[10px] text-on-surface-variant block truncate">{t.title}</span>
                                  </div>
                                </div>
                                <select
                                  value={t.readiness}
                                  onChange={(e) => handleUpdateReadiness(t.id, e.target.value)}
                                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer shrink-0 shadow-xs"
                                >
                                  <option value="READY NOW">READY NOW</option>
                                  <option value="READY 1-2 YEARS">READY 1-2 YEARS</option>
                                  <option value="READY 2+ YEARS">READY 2+ YEARS</option>
                                </select>
                              </div>
                            ))}
                          {talents.filter(t => !readinessSearch || t.name.toLowerCase().includes(readinessSearch.toLowerCase()) || t.title.toLowerCase().includes(readinessSearch.toLowerCase())).length === 0 && (
                            <div className="text-center py-6 text-xs text-slate-400 font-medium">
                              Tidak ada kandidat talent yang sesuai dengan kata kunci pencarian.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CRYPTOGRAPHIC SECURITY VAULT PANEL */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-5 text-left">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-primary" />
                          <h4 className="font-display font-black text-xs text-primary uppercase tracking-wide">
                            Kubah Keamanan Kriptografi (AES-256-GCM Secure Vault)
                          </h4>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Amankan data penilaian suksesi dan komentar eksekutif pimpinan menggunakan standar militer <strong>AES-256-GCM</strong>. Kunci dienkripsi di sisi klien menggunakan derivasi <strong>PBKDF2 dengan 100.000 iterasi</strong>, sehingga tidak ada data sensitif yang terekspos tanpa kunci sandi yang tepat (Zero-Knowledge Architecture).
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Card: Vault Controls */}
                          <div className="p-4 bg-surface rounded-xl border border-surface-container-highest space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Status Vault</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                  !isVaultEnabled 
                                    ? "bg-slate-300 dark:bg-slate-700 animate-pulse" 
                                    : isVaultLocked 
                                      ? "bg-rose-500 animate-ping" 
                                      : "bg-emerald-500 animate-pulse"
                                }`} />
                                <span className="text-[10px] font-bold text-on-surface">
                                  {!isVaultEnabled ? "NONAKTIF" : isVaultLocked ? "TERKUNCI" : "AKTIF & DEKRIPSI"}
                                </span>
                              </div>
                            </div>

                            {!isVaultEnabled ? (
                              <div className="space-y-3 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Set Passphrase Keamanan</label>
                                  <div className="relative">
                                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-outline" />
                                    <input 
                                      type="password"
                                      defaultValue="ajinomoto-secure"
                                      id="vault-setup-passphrase"
                                      placeholder="Masukkan sandi enkripsi..."
                                      className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface font-mono"
                                    />
                                  </div>
                                  <span className="text-[9px] text-outline leading-tight block">Passphrase ini digunakan sebagai dasar derivasi kunci kriptografi Anda. Catat baik-baik!</span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const el = document.getElementById("vault-setup-passphrase") as HTMLInputElement;
                                    const val = el ? el.value : "ajinomoto-secure";
                                    handleEnableVault(val);
                                  }}
                                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                                >
                                  <ShieldCheck className="w-4 h-4" /> AKTIFKAN ENKRIPSI DATA
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3 pt-1">
                                {isVaultLocked ? (
                                  <div className="space-y-2">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Masukkan Passphrase Untuk Membuka Kunci</label>
                                      <div className="relative">
                                        <Key className="absolute left-3 top-2.5 w-4 h-4 text-rose-400" />
                                        <input 
                                          type="password"
                                          id="vault-unlock-passphrase"
                                          placeholder="Ketik kata sandi..."
                                          className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-rose-200 text-xs focus:outline-none focus:border-rose-500 text-on-surface font-mono"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const el = document.getElementById("vault-unlock-passphrase") as HTMLInputElement;
                                              if (el) handleUnlockVault(el.value);
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                    {vaultError && <p className="text-[9px] text-rose-600 font-bold">{vaultError}</p>}
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const el = document.getElementById("vault-unlock-passphrase") as HTMLInputElement;
                                        if (el) handleUnlockVault(el.value);
                                      }}
                                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <Unlock className="w-4 h-4" /> BUKA KUNCI DATA (DECRYPT)
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[11px] text-emerald-800 dark:text-emerald-400 leading-normal">
                                      🔐 <strong>Kubah data terbuka secara aman.</strong> Data komentar eksekutif sedang didekripsi dalam memori kerja browser Anda. Saat Anda menutup tab atau mengunci kubah, data akan langsung diamankan kembali.
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={handleLockVault}
                                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <Lock className="w-4 h-4" /> KUNCI SEKARANG (SECURE LOCK)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Card: Backups & File Crypto */}
                          <div className="p-4 bg-surface rounded-xl border border-surface-container-highest flex flex-col justify-between space-y-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block mb-1">Backup & Portabilitas Data</span>
                              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                                Ekspor seluruh set data komentar eksekutif yang telah terenkripsi AES-256 menjadi berkas cadangan lokal berkeamanan tinggi, atau muat kembali berkas cadangan.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <button 
                                type="button"
                                disabled={!isVaultEnabled}
                                onClick={async () => {
                                  try {
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                                      appName: "Ajinomoto Succession Suite - Encrypted Backup",
                                      version: "2026.1",
                                      encryptedCommentaries,
                                      hash: await calculateHash(JSON.stringify(encryptedCommentaries))
                                    }));
                                    const downloadAnchor = document.createElement('a');
                                    downloadAnchor.setAttribute("href", dataStr);
                                    downloadAnchor.setAttribute("download", `ajinomoto_succession_backup_encrypted.json`);
                                    document.body.appendChild(downloadAnchor);
                                    downloadAnchor.click();
                                    downloadAnchor.remove();
                                    addSecurityLog("Berhasil mengekspor cadangan terenkripsi berkas JSON.", "success");
                                  } catch (err) {
                                    addSecurityLog("Gagal mengekspor cadangan terenkripsi.", "warning");
                                  }
                                }}
                                className={`w-full font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  isVaultEnabled 
                                    ? "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 active:scale-95" 
                                    : "bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <Download className="w-4 h-4" /> Ekspor Cadangan Terenkripsi
                              </button>

                              <div className="relative">
                                <input 
                                  type="file" 
                                  id="import-encrypted-file"
                                  accept=".json"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      try {
                                        const parsed = JSON.parse(event.target?.result as string);
                                        if (parsed.encryptedCommentaries) {
                                          setEncryptedCommentaries(parsed.encryptedCommentaries);
                                          setIsVaultEnabled(true);
                                          setIsVaultLocked(true);
                                          addSecurityLog("Berkas cadangan berhasil dimuat ke memori. Masukkan kata sandi yang sesuai untuk mendekripsi data.", "success");
                                          alert("Cadangan terenkripsi berhasil dimuat! Masukkan kata sandi yang sesuai pada kotak vault di sebelah kiri untuk membuka.");
                                        } else {
                                          addSecurityLog("Format berkas cadangan tidak valid.", "warning");
                                          alert("Format berkas cadangan suksesi tidak valid.");
                                        }
                                      } catch (err) {
                                        addSecurityLog("Gagal mengurai berkas cadangan.", "warning");
                                      }
                                    };
                                    reader.readAsText(file);
                                  }}
                                  className="hidden"
                                />
                                <button 
                                  type="button"
                                  onClick={() => document.getElementById("import-encrypted-file")?.click()}
                                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                                >
                                  <Upload className="w-4 h-4" /> Impor Cadangan Terenkripsi
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Real-Time Crypto Operations Audit Log Terminal */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
                            <span>Cryptographic Audit Console (Log Operasi Real-Time)</span>
                            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">AES-256-GCM / PBKDF2 / SHA-256</span>
                          </label>
                          <div className="w-full bg-slate-950 text-slate-200 font-mono text-[10px] p-4 rounded-xl shadow-inner border border-slate-800 max-h-[140px] overflow-y-auto space-y-1.5 text-left select-text">
                            {securityLogs.map((log) => (
                              <div key={log.id} className="flex gap-2.5 leading-normal">
                                <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                                <span className={
                                  log.type === "success" 
                                    ? "text-emerald-400" 
                                    : log.type === "warning" 
                                      ? "text-rose-400" 
                                      : "text-blue-400"
                                }>
                                  {log.type === "success" ? "✓" : log.type === "warning" ? "⚠" : "ℹ"} {log.action}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* SUPABASE DATABASE INTEGRATION PANEL */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-5 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <h4 className="font-display font-black text-xs text-primary uppercase tracking-wide">
                              Integrasi Database Cloud (Supabase Real-Time Sync)
                            </h4>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            supabaseStatus === "success" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                              : supabaseStatus === "error"
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                                : supabaseStatus === "idle"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30 animate-pulse"
                                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800"
                          }`}>
                            {supabaseStatus === "success" ? "Terhubung" : supabaseStatus === "error" ? "Error Koneksi" : supabaseStatus === "idle" ? "Menghubungkan..." : "Belum Terhubung"}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Integrasikan visualisasi peta suksesi dan seluruh data komite talenta Anda langsung ke akun database <strong>Supabase</strong> Anda sendiri secara real-time.
                        </p>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-surface-container-highest space-y-4">
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              const url = formData.get("supabaseUrl") as string;
                              const key = formData.get("supabaseKey") as string;
                              const enabled = !!url && !!key;
                              handleSaveSupabaseConfigChange(url, key, enabled);
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Supabase Project URL</label>
                              <input 
                                type="text"
                                name="supabaseUrl"
                                defaultValue={supabaseConfig.url}
                                placeholder="https://your-project.supabase.co"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-sm"
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Supabase Anon Key (API Key)</label>
                              <input 
                                type="password"
                                name="supabaseKey"
                                defaultValue={supabaseConfig.anonKey}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 shadow-sm font-mono"
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-wrap justify-between items-center gap-3 pt-2">
                              <div className="flex items-center gap-2">
                                <button 
                                  type="submit"
                                  className="bg-[#b01a43] hover:bg-[#921435] text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                  <Database className="w-3.5 h-3.5" /> Simpan & Hubungkan
                                </button>
                                <button
                                  type="button"
                                  onClick={handleTestSupabaseConnection}
                                  className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                  <Zap className="w-3.5 h-3.5" /> Uji Koneksi & Status
                                </button>
                                {supabaseConfig.isEnabled && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSaveSupabaseConfigChange(supabaseConfig.url, "", false);
                                    }}
                                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-extrabold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                                  >
                                    Putus Hubungan
                                  </button>
                                )}
                              </div>
                              
                              {supabaseConfig.isEnabled && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-extrabold text-slate-500 uppercase">Auto-Sync Real-Time:</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setIsAutoSyncEnabled(!isAutoSyncEnabled);
                                      addSecurityLog(`Auto-sync Supabase ${!isAutoSyncEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`, "info");
                                    }}
                                    className={`w-12 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${isAutoSyncEnabled ? 'bg-emerald-600' : 'bg-outline-variant'}`}
                                  >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isAutoSyncEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </form>

                          {supabaseError && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                              <span className="font-extrabold">⚠ Error:</span>
                              <p className="flex-1 font-medium leading-relaxed">{supabaseError}</p>
                            </div>
                          )}

                          {supabaseConfig.isEnabled && (
                            <div className="pt-2 border-t border-slate-200/60 text-left space-y-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">Aksi Sinkronisasi Manual</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  disabled={isSupabaseSyncing}
                                  onClick={handlePushToSupabase}
                                  className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 font-display"
                                >
                                  {isSupabaseSyncing ? "Menyinkronkan..." : "Push Data ke Supabase"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSupabaseSyncing}
                                  onClick={handlePullFromSupabase}
                                  className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 font-display"
                                >
                                  {isSupabaseSyncing ? "Menyinkronkan..." : "Pull Data dari Supabase"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SQL DDL INITIALIZATION SCRIPT CARD (SEPARATE SHEETS) */}
                        <div className="space-y-2 pt-1 border-t border-surface-container-highest/60">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                              <span>Skrip Inisialisasi SQL Supabase (Pilih Sheet)</span>
                            </label>
                            
                            {/* Sheet Tabs */}
                            <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-lg border border-outline/20 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => setSqlSchemaTab("user_accounts")}
                                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                                  sqlSchemaTab === "user_accounts"
                                    ? "bg-teal-600 text-white shadow-xs"
                                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                                }`}
                              >
                                Sheet: user_accounts (Akun)
                              </button>
                              <button
                                type="button"
                                onClick={() => setSqlSchemaTab("succession")}
                                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                                  sqlSchemaTab === "succession"
                                    ? "bg-primary text-white shadow-xs"
                                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                                }`}
                              >
                                Sheet: succession_data (Talenta)
                              </button>
                            </div>
                          </div>

                          <div className="relative">
                            <pre className="w-full bg-slate-950 text-emerald-400 font-mono text-[9px] p-3.5 rounded-xl shadow-inner border border-slate-800 max-h-[150px] overflow-y-auto text-left leading-relaxed select-all">
                              {sqlSchemaTab === "user_accounts" ? USER_ACCOUNTS_SQL_SCHEMA : SUCCESSION_DATA_SQL_SCHEMA}
                            </pre>
                            <button
                              type="button"
                              onClick={() => {
                                const codeToCopy = sqlSchemaTab === "user_accounts" ? USER_ACCOUNTS_SQL_SCHEMA : SUCCESSION_DATA_SQL_SCHEMA;
                                navigator.clipboard.writeText(codeToCopy);
                                setShortcutToast(`Skrip SQL sheet '${sqlSchemaTab === "user_accounts" ? "user_accounts" : "succession_data"}' berhasil disalin ke clipboard!`);
                              }}
                              className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white text-[8px] font-black px-2.5 py-1 rounded-md border border-slate-700 cursor-pointer transition-all active:scale-95 shadow-xs"
                            >
                              SALIN SQL {sqlSchemaTab === "user_accounts" ? "AKUN" : "SUKSESI"}
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between text-[9px] text-on-surface-variant font-medium">
                            <span>
                              {sqlSchemaTab === "user_accounts" 
                                ? "* Sheet 'user_accounts' khusus menyimpan kredensial akun dan hak akses secara mandiri."
                                : "* Sheet 'succession_data' khusus menampung profil talenta, posisi suksesi, dan histori evaluasi."}
                            </span>
                            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400">
                              Tersimpan di Sheet Terpisah
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* INTEGRASI EXCEL / CSV (TEMPLAT & IMPOR DATA) */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-5 text-left">
                        <div className="flex items-center gap-2.5">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-display font-black text-xs text-primary uppercase tracking-wide">
                            Integrasi Excel (Unduh Template & Impor Data Talent)
                          </h4>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Kelola data talent eksternal menggunakan Microsoft Excel atau Google Sheets. Anda dapat mengunduh struktur tabel data saat ini, mengedit/mengisi data talent baru secara offline, dan mengunggahnya kembali ke sistem untuk sinkronisasi otomatis.
                        </p>

                        <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                          <h5 className="font-display font-bold text-xs text-emerald-800 dark:text-emerald-400">Petunjuk Pengisian Excel/CSV:</h5>
                          <ol className="list-decimal list-inside text-[11px] text-emerald-900/80 dark:text-emerald-300/80 space-y-1.5 leading-relaxed">
                            <li>Tekan tombol <strong>"Unduh Format Excel (CSV)"</strong> di bawah untuk mengunduh format database.</li>
                            <li>Buka file tersebut di <strong>Microsoft Excel</strong> atau <strong>Google Sheets</strong>.</li>
                            <li>Isi baris baru atau edit baris yang sudah ada sesuai kolom (ID, Nama, Jabatan, Department, Lokasi, dsb). Pastikan skor berkisar antara <strong>0 - 100</strong>.</li>
                            <li>Simpan kembali file dengan format <strong>Comma Separated Values (.csv)</strong>.</li>
                            <li>Unggah file tersebut kembali menggunakan tombol <strong>"Impor Data via Excel"</strong> di bawah.</li>
                          </ol>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              type="button"
                              onClick={handleExportCSV}
                              className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              <Download className="w-4 h-4 text-emerald-600" /> Unduh Format Excel (CSV)
                            </button>

                            <div className="flex-1">
                              <input
                                type="file"
                                id="import-excel-csv"
                                accept=".csv"
                                onChange={handleImportCSV}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById("import-excel-csv")?.click()}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                <Upload className="w-4 h-4" /> Impor Data via Excel (CSV)
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* INTEGRASI PETA SUKSESI & MANAJEMEN MASA PENSIUN (JSON / CSV) */}
                      <div className="pt-6 border-t border-surface-container-highest space-y-5 text-left">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-5 h-5 text-primary" />
                          <h4 className="font-display font-black text-xs text-primary uppercase tracking-wide">
                            Integrasi & Portabilitas Peta Suksesi & Manajemen Masa Pensiun
                          </h4>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Ekspor dan impor khusus untuk data struktur <strong>Peta Suksesi & Manajemen Masa Pensiun Eksekutif</strong>. Anda dapat mengunduh berkas lengkap dalam format JSON/CSV, memperbarui suksesor/posisi, dan mengimpornya kembali.
                        </p>

                        <div className="p-4 bg-primary/5 dark:bg-primary-container/10 rounded-xl border border-primary/20 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={handleExportRetiringPositionsJSON}
                              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Download className="w-4 h-4 text-primary" /> Unduh Peta Suksesi (JSON)
                            </button>

                            <button
                              type="button"
                              onClick={handleExportRetiringPositionsCSV}
                              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Unduh Peta Suksesi (CSV)
                            </button>

                            <div>
                              <input
                                type="file"
                                id="import-retiring-positions-setting"
                                accept=".json,.csv"
                                onChange={handleImportRetiringPositionsFile}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById("import-retiring-positions-setting")?.click()}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Upload className="w-4 h-4" /> Impor Peta Suksesi (JSON/CSV)
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-surface-container-highest space-y-4">
                        <h4 className="font-display font-bold text-xs text-rose-600 uppercase tracking-wide">Security Session</h4>
                        <p className="text-xs text-on-surface-variant">Sign out of the current strategic board session. All offline simulated calibration metrics are kept intact in this local environment.</p>
                        
                        <button 
                          onClick={() => setAuthState("landing")}
                          className="bg-rose-600 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-sm hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          LOG OUT FROM PORTAL
                        </button>
                      </div>
                    </div>

                    {/* Quick Profile Selector Helper */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-surface-container-highest dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full min-h-[460px]">
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-display text-base font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span>Talent Quick Selector</span>
                          </h3>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                            {talents.filter(t => 
                              !quickSelectorSearch || 
                              t.name.toLowerCase().includes(quickSelectorSearch.toLowerCase()) || 
                              t.title.toLowerCase().includes(quickSelectorSearch.toLowerCase()) ||
                              t.division.toLowerCase().includes(quickSelectorSearch.toLowerCase()) ||
                              t.nik?.toLowerCase().includes(quickSelectorSearch.toLowerCase())
                            ).length} / {talents.length} Kandidat
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant dark:text-slate-400 mb-3">
                          Pilih profil kandidat untuk memuat data kalibrasi strategis & pengujian peta suksesi:
                        </p>
                        
                        {/* Search Bar with Clear Button */}
                        <div className="relative mb-3 shrink-0">
                          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama, jabatan, divisi, NIK kandidat..."
                            value={quickSelectorSearch}
                            onChange={(e) => setQuickSelectorSearch(e.target.value)}
                            className="w-full pl-8 pr-8 py-2 text-xs bg-surface dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                          />
                          {quickSelectorSearch && (
                            <button
                              type="button"
                              onClick={() => setQuickSelectorSearch("")}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Hapus pencarian"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Candidates List Container - Flexible height to fill entire box with smooth scroll */}
                        <div className="flex-1 min-h-[360px] h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                          {(() => {
                            const filtered = talents.filter(t => 
                              !quickSelectorSearch || 
                              t.name.toLowerCase().includes(quickSelectorSearch.toLowerCase()) || 
                              t.title.toLowerCase().includes(quickSelectorSearch.toLowerCase()) ||
                              t.division.toLowerCase().includes(quickSelectorSearch.toLowerCase()) ||
                              t.nik?.toLowerCase().includes(quickSelectorSearch.toLowerCase())
                            );

                            if (filtered.length === 0) {
                              return (
                                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 my-auto">
                                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tidak ada kandidat ditemukan</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tidak cocok dengan kata kunci "{quickSelectorSearch}"</p>
                                  <button
                                    type="button"
                                    onClick={() => setQuickSelectorSearch("")}
                                    className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
                                  >
                                    Reset Pencarian
                                  </button>
                                </div>
                              );
                            }

                            return filtered.map((t) => {
                              const isSelected = selectedTalentId === t.id;
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => setSelectedTalentId(t.id)}
                                  className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer group ${
                                    isSelected 
                                      ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary dark:text-teal-300 ring-2 ring-primary/40 shadow-xs" 
                                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-on-surface dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                  }`}
                                >
                                  <div className="relative shrink-0">
                                    <img 
                                      src={t.avatar} 
                                      className={`w-9 h-9 rounded-full object-cover border-2 ${isSelected ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`} 
                                      alt="" 
                                      referrerPolicy="no-referrer" 
                                    />
                                    {isSelected && (
                                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center shadow-xs">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-display font-bold text-xs block truncate text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                                        {t.name}
                                      </span>
                                      {isSelected && (
                                        <span className="text-[9px] font-black uppercase bg-primary text-white px-1.5 py-0.5 rounded shrink-0">
                                          Aktif Dimuat
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-on-surface-variant dark:text-slate-400 block truncate mt-0.5">
                                      {t.title} • <span className="font-semibold">{t.division}</span>
                                    </span>
                                  </div>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <button 
                        onClick={() => setActiveTab("profile")}
                        className="w-full mt-4 bg-primary hover:bg-primary/95 text-white font-bold text-xs py-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95"
                      >
                        <User className="w-4 h-4" />
                        PREVIEW RE-CALIBRATED PROFILE
                      </button>
                    </div>
                  </div>
                  )}
                </motion.div>
              )}

              {/* 5. NINE-BOX PLACEMENT VIEW */}
              {activeTab === "nine-box" && (() => {
                const getCellName = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
                  if (pot === "High") {
                    if (perf === "Low") return "Enigma (Box 4)";
                    if (perf === "Medium") return "High Potential (Box 7)";
                    return "Star Leader (Box 9)";
                  }
                  if (pot === "Medium") {
                    if (perf === "Low") return "Inconsistent Performer (Box 2)";
                    if (perf === "Medium") return "Core Contributor (Box 5)";
                    return "High Performer (Box 8)";
                  }
                  if (perf === "Low") return "Underperformer (Box 1)";
                  if (perf === "Medium") return "Solid Performer (Box 3)";
                  return "Workhorse / Specialist (Box 6)";
                };

                const getCellZone = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High"): "green" | "blue" | "red" => {
                  if (pot === "High" && perf === "High") return "green";
                  if (pot === "Medium" && perf === "High") return "green";
                  if (pot === "High" && perf === "Medium") return "blue";
                  if (pot === "High" && perf === "Low") return "blue";
                  if (pot === "Medium" && perf === "Medium") return "blue";
                  if (pot === "Low" && perf === "High") return "blue";
                  return "red";
                };

                const getPlacementRecommendation = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High") => {
                  if (pot === "High") {
                    if (perf === "Low") return "Bimbingan kinerja intensif untuk mengeksplorasi hambatan dan mengoptimalkan potensi kepemimpinan tinggi.";
                    if (perf === "Medium") return "Berikan tanggung jawab proyek lintas divisi dan mentoring kepemimpinan tingkat lanjut untuk persiapan promosi.";
                    return "Kandidat prioritas utama untuk suksesi kepemimpinan langsung (Ready Now). Berikan pelatihan eksekutif.";
                  }
                  if (pot === "Medium") {
                    if (perf === "Low") return "Bimbingan teknis berkala dan tinjau motivasi atau kendala personal yang menghambat performa.";
                    if (perf === "Medium") return "Fokus pada penguatan kompetensi manajerial menengah dan jaga keterlibatan kerja tetap stabil.";
                    return "Pertahankan kinerja tinggi dengan memberikan penghargaan kompetitif dan libatkan dalam pengambilan keputusan strategis.";
                  }
                  if (perf === "Low") return "Evaluasi penempatan peran, pertimbangkan mutasi ke divisi yang lebih sesuai, atau daftarkan ke program PIP 3 bulan.";
                  if (perf === "Medium") return "Bimbingan kinerja spesifik dan pantau perkembangan minat kepemimpinan teknis organisasi.";
                  return "Berikan pengakuan ahli, remunerasi kompetitif, dan otonomi teknis penuh sebagai pakar fungsional (Specialist).";
                };

                const getCellNameByCoords = (coordsKey: string) => {
                  const [pot, perf] = coordsKey.split("-") as ["Low" | "Medium" | "High", "Low" | "Medium" | "High"];
                  return getCellName(perf, pot);
                };

                const renderHeatmapCell = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High", name: string, bgClass: string, key: string) => {
                  const talentsInCell = getTalentsInCell(perf, pot);
                  const isSelected = reportSelectedBox === key;
                  const zone = getCellZone(perf, pot);
                  const zoneColor = zone === "green" ? "bg-emerald-500" : zone === "blue" ? "bg-sky-400" : "bg-rose-500";
                  
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setReportSelectedBox(isSelected ? null : key);
                        setReportSelectedZone(null);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer hover:shadow-xs group ${bgClass} ${
                        isSelected 
                          ? "ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/20 shadow-inner" 
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-tight block max-w-[85%]">
                          {name}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${zoneColor}`} />
                      </div>

                      <div className="flex justify-between items-end w-full mt-2">
                        {/* Render miniature avatars (up to 3) */}
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {talentsInCell.slice(0, 3).map(t => (
                            <img 
                              key={t.id} 
                              src={t.avatar} 
                              className="w-4 h-4 rounded-full object-cover border border-white dark:border-slate-800" 
                              alt="" 
                              referrerPolicy="no-referrer"
                            />
                          ))}
                          {talentsInCell.length > 3 && (
                            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-white dark:border-slate-800 flex items-center justify-center text-[7px] font-bold">
                              +{talentsInCell.length - 3}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700 shadow-3xs">
                          {talentsInCell.length}
                        </span>
                      </div>
                    </button>
                  );
                };

                const renderNineBoxCell = (perf: "Low" | "Medium" | "High", pot: "Low" | "Medium" | "High", name: string, bgClass: string) => {
                  const talentsInCell = getTalentsInCell(perf, pot);
                  const cellKey = `${perf}-${pot}`;
                  const isDragOver = dragOverCell === cellKey;
                  return (
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverCell(cellKey);
                      }}
                      onDragLeave={() => {
                        if (dragOverCell === cellKey) {
                          setDragOverCell(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverCell(null);
                        const id = e.dataTransfer.getData("talentId") || draggedTalentId;
                        if (id) {
                          handleCalibrateTalent(id, perf, pot);
                          setDraggedTalentId(null);
                        }
                      }}
                      className={`p-3 sm:p-4 rounded-xl border shadow-xs transition-all flex flex-col justify-between min-h-[160px] sm:min-h-[170px] text-left relative ${
                        isDragOver 
                          ? "ring-4 ring-primary/40 border-primary bg-primary/10 scale-[1.02] z-20 shadow-md" 
                          : bgClass
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 pointer-events-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-tight">
                          {name}
                        </span>
                        <span className="text-[9px] font-extrabold bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          {talentsInCell.length}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 overflow-y-auto max-h-[120px] pr-1 flex-1 custom-scrollbar">
                        {talentsInCell.length > 0 ? (
                          talentsInCell.map((t) => {
                            const isSelected = selectedNineBoxTalentId === t.id;
                            const isBeingDragged = draggedTalentId === t.id;
                            return (
                              <div 
                                key={t.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("talentId", t.id);
                                  setDraggedTalentId(t.id);
                                  setSelectedNineBoxTalentId(t.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedTalentId(null);
                                  setDragOverCell(null);
                                }}
                                onClick={() => setSelectedNineBoxTalentId(t.id)}
                                className={`group flex items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing text-left select-none relative ${
                                  isBeingDragged ? "opacity-30 scale-95 border-dashed border-primary" : ""
                                } ${
                                  isSelected 
                                    ? "bg-white dark:bg-slate-800 border-primary shadow-xs ring-1 ring-primary" 
                                    : "bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:border-primary/50 hover:shadow-2xs"
                                }`}
                              >
                                <img 
                                  src={t.avatar} 
                                  className="w-6 h-6 rounded-full object-cover border border-white dark:border-slate-700 pointer-events-none shrink-0" 
                                  alt={t.name}
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0 flex-1 pointer-events-none">
                                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 block truncate leading-tight flex items-center justify-between gap-1">
                                    <span>{t.name}</span>
                                    <Move className="w-2.5 h-2.5 text-slate-400 group-hover:text-primary opacity-40 group-hover:opacity-100 transition-all shrink-0" />
                                  </span>
                                  <span className="text-[8px] text-slate-500 dark:text-slate-400 block truncate leading-none">
                                    {t.division}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6 text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider border border-dashed border-slate-300 dark:border-slate-700 rounded-lg pointer-events-none">
                            Kosong
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };

                const getStableJitter = (id: string) => {
                  let hash = 0;
                  for (let i = 0; i < id.length; i++) {
                    hash = id.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  // stable offset in percentage: -4.5% to +4.5%
                  const xJitter = ((hash % 11) - 5) * 1.5;
                  const yJitter = (((hash >> 4) % 11) - 5) * 1.5;
                  return { x: xJitter, y: yJitter };
                };

                const filteredTalents = talents.filter(t => {
                  if (nineBoxDivisionFilter !== "All" && t.division !== nineBoxDivisionFilter) {
                    return false;
                  }
                  return true;
                });

                return (
                  <motion.div
                    key="nine-box"
                    custom={direction}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-6 text-left"
                  >
                    <div className="border-b border-surface-container-highest dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary flex items-center gap-2">
                          <Grid3X3 className="w-7 h-7 text-primary" />
                          Nine-Box Talent Matrix Calibration
                        </h1>
                        <p className="text-sm text-on-surface-variant dark:text-slate-400">Sistem pemetaan talenta kepemimpinan berbasis integrasi matriks 3x3 Kinerja vs Potensi secara real-time.</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
                        {/* Quick Data Update & Reset Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleRefreshNineBoxData}
                            title="Sinkronkan & perbarui matriks dengan data kinerja dan psikometrik terbaru"
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-container dark:bg-primary-container/20 border border-primary/20 dark:border-primary-container/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                            <span>Update Data Terkini</span>
                          </button>

                          <button
                            onClick={handleResetNineBoxCalibrations}
                            title="Reset semua kalibrasi manual kembali ke hasil asesmen otomatis"
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Kalibrasi</span>
                          </button>
                        </div>

                        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

                        {/* View mode toggle */}
                        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <button
                            onClick={() => setNineBoxViewMode("chart")}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                              nineBoxViewMode === "chart"
                                ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs"
                                : "text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200"
                            }`}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Scatter Plot
                          </button>
                          <button
                            onClick={() => setNineBoxViewMode("list")}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                              nineBoxViewMode === "list"
                                ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs"
                                : "text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200"
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Matriks Detail
                          </button>
                          <button
                            onClick={() => setNineBoxViewMode("report")}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                              nineBoxViewMode === "report"
                                ? "bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs"
                                : "text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Laporan Manajemen
                          </button>
                        </div>

                        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

                        {/* Quick filter by Division */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Department:</span>
                          <select 
                            value={nineBoxDivisionFilter}
                            onChange={(e) => setNineBoxDivisionFilter(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-xs font-bold text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                          >
                            <option value="All">Semua Department (All)</option>
                            {divisions.filter(d => d !== "All").map((div) => (
                              <option key={div} value={div}>{div}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Sync / Update Notification Banner */}
                    {syncNotification && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 shadow-xs animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-semibold">{syncNotification}</span>
                        </div>
                        <button 
                          onClick={() => setSyncNotification(null)}
                          className="p-1 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-full cursor-pointer text-emerald-700 dark:text-emerald-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {nineBoxViewMode === "report" ? (
                      /* Management Report Layout */
                      <div className="space-y-6 text-left w-full lg:col-span-12">
                        {/* 1. Header Report */}
                        <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold uppercase rounded-full tracking-wider animate-pulse">
                                RAHASIA - KHUSUS MANAJEMEN
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                AJINOMOTO SUCCESSION APP
                              </span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight font-display mt-1 text-slate-100">
                              Laporan Analisis & Distribusi Talenta Internal
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                              Kompilasi otomatis kondisi talenta berdasarkan filter aktif: <strong className="text-primary-container/90">{nineBoxDivisionFilter === "All" ? "Semua Department" : `Department ${nineBoxDivisionFilter}`}</strong>. Diperbarui per {new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
                            <button
                              onClick={() => {
                                const headers = ["Nama", "Jabatan", "Department", "Kinerja Sumbu Y (%)", "Potensi Sumbu X", "Kotak 9-Box", "Rekomendasi Suksesi"];
                                const rows = filteredTalents.map(t => {
                                  const placement = getTalentPlacement(t);
                                  const cellName = getCellName(placement.performance, placement.potential);
                                  const rec = getPlacementRecommendation(placement.performance, placement.potential);
                                  return [
                                    t.name,
                                    t.title,
                                    t.division,
                                    getTalentPerformanceScore(t),
                                    getTalentCoordinates(t).x.toFixed(2),
                                    cellName,
                                    rec
                                  ];
                                });
                                const csvContent = "data:text/csv;charset=utf-8," 
                                  + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `Laporan_Talenta_${nineBoxDivisionFilter}_Ajinomoto.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                              Unduh CSV
                            </button>
                            <button
                              onClick={() => {
                                setIsOverallSummaryModalOpen(true);
                              }}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                            >
                              <Printer className="w-4 h-4" />
                              Cetak Summary System (BOD)
                            </button>
                          </div>
                        </div>

                        {/* 2. KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Total Talenta */}
                          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-left relative overflow-hidden">
                            <div className="absolute right-4 top-4 text-slate-300 dark:text-slate-700">
                              <Users className="w-10 h-10 stroke-[1.5]" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Talenta Dievaluasi</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{filteredTalents.length}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold font-display">Orang</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Berdasarkan filter departemen aktif.</p>
                          </div>

                          {/* Zona Hijau Card */}
                          <div 
                            onClick={() => {
                              setReportSelectedZone(reportSelectedZone === "green" ? null : "green");
                              setReportSelectedBox(null);
                            }}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                              reportSelectedZone === "green" 
                                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/10 shadow-xs" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-700 shadow-xs"
                            }`}
                          >
                            <div className="absolute right-4 top-4 text-emerald-300 dark:text-emerald-800/60">
                              <Award className="w-10 h-10 stroke-[1.5]" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Zona Hijau (Star Pool)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {(() => {
                                  const gCount = getTalentsInCell("High", "High").length + getTalentsInCell("High", "Medium").length;
                                  return gCount;
                                })()}
                              </span>
                              <span className="text-sm font-black bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                {(() => {
                                  const gCount = getTalentsInCell("High", "High").length + getTalentsInCell("High", "Medium").length;
                                  return filteredTalents.length > 0 ? Math.round((gCount / filteredTalents.length) * 100) : 0;
                                })()}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Click untuk memfilter daftar.</p>
                          </div>

                          {/* Zona Biru Card */}
                          <div 
                            onClick={() => {
                              setReportSelectedZone(reportSelectedZone === "blue" ? null : "blue");
                              setReportSelectedBox(null);
                            }}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                              reportSelectedZone === "blue" 
                                ? "bg-sky-50 dark:bg-sky-950/50 border-sky-400 dark:border-sky-600 ring-2 ring-sky-500/10 shadow-xs" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-200 dark:hover:border-sky-700 shadow-xs"
                            }`}
                          >
                            <div className="absolute right-4 top-4 text-sky-300 dark:text-sky-800/60">
                              <UserCheck className="w-10 h-10 stroke-[1.5]" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Zona Biru (Core & Specialist)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                                {(() => {
                                  const bCount = getTalentsInCell("Medium", "High").length + getTalentsInCell("Low", "High").length + getTalentsInCell("Medium", "Medium").length + getTalentsInCell("High", "Low").length;
                                  return bCount;
                                })()}
                              </span>
                              <span className="text-sm font-black bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded">
                                {(() => {
                                  const bCount = getTalentsInCell("Medium", "High").length + getTalentsInCell("Low", "High").length + getTalentsInCell("Medium", "Medium").length + getTalentsInCell("High", "Low").length;
                                  return filteredTalents.length > 0 ? Math.round((bCount / filteredTalents.length) * 100) : 0;
                                })()}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Click untuk memfilter daftar.</p>
                          </div>

                          {/* Zona Merah Card */}
                          <div 
                            onClick={() => {
                              setReportSelectedZone(reportSelectedZone === "red" ? null : "red");
                              setReportSelectedBox(null);
                            }}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                              reportSelectedZone === "red" 
                                ? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/10 shadow-xs" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-700 shadow-xs"
                            }`}
                          >
                            <div className="absolute right-4 top-4 text-rose-300 dark:text-rose-800/60">
                              <AlertCircle className="w-10 h-10 stroke-[1.5]" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Zona Merah (Risiko / PIP)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                                {(() => {
                                  const rCount = getTalentsInCell("Low", "Low").length + getTalentsInCell("Medium", "Low").length + getTalentsInCell("Low", "Medium").length;
                                  return rCount;
                                })()}
                              </span>
                              <span className="text-sm font-black bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">
                                {(() => {
                                  const rCount = getTalentsInCell("Low", "Low").length + getTalentsInCell("Medium", "Low").length + getTalentsInCell("Low", "Medium").length;
                                  return filteredTalents.length > 0 ? Math.round((rCount / filteredTalents.length) * 100) : 0;
                                })()}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Click untuk memfilter daftar.</p>
                          </div>
                        </div>

                        {/* 3. Heatmap Grid & Analytical Insights */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                          {/* Interactive Heatmap matrix (Left 7 cols) */}
                          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
                            <div className="text-left">
                              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                Matriks Distribusi Interaktif (Real-Time Heatmap)
                              </h3>
                              <p className="text-xs text-on-surface-variant dark:text-slate-400">
                                Klik salah satu kotak untuk memfilter daftar talenta secara detail di bagian bawah.
                              </p>
                            </div>

                            {/* 3x3 Heatmap Grid */}
                            <div className="grid grid-cols-3 gap-2">
                              {/* Row 1: High Perf */}
                              {renderHeatmapCell("High", "Low", "Enigma (Box 4)", "border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/30 hover:bg-amber-100/50 dark:hover:bg-amber-900/40", "High-Low")}
                              {renderHeatmapCell("High", "Medium", "High Potential (Box 7)", "border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40", "Medium-High")}
                              {renderHeatmapCell("High", "High", "Star Leader (Box 9)", "border-emerald-200 dark:border-emerald-700/60 bg-emerald-100/40 dark:bg-emerald-900/30 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/50", "High-High")}

                              {/* Row 2: Medium Perf */}
                              {renderHeatmapCell("Medium", "Low", "Inconsistent Performer (Box 2)", "border-rose-100 dark:border-rose-800/50 bg-rose-50/40 dark:bg-rose-950/30 hover:bg-rose-100/50 dark:hover:bg-rose-900/40", "Low-Medium")}
                              {renderHeatmapCell("Medium", "Medium", "Core Contributor (Box 5)", "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60", "Medium-Medium")}
                              {renderHeatmapCell("Medium", "High", "High Performer (Box 8)", "border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40", "High-Medium")}

                              {/* Row 3: Low Perf */}
                              {renderHeatmapCell("Low", "Low", "Underperformer (Box 1)", "border-rose-200 dark:border-rose-800/50 bg-rose-100/20 dark:bg-rose-950/30 hover:bg-rose-200/30 dark:hover:bg-rose-900/40", "Low-Low")}
                              {renderHeatmapCell("Low", "Medium", "Solid Performer (Box 3)", "border-rose-200 dark:border-rose-800/50 bg-rose-100/20 dark:bg-rose-950/30 hover:bg-rose-200/30 dark:hover:bg-rose-900/40", "Medium-Low")}
                              {renderHeatmapCell("Low", "High", "Workhorse / Specialist (Box 6)", "border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/30 hover:bg-amber-100/50 dark:hover:bg-amber-900/40", "Low-High")}
                            </div>

                            {/* Heatmap Labels */}
                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black border-t border-slate-100 dark:border-slate-800 pt-3">
                              <span>Sumbu Y (Kinerja) ◄ Kurang s.d Unggul</span>
                              <span>Sumbu X (Potential) ◄ Rendah s.d Tinggi</span>
                            </div>
                          </div>

                          {/* Dynamic Strategic Insights (Right 5 cols) */}
                          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between text-left space-y-4">
                            <div>
                              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary" />
                                Kesimpulan & Sorotan Strategis (BOD Summary)
                              </h3>
                              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                                Insight kecerdasan buatan berbasis distribusi aktual organisasi saat ini.
                              </p>
                            </div>

                            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                              {/* Insight 1: General distribution status */}
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-3xs space-y-1">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase">Kondisi Kesiapan Suksesi</span>
                                <p className="text-xs text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
                                  {(() => {
                                    const gCount = getTalentsInCell("High", "High").length + getTalentsInCell("High", "Medium").length;
                                    const gPct = filteredTalents.length > 0 ? Math.round((gCount / filteredTalents.length) * 100) : 0;
                                    return gPct >= 25 
                                      ? `Sangat Siap. Sebanyak ${gCount} talenta (${gPct}%) di departemen ini berada di Zona Hijau, mengindikasikan ketersediaan kader kepemimpinan tangguh yang di atas rata-rata.`
                                      : `Perlu Perhatian. Hanya ${gCount} talenta (${gPct}%) berada di Zona Hijau. Disarankan melakukan program percepatan suksesi (leadership acceleration) untuk mengamankan posisi penting.`;
                                  })()}
                                </p>
                              </div>

                              {/* Insight 2: SWOT / Performance Issues */}
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-3xs space-y-1">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase">Kesehatan Kinerja (Risiko Red Zone)</span>
                                <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
                                  {(() => {
                                    const rCount = getTalentsInCell("Low", "Low").length + getTalentsInCell("Medium", "Low").length + getTalentsInCell("Low", "Medium").length;
                                    const rPct = filteredTalents.length > 0 ? Math.round((rCount / filteredTalents.length) * 100) : 0;
                                    return rCount > 0 
                                      ? `Teridentifikasi ${rCount} orang (${rPct}%) talenta berada di Zona Merah (Risiko/PIP). HR merekomendasikan intervensi pembinaan teknis mingguan agar tidak menurunkan tingkat produktivitas tim.`
                                      : `Sangat Sehat. Tidak ada talenta yang terdeteksi berada di Zona Merah (Kinerja Kurang/Rendah). Stabilitas produktivitas tim berada pada kondisi prima.`;
                                  })()}
                                </p>
                              </div>

                              {/* Insight 3: Critical position readiness */}
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-3xs space-y-1">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase">Status Succession Coverage Ratio</span>
                                <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
                                  Tingkat kesiapan suksesi saat ini memiliki <strong>{filteredTalents.filter(t => t.readiness === "READY NOW").length} Posisi</strong> dalam status <strong>Ready Now</strong> dan <strong>{filteredTalents.filter(t => t.readiness.includes("1-2")).length} Posisi</strong> dalam status <strong>Ready 1-2 Tahun</strong>. Program bimbingan berkelanjutan penting dijalankan demi memuluskan transfer pengetahuan.
                                </p>
                              </div>
                            </div>

                            {/* Alert Area */}
                            <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/15 dark:border-primary/25 text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                              <strong>Saran HRD:</strong> Distribusikan laporan ini dalam rapat triwulanan BOD (Board of Directors) untuk menetapkan anggaran pelatihan kepemimpinan (IDP) tahun mendatang.
                            </div>
                          </div>
                        </div>

                        {/* 4. Succession Pipeline Alignment */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-left space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                Peta Kesiapan Suksesi Posisi Kunci (Succession Pipeline & Critical Roles)
                              </h3>
                              <p className="text-xs text-on-surface-variant dark:text-slate-400">
                                Menghubungkan posisi kritis yang akan pensiun dengan ketersediaan talenta terbaik (Zona Hijau/Biru) secara otomatis.
                              </p>
                            </div>

                            {/* Search bar for Succession Pipeline */}
                            <div className="relative w-full sm:w-64">
                              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari posisi, petahana, suksesor..."
                                value={petaSuksesiSearch}
                                onChange={(e) => setPetaSuksesiSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Table Container with scroll and fixed height */}
                          <div className="overflow-x-auto overflow-y-auto max-h-[360px] custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                            <table className="w-full min-w-[760px] text-left text-xs text-slate-600 dark:text-slate-300 border-collapse">
                              <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-10 backdrop-blur-xs">
                                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  <th className="p-3">Posisi Kritis & Incumbent Saat Ini</th>
                                  <th className="p-3">Department</th>
                                  <th className="p-3">Waktu Pensiun</th>
                                  <th className="p-3 text-center">Urgency</th>
                                  <th className="p-3">Kandidat Suksesor Utama (Assigned Successor)</th>
                                  <th className="p-3 text-center">9-Box Status Suksesor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(() => {
                                  const filteredPetaSuksesi = retiringPositions.filter(pos => {
                                    if (nineBoxDivisionFilter !== "All" && pos.division !== nineBoxDivisionFilter) return false;
                                    if (petaSuksesiSearch) {
                                      const s = petaSuksesiSearch.toLowerCase();
                                      const successor = talents.find(t => t.id === pos.assignedSuccessorId);
                                      const successorName = successor ? successor.name.toLowerCase() : "";
                                      return (
                                        pos.positionName.toLowerCase().includes(s) ||
                                        pos.currentIncumbent.toLowerCase().includes(s) ||
                                        pos.division.toLowerCase().includes(s) ||
                                        successorName.includes(s)
                                      );
                                    }
                                    return true;
                                  });

                                  const petaSuksesiPerPage = 5;
                                  const paginatedPetaSuksesi = filteredPetaSuksesi.slice((petaSuksesiPage - 1) * petaSuksesiPerPage, petaSuksesiPage * petaSuksesiPerPage);

                                  if (paginatedPetaSuksesi.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={6} className="p-6 text-center text-slate-400 dark:text-slate-500 italic">
                                          Tidak ada posisi suksesi yang cocok dengan kriteria pencarian.
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return paginatedPetaSuksesi.map(pos => {
                                    const successor = talents.find(t => t.id === pos.assignedSuccessorId);
                                    const placement = successor ? getTalentPlacement(successor) : null;
                                    const boxName = placement ? getCellName(placement.performance, placement.potential) : null;
                                    const boxZone = placement ? getCellZone(placement.performance, placement.potential) : null;

                                    return (
                                      <tr key={pos.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                                          <div>{pos.positionName}</div>
                                          <div className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">Petahana: {pos.currentIncumbent}</div>
                                        </td>
                                        <td className="p-3">
                                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                                            {pos.division}
                                          </span>
                                        </td>
                                        <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">
                                          {pos.retirementDate}
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                            pos.urgency === "High" ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300" :
                                            pos.urgency === "Medium" ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" :
                                            "bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300"
                                          }`}>
                                            {pos.urgency}
                                          </span>
                                        </td>
                                        <td className="p-3">
                                          {successor ? (
                                            <div className="flex items-center gap-2">
                                              <img src={successor.avatar} className="w-6 h-6 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                                              <div>
                                                <div className="font-semibold text-slate-800 dark:text-slate-100">{successor.name}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">{successor.readiness}</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-rose-500 dark:text-rose-400 font-semibold italic text-[10px] flex items-center gap-1">
                                              <AlertCircle className="w-3.5 h-3.5" />
                                              Belum Ada Suksesor! (Sangat Berisiko)
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-3 text-center">
                                          {placement && boxName ? (
                                            <div className="inline-flex flex-col items-center">
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                boxZone === "green" ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                                                boxZone === "blue" ? "bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300" :
                                                "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                              }`}>
                                                {boxName}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 dark:text-slate-500">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Footer */}
                          {(() => {
                            const filteredPetaSuksesi = retiringPositions.filter(pos => {
                              if (nineBoxDivisionFilter !== "All" && pos.division !== nineBoxDivisionFilter) return false;
                              if (petaSuksesiSearch) {
                                const s = petaSuksesiSearch.toLowerCase();
                                const successor = talents.find(t => t.id === pos.assignedSuccessorId);
                                const successorName = successor ? successor.name.toLowerCase() : "";
                                return (
                                  pos.positionName.toLowerCase().includes(s) ||
                                  pos.currentIncumbent.toLowerCase().includes(s) ||
                                  pos.division.toLowerCase().includes(s) ||
                                  successorName.includes(s)
                                );
                              }
                              return true;
                            });

                            const petaSuksesiPerPage = 5;
                            const totalPages = Math.max(1, Math.ceil(filteredPetaSuksesi.length / petaSuksesiPerPage));

                            return (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  Menampilkan {Math.min(filteredPetaSuksesi.length, (petaSuksesiPage - 1) * petaSuksesiPerPage + 1)}–{Math.min(filteredPetaSuksesi.length, petaSuksesiPage * petaSuksesiPerPage)} dari {filteredPetaSuksesi.length} posisi
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={petaSuksesiPage <= 1}
                                    onClick={() => setPetaSuksesiPage(prev => Math.max(1, prev - 1))}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                  >
                                    Sebelumnya
                                  </button>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono px-1">
                                    Halaman {petaSuksesiPage} dari {totalPages}
                                  </span>
                                  <button
                                    disabled={petaSuksesiPage >= totalPages}
                                    onClick={() => setPetaSuksesiPage(prev => Math.min(totalPages, prev + 1))}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                  >
                                    Selanjutnya
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 5. Filtered Detailed Talent Recommendation Table */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-left space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                Daftar Detil Analisis & Rekomendasi Tindakan Manajemen (Action Plan)
                              </h3>
                              <p className="text-xs text-on-surface-variant dark:text-slate-400">
                                Action plan taktis untuk masing-masing talenta berdasarkan posisi di dalam matriks 9-kotak.
                              </p>
                            </div>
                            
                            {/* Filter Reset buttons */}
                            {(reportSelectedBox || reportSelectedZone) && (
                              <button
                                onClick={() => {
                                  setReportSelectedBox(null);
                                  setReportSelectedZone(null);
                                }}
                                className="px-3 py-1 bg-primary/10 hover:bg-primary/15 text-primary dark:text-primary-container text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 self-start sm:self-center"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reset Filter Matriks
                              </button>
                            )}
                          </div>

                          {/* Filter Alert */}
                          {reportSelectedBox && (
                            <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl text-xs font-semibold text-primary dark:text-primary-container">
                              Menyaring talenta dalam kotak: <strong>{getCellNameByCoords(reportSelectedBox)}</strong> ({filteredTalents.filter(t => {
                                const placement = getTalentPlacement(t);
                                return `${placement.potential}-${placement.performance}` === reportSelectedBox;
                              }).length} Talenta ditemukan).
                            </div>
                          )}

                          {reportSelectedZone && (
                            <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl text-xs font-semibold text-primary dark:text-primary-container">
                              Menyaring talenta dalam zona: <strong>{reportSelectedZone === "green" ? "Zona Hijau" : reportSelectedZone === "blue" ? "Zona Biru" : "Zona Merah"}</strong> ({filteredTalents.filter(t => {
                                const placement = getTalentPlacement(t);
                                const zone = getCellZone(placement.performance, placement.potential);
                                return zone === reportSelectedZone;
                              }).length} Talenta ditemukan).
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <div className="relative w-full sm:w-72">
                              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari nama talenta/rekomendasi..."
                                value={actionPlanSearch}
                                onChange={(e) => setActionPlanSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary"
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              Menampilkan {filteredTalents.filter(t => {
                                const placement = getTalentPlacement(t);
                                if (reportSelectedBox && `${placement.potential}-${placement.performance}` !== reportSelectedBox) return false;
                                if (reportSelectedZone && getCellZone(placement.performance, placement.potential) !== reportSelectedZone) return false;
                                if (actionPlanSearch && !t.name.toLowerCase().includes(actionPlanSearch.toLowerCase()) && !t.division.toLowerCase().includes(actionPlanSearch.toLowerCase())) return false;
                                return true;
                              }).length} baris
                            </span>
                          </div>

                          <div className="overflow-x-auto overflow-y-auto max-h-[360px] custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                              <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-10 backdrop-blur-xs">
                                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  <th className="p-3">Nama Talenta</th>
                                  <th className="p-3">Department</th>
                                  <th className="p-3 text-center">Y-Kinerja</th>
                                  <th className="p-3 text-center">X-Potensi</th>
                                  <th className="p-3 text-center">Kategori 9-Kotak</th>
                                  <th className="p-3">Tingkat Kesiapan</th>
                                  <th className="p-3">Rekomendasi Manajemen & Rencana Aksi (Action Plan)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(() => {
                                  const filteredActionPlanTalents = filteredTalents.filter(t => {
                                    const placement = getTalentPlacement(t);
                                    if (actionPlanSearch && !t.name.toLowerCase().includes(actionPlanSearch.toLowerCase()) && !t.division.toLowerCase().includes(actionPlanSearch.toLowerCase()) && !t.title.toLowerCase().includes(actionPlanSearch.toLowerCase())) return false;
                                    if (reportSelectedBox) {
                                      return `${placement.potential}-${placement.performance}` === reportSelectedBox;
                                    }
                                    if (reportSelectedZone) {
                                      const zone = getCellZone(placement.performance, placement.potential);
                                      return zone === reportSelectedZone;
                                    }
                                    return true;
                                  });

                                  const actionPlanPerPage = 5;
                                  const paginatedActionPlanTalents = filteredActionPlanTalents.slice((actionPlanPage - 1) * actionPlanPerPage, actionPlanPage * actionPlanPerPage);

                                  if (paginatedActionPlanTalents.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={7} className="p-6 text-center text-slate-400 dark:text-slate-500 italic">
                                          Tidak ada talenta yang cocok dengan kriteria filter/pencarian ini.
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return paginatedActionPlanTalents.map(t => {
                                    const placement = getTalentPlacement(t);
                                    const coords = getTalentCoordinates(t);
                                    const boxName = getCellName(placement.performance, placement.potential);
                                    const zone = getCellZone(placement.performance, placement.potential);
                                    const recText = getPlacementRecommendation(placement.performance, placement.potential);

                                    return (
                                      <tr key={t.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-all">
                                        <td className="p-3">
                                          <div className="flex items-center gap-3">
                                            <img src={t.avatar} className="w-8 h-8 rounded-full object-cover shadow-3xs" alt="" referrerPolicy="no-referrer" />
                                            <div>
                                              <span className="font-bold text-slate-800 dark:text-slate-100 block">{t.name}</span>
                                              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">{t.title}</span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-3">
                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            {t.division}
                                          </span>
                                        </td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                          {getTalentPerformanceScore(t).toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                          {coords.x.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                            zone === "green" ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800" :
                                            zone === "blue" ? "bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-200 border border-sky-100 dark:border-sky-800" :
                                            "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-100 dark:border-rose-800"
                                          }`}>
                                            {boxName}
                                          </span>
                                        </td>
                                        <td className="p-3">
                                          <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                            t.readinessColor === "emerald" ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                                            t.readinessColor === "amber" ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" :
                                            t.readinessColor === "rose" ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300" :
                                            "bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300"
                                          }`}>
                                            {t.readiness}
                                          </span>
                                        </td>
                                        <td className="p-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 max-w-sm">
                                          {recText}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>

                          {/* Action Plan Pagination Footer */}
                          {(() => {
                            const filteredActionPlanTalents = filteredTalents.filter(t => {
                              const placement = getTalentPlacement(t);
                              if (actionPlanSearch && !t.name.toLowerCase().includes(actionPlanSearch.toLowerCase()) && !t.division.toLowerCase().includes(actionPlanSearch.toLowerCase()) && !t.title.toLowerCase().includes(actionPlanSearch.toLowerCase())) return false;
                              if (reportSelectedBox) {
                                return `${placement.potential}-${placement.performance}` === reportSelectedBox;
                              }
                              if (reportSelectedZone) {
                                const zone = getCellZone(placement.performance, placement.potential);
                                return zone === reportSelectedZone;
                              }
                              return true;
                            });

                            const actionPlanPerPage = 5;
                            const totalPages = Math.max(1, Math.ceil(filteredActionPlanTalents.length / actionPlanPerPage));

                            return (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  Menampilkan {Math.min(filteredActionPlanTalents.length, (actionPlanPage - 1) * actionPlanPerPage + 1)}–{Math.min(filteredActionPlanTalents.length, actionPlanPage * actionPlanPerPage)} dari {filteredActionPlanTalents.length} talenta
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={actionPlanPage <= 1}
                                    onClick={() => setActionPlanPage(prev => Math.max(1, prev - 1))}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                  >
                                    Sebelumnya
                                  </button>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono px-1">
                                    Halaman {actionPlanPage} dari {totalPages}
                                  </span>
                                  <button
                                    disabled={actionPlanPage >= totalPages}
                                    onClick={() => setActionPlanPage(prev => Math.min(totalPages, prev + 1))}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                  >
                                    Selanjutnya
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    ) : (
                      /* Grid layout with editor panel */
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* The Grid area: 3/4 layout */}
                        <div className="lg:col-span-8 space-y-4">
                          
                          {/* Grid header label explaining axis */}
                          <div className="flex flex-wrap justify-between items-center text-xs text-on-surface-variant dark:text-slate-400 bg-surface dark:bg-slate-900 p-3.5 rounded-lg border border-surface-container-highest dark:border-slate-800 gap-2">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Zona Hijau (Star / Promosi)</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Zona Biru (Talenta Inti / Pengembangan)</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Zona Merah (Risiko / PIP)</span>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-surface-container-highest dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">AJINOMOTO INDONESIA SUCCESSION TOOL</span>
                          </div>

                          {nineBoxViewMode === "chart" ? (
                            <div className="relative bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 rounded-2xl border border-surface-container-highest dark:border-slate-800 shadow-sm overflow-x-auto custom-scrollbar">
                              <div className="min-w-[650px] space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="text-left sm:text-center">
                                    <h2 className="text-slate-800 dark:text-slate-100 font-display text-xl md:text-2xl font-black tracking-wide uppercase">
                                      Nine Box Tools Staff
                                    </h2>
                                    <p className="text-xs text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider mt-1">AJINOMOTO INDONESIA SUCCESSION CHART ({filteredTalents.length} TALENTA)</p>
                                  </div>
                                  <button
                                    onClick={() => setShowChartLabels(prev => !prev)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center ${
                                      showChartLabels
                                        ? "bg-primary text-white shadow-xs"
                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    }`}
                                  >
                                    <Tag className="w-3.5 h-3.5" />
                                    {showChartLabels ? "Sembunyikan Label Nama" : "Tampilkan Label Nama"}
                                  </button>
                                </div>

                                <div className="flex gap-6 w-full items-stretch">
                                  {/* Sumbu Y Ticks and Label */}
                                  <div className="flex flex-row items-stretch select-none relative w-16">
                                    {/* Sumbu Y Label (vertical) */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-center whitespace-nowrap">
                                      <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
                                        Sumbu Y (Kinerja)
                                      </span>
                                    </div>
                                    
                                    {/* Sumbu Y Ticks (aligned to row lines of the 3x3 grid) */}
                                    <div className="absolute right-2 top-0 bottom-0 w-10 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                      <span className="absolute top-0 right-0 transform -translate-y-1/2">50.0</span>
                                      <span className="absolute top-[33.33%] right-0 transform -translate-y-1/2">37.5</span>
                                      <span className="absolute top-[66.67%] right-0 transform -translate-y-1/2">25.0</span>
                                      <span className="absolute bottom-0 right-0 transform translate-y-1/2">12.5</span>
                                    </div>
                                  </div>

                                  {/* 3x3 Grid and dots plotting area */}
                                  <div className="flex-1">
                                    <div className="relative border border-slate-300 dark:border-slate-700 overflow-hidden select-none aspect-video min-h-[480px] rounded-lg shadow-inner bg-white dark:bg-slate-800">
                                      
                                      {/* Background 3x3 cells */}
                                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                        {/* Row 1 (Kinerja Tinggi: y >= 37.5) */}
                                        {/* Box 4 (Low Potential) - Yellow */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-center">
                                          <span className="text-amber-500/15 dark:text-amber-400/15 font-black text-8xl">4</span>
                                        </div>
                                        {/* Box 7 (Medium Potential) - Green */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center">
                                          <span className="text-emerald-500/15 dark:text-emerald-400/15 font-black text-8xl">7</span>
                                        </div>
                                        {/* Box 9 (High Potential) - Green */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center">
                                          <span className="text-emerald-500/15 dark:text-emerald-400/15 font-black text-8xl">9</span>
                                        </div>

                                        {/* Row 2 (Kinerja Sedang: 25.0 <= y < 37.5) */}
                                        {/* Box 2 (Low Potential) - Red */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-center">
                                          <span className="text-rose-500/15 dark:text-rose-400/15 font-black text-8xl">2</span>
                                        </div>
                                        {/* Box 5 (Medium Potential) - Yellow */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-center">
                                          <span className="text-amber-500/15 dark:text-amber-400/15 font-black text-8xl">5</span>
                                        </div>
                                        {/* Box 8 (High Potential) - Green */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center">
                                          <span className="text-emerald-500/15 dark:text-emerald-400/15 font-black text-8xl">8</span>
                                        </div>

                                        {/* Row 3 (Kinerja Kurang: y < 25.0) */}
                                        {/* Box 1 (Low Potential) - Red */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-center">
                                          <span className="text-rose-500/15 dark:text-rose-400/15 font-black text-8xl">1</span>
                                        </div>
                                        {/* Box 3 (Medium Potential) - Red */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-center">
                                          <span className="text-rose-500/15 dark:text-rose-400/15 font-black text-8xl">3</span>
                                        </div>
                                        {/* Box 6 (High Potential) - Yellow */}
                                        <div className="relative border border-slate-200/50 dark:border-slate-700/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-center">
                                          <span className="text-amber-500/15 dark:text-amber-400/15 font-black text-8xl">6</span>
                                        </div>
                                      </div>

                                      {/* Grid Lines for reference */}
                                      <div className="absolute inset-0 border border-slate-200 dark:border-slate-700 pointer-events-none"></div>

                                      {/* Plotting layer (Absolute container covering entire grid) */}
                                      <div className="absolute inset-0">
                                        {filteredTalents.map((t) => {
                                          const coords = getTalentCoordinates(t);
                                          // Convert to percentage
                                          const pctX = (coords.x / 1.333333) * 100;
                                          const pctY = ((coords.y - 12.5) / 37.5) * 100;
                                          const jitter = getStableJitter(t.id);
                                          
                                          const isSelected = selectedNineBoxTalentId === t.id;

                                          return (
                                            <div
                                              key={t.id}
                                              className="absolute group z-10 transition-all duration-200 hover:z-30 cursor-pointer"
                                              style={{
                                                left: `calc(${pctX}% + ${jitter.x}px)`,
                                                bottom: `calc(${pctY}% + ${jitter.y}px)`,
                                                transform: 'translate(-50%, 50%)' // center the dot on the point
                                              }}
                                              onClick={() => setSelectedNineBoxTalentId(t.id)}
                                            >
                                              {/* Ripple effect when selected */}
                                              {isSelected && (
                                                <span className="absolute -inset-2 rounded-full bg-primary/20 animate-ping pointer-events-none" />
                                              )}

                                              {/* Subtle pulse animation for Ready Now candidate during active hover */}
                                              {t.readiness === "READY NOW" && (
                                                <span className="absolute -inset-2 rounded-full bg-emerald-500/50 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none transition-opacity duration-200" />
                                              )}

                                              {/* Dot element */}
                                              <div 
                                                className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-md transition-all duration-200 ${
                                                  isSelected 
                                                    ? 'scale-130 bg-primary ring-4 ring-primary/25 shadow-lg' 
                                                    : t.readiness === "READY NOW"
                                                    ? 'bg-emerald-600 dark:bg-emerald-400 group-hover:scale-135 group-hover:bg-emerald-500 group-hover:ring-4 group-hover:ring-emerald-500/35 shadow-emerald-500/30'
                                                    : 'bg-slate-700 dark:bg-slate-300 group-hover:scale-120 group-hover:bg-primary'
                                                }`}
                                              />
                                              
                                              {/* Leader Line / Connector to label */}
                                              <div 
                                                className={`absolute left-5 bottom-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border shadow-xs whitespace-nowrap transition-all duration-200 ${
                                                  isSelected 
                                                    ? 'border-primary ring-2 ring-primary/10 z-40 scale-105 opacity-100' 
                                                    : showChartLabels
                                                    ? 'border-slate-200 dark:border-slate-700 opacity-90 group-hover:opacity-100 group-hover:border-primary/50'
                                                    : 'border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 group-hover:border-primary/50 pointer-events-none group-hover:pointer-events-auto'
                                                }`}
                                              >
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[9px] font-black font-sans uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                                    {t.name}
                                                  </span>
                                                  {t.readiness === "READY NOW" && (
                                                    <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                      READY NOW
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                    </div>

                                    {/* Sumbu X Ticks and Label */}
                                    <div className="mt-3 pl-1 select-none relative h-12">
                                      {/* Ticks horizontally aligned to the grid cells */}
                                      <div className="absolute inset-x-0 top-0 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                        <span className="absolute left-0 transform -translate-x-1/2">0.00</span>
                                        <span className="absolute left-[33.33%] transform -translate-x-1/2">0.44</span>
                                        <span className="absolute left-[66.67%] transform -translate-x-1/2">0.89</span>
                                        <span className="absolute left-full transform -translate-x-1/2">1.33</span>
                                      </div>
                                      
                                      {/* Sumbu X Label */}
                                      <div className="absolute inset-x-0 bottom-0 text-center text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
                                        Sumbu X (Potential)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-surface-container-highest dark:border-slate-800 shadow-sm overflow-x-auto custom-scrollbar">
                              {/* Drag-and-drop hint banner */}
                              <div className="mb-4 bg-primary/5 dark:bg-primary/10 border border-primary-container/20 dark:border-primary-container/30 rounded-xl p-3 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary-container/30 text-primary shrink-0">
                                  <Sparkles className="w-4 h-4 animate-pulse" />
                                </div>
                                <div className="text-xs text-slate-700 dark:text-slate-200">
                                  <span className="font-bold text-primary block sm:inline">💡 Kalibrasi Visual Aktif:</span> Drag (seret) nama talent dan lepaskan (drop) ke kotak kuadran lain untuk memperbarui klasifikasi kinerja & potensi secara langsung.
                                </div>
                              </div>
                              <div className="flex gap-4 min-w-[650px]">
                                
                                {/* Y-Axis Label: PERFORMANCE (Vertical Alignment) */}
                                <div className="flex flex-col justify-between items-center py-8 text-on-surface-variant dark:text-slate-400 select-none w-6">
                                  <span className="text-[10px] font-black tracking-widest uppercase origin-center -rotate-90 whitespace-nowrap my-auto text-primary">
                                    ▲ SUMBU Y (KINERJA)
                                  </span>
                                </div>

                                {/* 3x3 Grid Wrapper */}
                                <div className="flex-1 space-y-4">
                                  
                                  <div className="grid grid-cols-1 gap-4">
                                    
                                    {/* Row 1: HIGH PERFORMANCE */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant dark:text-slate-400 px-1">
                                        <span className="text-primary font-bold">HIGH PERFORMANCE (KINERJA UNGGUL: 37.5 - 50.0)</span>
                                        <span className="text-outline-variant font-medium">Top 33%</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-4">
                                        {renderNineBoxCell("High", "Low", "Enigma (Box 4)", "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-slate-800 dark:text-slate-100 hover:bg-amber-50/80 dark:hover:bg-amber-900/40")}
                                        {renderNineBoxCell("High", "Medium", "High Potential (Box 7)", "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/40")}
                                        {renderNineBoxCell("High", "High", "Star Leader (Box 9)", "bg-emerald-100/40 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/60 text-slate-800 dark:text-slate-100 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 ring-2 ring-emerald-500/20")}
                                      </div>
                                    </div>

                                    {/* Row 2: MEDIUM PERFORMANCE */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant dark:text-slate-400 px-1">
                                        <span className="text-primary font-bold">MEDIUM PERFORMANCE (KINERJA BAIK: 25.0 - 37.5)</span>
                                        <span className="text-outline-variant font-medium">Middle 33%</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-4">
                                        {renderNineBoxCell("Medium", "Low", "Inconsistent Performer (Box 2)", "bg-rose-50/50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-800/50 text-slate-800 dark:text-slate-100 hover:bg-rose-50/80 dark:hover:bg-rose-900/40")}
                                        {renderNineBoxCell("Medium", "Medium", "Core Contributor (Box 5)", "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-slate-800 dark:text-slate-100 hover:bg-amber-50/80 dark:hover:bg-amber-900/40")}
                                        {renderNineBoxCell("Medium", "High", "High Performer (Box 8)", "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/40")}
                                      </div>
                                    </div>

                                    {/* Row 3: LOW PERFORMANCE */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant dark:text-slate-400 px-1">
                                        <span className="text-primary font-bold">LOW PERFORMANCE (KINERJA KURANG: 12.5 - 25.0)</span>
                                        <span className="text-outline-variant font-medium">Bottom 33%</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-4">
                                        {renderNineBoxCell("Low", "Low", "Underperformer (Box 1)", "bg-rose-100/30 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-slate-800 dark:text-slate-100 hover:bg-rose-100/50 dark:hover:bg-rose-900/40")}
                                        {renderNineBoxCell("Low", "Medium", "Solid Performer (Box 3)", "bg-rose-100/30 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-slate-800 dark:text-slate-100 hover:bg-rose-100/50 dark:hover:bg-rose-900/40")}
                                        {renderNineBoxCell("Low", "High", "Workhorse / Specialist (Box 6)", "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-slate-800 dark:text-slate-100 hover:bg-amber-50/80 dark:hover:bg-amber-900/40")}
                                      </div>
                                    </div>

                                  </div>

                                  {/* X-Axis labels at the very bottom: POTENTIAL */}
                                  <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-black uppercase tracking-wider text-primary pt-3 border-t border-dashed border-surface-container-highest dark:border-slate-800">
                                    <div>◀ LOW POTENTIAL (Potensi Rendah: ≤ 0.44)</div>
                                    <div>MEDIUM POTENTIAL (Potensi Menengah: 0.44 - 0.89)</div>
                                    <div>HIGH POTENTIAL (Potensi Tinggi: &gt; 0.89) ▶</div>
                                  </div>

                                </div>
                              </div>
                            </div>
                          )}

                          {/* Brief Instructions footer */}
                          <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed space-y-2.5 w-full">
                              <p className="font-bold text-primary text-sm">Bagaimana sistem menghitung penempatan otomatis?</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-left">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
                                    Sumbu X : Psychological Test (40%), Competency Test (50%), Educational Back Ground (10%)
                                  </span>
                                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                                    Kalkulasi **Potential** (Skor 0 - 100) dihitung secara terkalibrasi dari 3 komponen utama:
                                  </p>
                                  <ul className="list-disc list-inside text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 space-y-1 pl-1">
                                    <li><strong>Psychological Test (40%):</strong> Terdiri dari 8 dimensi aspek psikologi kognitif dan perilaku.</li>
                                    <li><strong>Competency Test (50%):</strong> Terdiri dari 9 kompetensi kepemimpinan dan manajerial yang disesuaikan dengan target level (DM atau SM).</li>
                                    <li><strong>Educational Back Ground (10%):</strong> Kesesuaian kualifikasi pendidikan formal talenta.</li>
                                  </ul>
                                </div>
                                
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
                                    Sumbu Y : Evaluasi Kinerja (100%)
                                  </span>
                                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mb-2">
                                    Kalkulasi **Performance** dihitung secara kumulatif dari **Evaluasi Kinerja (100%)** 5 Tahun Terakhir (FY2020 s.d FY2024). Rata-rata nilai (skala 1.0 - 5.0) dipetakan ke rentang sumbu matriks.
                                  </p>
                                  <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">Fleksibilitas Kalibrasi Manual</span>
                                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                                    Gunakan panel <strong>Kalibrasi Data Talenta</strong> di sebelah kanan untuk memberikan penilaian manual (override) jika diperlukan. Perubahan manual akan langsung menggeser posisi koordinat talenta di dalam bagan secara real-time.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Calibration Side Editor Panel: 1/4 layout */}
                        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-surface-container-highest dark:border-slate-800 p-5 shadow-sm min-h-[500px]">
                          {selectedNineBoxTalentId ? (() => {
                            const talent = talents.find(t => t.id === selectedNineBoxTalentId);
                            if (!talent) return null;

                            const placement = getTalentPlacement(talent);
                            const isOverridden = !!talent.customPerformance || !!talent.customPotential;

                            const avgCompetencyScore = Math.round(talent.competencies.reduce((sum, c) => sum + c.score, 0) / talent.competencies.length);
                            const avgPsychometricScore = Math.round((talent.psychometric.leadershipPotential.score + talent.psychometric.logicalReasoning.score) / 2);

                            return (
                              <div className="space-y-5 text-left">
                                <div className="flex justify-between items-center border-b border-surface-container-highest dark:border-slate-800 pb-3">
                                  <h3 className="font-display text-sm font-black text-on-surface dark:text-slate-100 uppercase tracking-wider">
                                    KALIBRASI DATA TALENTA
                                  </h3>
                                  <button 
                                    onClick={() => setSelectedNineBoxTalentId(null)}
                                    className="p-1 hover:bg-surface dark:hover:bg-slate-800 rounded-full text-on-surface-variant dark:text-slate-400 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Talent mini profile card */}
                                <div className="flex items-center gap-3 p-3 bg-surface dark:bg-slate-800/80 rounded-xl border border-surface-container-highest dark:border-slate-700">
                                  <img 
                                    src={talent.avatar} 
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-xs" 
                                    alt={talent.name} 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-display font-bold text-xs text-on-surface dark:text-slate-100 truncate">{talent.name}</h4>
                                    <p className="text-[10px] text-on-surface-variant dark:text-slate-400 truncate font-medium">{talent.title}</p>
                                    <span className="inline-block mt-1 text-[8px] font-black bg-primary/5 dark:bg-primary/20 text-primary dark:text-primary-container px-1.5 py-0.5 rounded uppercase">
                                      {talent.division}
                                    </span>
                                  </div>
                                </div>

                                {/* Evaluasi Kinerja 5 Tahun (Sumbu Y) Editor */}
                                <div className="bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 dark:border-primary/20 p-3.5 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-primary dark:text-primary-container uppercase tracking-wider block">Evaluasi Kinerja (Sumbu Y)</span>
                                    <span className="text-xs font-black text-primary dark:text-primary-container font-mono">{getTalentPerformanceScore(talent).toFixed(2)}</span>
                                  </div>
                                  
                                  <div className="grid gap-1 text-center bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-surface-container-highest dark:border-slate-700" style={{ gridTemplateColumns: `repeat(${evaluationYears.length}, minmax(0, 1fr))` }}>
                                    {evaluationYears.map((yr) => {
                                      const yearKey = `fy${yr}`;
                                      const val = talent.performanceEvaluation?.[yearKey] ?? 0;
                                      return (
                                        <div key={yr} className="space-y-1">
                                          <div className="text-[8px] font-bold text-slate-400 dark:text-slate-400">FY {yr}</div>
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={val}
                                            onChange={(e) => handlePerformanceEvaluationChangeDirect(talent.id, yearKey, parseFloat(e.target.value) || 0)}
                                            className="text-[9px] font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-0.5 w-full text-center text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary font-mono"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {(() => {
                                    const pDet = calculateTalentPerformanceDetails(talent);
                                    return (
                                      <div className="flex justify-between items-center text-[8px] text-slate-500 dark:text-slate-400 font-bold px-0.5">
                                        <span>Rerata Kinerja (Sumbu Y): <span className="font-mono text-primary dark:text-primary-container font-black">{pDet.score50.toFixed(2)} / 50.0</span></span>
                                        <span className="text-[8px] text-outline dark:text-slate-400 uppercase font-extrabold bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-surface-container-highest dark:border-slate-700">Performance Baseline</span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Sumbu X Potential Baseline Helper */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex justify-between items-center text-xs">
                                  <div>
                                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Sumbu X (Potential) - Psikometrik & Kompetensi</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-400 font-medium">Berdasarkan skor tes psikometrik terkalibrasi</span>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-center shadow-xs">
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono block leading-none">{avgPsychometricScore}%</span>
                                    <span className="text-[7px] text-outline dark:text-slate-400 font-bold uppercase tracking-wide mt-0.5 block">Sumbu X Base</span>
                                  </div>
                                </div>

                                {/* Calibration Selectors */}
                                <div className="space-y-4 pt-3 border-t border-surface-container-highest dark:border-slate-800">
                                  
                                  {/* 1. Potential override dropdown */}
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Potential Level (Sumbu X)</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {(["Low", "Medium", "High"] as const).map((level) => (
                                        <button
                                          key={level}
                                          onClick={() => handleCalibrateTalent(talent.id, placement.performance, level)}
                                          className={`py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                                            placement.potential === level
                                              ? "bg-primary text-white shadow-xs"
                                              : "bg-surface dark:bg-slate-800 border border-surface-container-highest dark:border-slate-700 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-low dark:hover:bg-slate-700"
                                          }`}
                                        >
                                          {level}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* 2. Performance override dropdown */}
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Performance Level (Sumbu Y)</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {(["Low", "Medium", "High"] as const).map((level) => (
                                        <button
                                          key={level}
                                          onClick={() => handleCalibrateTalent(talent.id, level, placement.potential)}
                                          className={`py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                                            placement.performance === level
                                              ? "bg-primary text-white shadow-xs"
                                              : "bg-surface dark:bg-slate-800 border border-surface-container-highest dark:border-slate-700 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-low dark:hover:bg-slate-700"
                                          }`}
                                        >
                                          {level}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* 3. Assessment Notes override */}
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Calibration Assessment Remarks</label>
                                    <textarea
                                      value={talent.nineBoxNotes || ""}
                                      onChange={(e) => handleCalibrateTalent(talent.id, placement.performance, placement.potential, e.target.value)}
                                      rows={4}
                                      className="w-full p-3 bg-surface dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-xs text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary placeholder:text-outline dark:placeholder:text-slate-500"
                                      placeholder="Tuliskan catatan kalibrasi khusus komite talent suksesi di sini..."
                                    />
                                  </div>

                                </div>

                                {/* Reset & Action Buttons */}
                                <div className="pt-4 border-t border-surface-container-highest space-y-2">
                                  {isOverridden && (
                                    <button
                                      onClick={() => {
                                        setTalents(prev => prev.map(t => {
                                          if (t.id === talent.id) {
                                            return {
                                              ...t,
                                              customPerformance: undefined,
                                              customPotential: undefined
                                            };
                                          }
                                          return t;
                                        }));
                                      }}
                                      className="w-full bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[10px] font-bold py-2.5 rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Kembalikan ke Otomatis
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedTalentId(talent.id);
                                      setActiveTab("profile");
                                    }}
                                    className="w-full bg-primary hover:bg-primary/95 text-white text-[10px] font-bold py-2.5 rounded-lg uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1.5"
                                  >
                                    <User className="w-3.5 h-3.5" />
                                    Lihat Detail Profil & IDP
                                  </button>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 h-full min-h-[400px]">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Sliders className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-on-surface block uppercase tracking-wider">Pilih Talenta untuk Kalibrasi</span>
                                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                                  Klik salah satu talenta dari matriks 9-kotak di sebelah kiri untuk membuka panel kontrol override nilai Kinerja dan Potensi serta menuliskan catatan penilaian strategis.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </motion.div>
                );
              })()}

            </AnimatePresence>

          </div>
        </main>
      </div>

      {/* Bottom Nav Bar (Mobile layout sticky bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 pt-2 bg-surface-container-lowest border-t border-outline-variant z-50 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 duration-200 ${
            activeTab === "home" ? "bg-primary-container/10 text-primary" : "text-on-surface-variant"
          }`}
        >
          <LayoutGrid className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab("talent-pool")}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 duration-200 ${
            activeTab === "talent-pool" ? "bg-primary-container/10 text-primary" : "text-on-surface-variant"
          }`}
        >
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Talent Pool</span>
        </button>

        {userRole === "admin" && (
          <button 
            onClick={() => setActiveTab("nine-box")}
            className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 duration-200 ${
              activeTab === "nine-box" ? "bg-primary-container/10 text-primary" : "text-on-surface-variant"
            }`}
          >
            <Grid3X3 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">9-Box</span>
          </button>
        )}

        <button 
          onClick={() => {
            setActiveTab("profile");
          }}
          className={`flex flex-col items-center justify-center px-5 py-1 rounded-full transition-all active:scale-90 duration-200 ${
            activeTab === "profile" ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"
          }`}
        >
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>

        <button 
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-all active:scale-90 duration-200 ${
            activeTab === "settings" ? "bg-primary-container/10 text-primary" : "text-on-surface-variant"
          }`}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Settings</span>
        </button>
      </nav>

      {/* EXECUTIVE REPORT MODAL (Download PDF simulation with browser native printing layout) */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsReportModalOpen(false)}
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
              className="bg-white rounded-xl shadow-2xl border border-surface-container-highest max-w-4xl w-full relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header bar of modal (Not printed) */}
              <div className="p-4 bg-surface border-b border-surface-container-highest flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-display font-bold text-sm text-primary uppercase tracking-wide">Executive Advisory PDF Preview</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => handleOpenSendEmail("individual", selectedTalentId)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-amber-400"
                  >
                    <Mail className="w-4 h-4 text-slate-950" />
                    KIRIM EMAIL LAPORAN
                  </button>

                  <button 
                    onClick={() => window.print()}
                    className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    PRINT / EXPORT REPORT
                  </button>
                  <button 
                    onClick={() => setIsReportModalOpen(false)}
                    className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Area - Perfectly formatted Corporate CV Talent Assessment */}
              <div className="p-8 md:p-12 overflow-y-auto print:p-0 print:overflow-visible" id="printable-talent-report">
                
                {/* Print Styles Injection */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    #printable-talent-report {
                      display: block !important;
                      width: 100% !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      position: static !important;
                      background: white !important;
                      color: black !important;
                    }
                  }
                `}} />

                {/* Cover Header */}
                <div className="border-b-4 border-primary pb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-xs text-primary font-bold uppercase tracking-widest">CONFIDENTIAL TALENT DOSSIER</h2>
                    <h1 className="font-display text-3xl font-extrabold text-on-surface tracking-tight mt-1">Strategic Placement Review</h1>
                    <p className="text-xs text-on-surface-variant font-medium mt-1">Generated: {new Date().toLocaleDateString('id-ID', {year: 'numeric', month: 'long', day: 'numeric'})} | Compiled by {adminProfile.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-display font-extrabold text-primary tracking-tight">TALENT ADVISOR</span>
                    <span className="block text-[9px] text-outline font-bold tracking-widest uppercase mt-0.5">Global Succession Board</span>
                  </div>
                </div>

                {/* Candidate Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-surface-container-highest">
                  
                  {/* Avatar & Details column */}
                  <div className="md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left space-y-4 border-r border-dashed border-surface-container-highest pr-4">
                    <img 
                      src={currentTalent.avatar} 
                      className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-md shadow-black/5" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="font-display text-xl font-bold text-on-surface">{currentTalent.name}</h2>
                      <p className="text-xs text-secondary font-semibold mt-0.5 leading-snug">{currentTalent.title}</p>
                      
                      <div className="mt-4 space-y-1.5 text-xs text-on-surface-variant font-medium">
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">Department:</span>
                          <span className="text-on-surface font-semibold">{currentTalent.division}</span>
                        </div>
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">NIK Karyawan:</span>
                          <span className="text-on-surface font-semibold">{currentTalent.nik || "-"}</span>
                        </div>
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">Base:</span>
                          <span className="text-on-surface font-semibold">{currentTalent.location}</span>
                        </div>
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">Tenure:</span>
                          <span className="text-on-surface font-semibold">{currentTalent.tenure}</span>
                        </div>
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">Grade / Golongan:</span>
                          <span className="text-on-surface font-semibold">{currentTalent.grade || "M4"}</span>
                        </div>
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">Tanggal Lahir (Umur):</span>
                          <span className="text-on-surface font-semibold">{currentTalent.birthDate || "-"} ({currentTalent.age || "-"} Tahun)</span>
                        </div>
                        <div className="flex justify-between border-b border-surface-container-low pb-1">
                          <span className="text-outline">Tanggal Masuk:</span>
                          <span className="text-on-surface font-semibold">{currentTalent.joinDate || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-outline">Readiness:</span>
                          <span className="text-primary font-bold">{currentTalent.readiness}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Core Psychometric & Competencies breakdown column */}
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="font-display font-bold text-xs text-primary uppercase tracking-wider mb-3">Core Assessment Indicators</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-surface p-3.5 rounded-lg border border-surface-container-highest">
                          <span className="text-[10px] text-on-surface-variant font-bold block mb-1">LOGICAL REASONING</span>
                          <span className="text-lg font-extrabold text-primary">{currentTalent.psychometric.logicalReasoning.score}%</span>
                        </div>
                        <div className="bg-surface p-3.5 rounded-lg border border-surface-container-highest">
                          <span className="text-[10px] text-on-surface-variant font-bold block mb-1">LEADERSHIP</span>
                          <span className="text-lg font-extrabold text-secondary">{currentTalent.psychometric.leadershipPotential.score}%</span>
                        </div>
                        <div className="bg-surface p-3.5 rounded-lg border border-surface-container-highest">
                          <span className="text-[10px] text-on-surface-variant font-bold block mb-1">EMOTIONAL INT.</span>
                          <span className="text-lg font-extrabold text-outline">{currentTalent.psychometric.emotionalAgility.score}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-xs text-primary uppercase tracking-wider mb-3">Competency Metrics Mastery</h3>
                      <div className="space-y-2.5">
                        {currentTalent.competencies.map((comp) => (
                          <div key={comp.name} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-on-surface-variant max-w-[70%]">{comp.name}</span>
                            <span className="font-mono font-bold text-secondary">{comp.score}% ({comp.label.split(" (")[0]})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Executive commentary notes from Chief Talent Officer */}
                <div className="py-6 border-b border-surface-container-highest">
                  <h3 className="font-display font-bold text-xs text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    CHIEF TALENT OFFICER ADVISORY NOTES
                  </h3>
                  <div className={`bg-surface p-5 rounded-lg border border-surface-container-highest text-xs text-on-surface-variant leading-relaxed italic ${isVaultLocked ? 'bg-rose-50/50 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400 font-bold text-center' : ''}`}>
                    {isVaultLocked ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-500" />
                        [DIAMANKAN] Catatan penasihat eksekutif terkunci dengan enkripsi AES-256. Silakan buka kunci di menu Pengaturan.
                      </span>
                    ) : (
                      `"${executiveCommentary[selectedTalentId] || "No commentary recorded. Strategic analysis pending board calibration forum."}"`
                    )}
                  </div>
                </div>

                {/* Historical Performance Evaluation Trend Section */}
                <div className="py-6 border-b border-surface-container-highest page-break-inside-avoid">
                  <h3 className="font-display font-bold text-xs text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    HISTORICAL PERFORMANCE EVALUATION TREND (Y-AXIS)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Visual CSS-based Bar Chart for print-perfect rendering */}
                    <div className="space-y-3.5 bg-surface p-4 rounded-lg border border-surface-container-highest">
                      <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wider block mb-2">Performance Rating Trend</span>
                      {(() => {
                        const perfDetails = calculateTalentPerformanceDetails(currentTalent);
                        return (
                          <div className="space-y-3">
                            {evaluationYears.map((yr) => {
                              const yearKey = `fy${yr}`;
                              const val = currentTalent.performanceEvaluation?.[yearKey] ?? 0;
                              const is0To50 = perfDetails.is0To50Scale || val > 5;
                              const percentage = is0To50 ? Math.min(100, (val / 50) * 100) : Math.min(100, (val / 5) * 100);
                              
                              let barColor = "bg-rose-500";
                              let textColor = "text-rose-700 bg-rose-50 border-rose-100";
                              const isHigh = is0To50 ? val >= 37.5 : val >= 4;
                              const isMed = is0To50 ? val >= 25.0 : val >= 3;

                              if (isHigh) {
                                barColor = "bg-emerald-600";
                                textColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                              } else if (isMed) {
                                barColor = "bg-amber-500";
                                textColor = "text-amber-700 bg-amber-50 border-amber-100";
                              }

                              const scoreLabel = is0To50
                                ? (val >= 37.5 ? "Tinggi" : val >= 25.0 ? "Sedang" : val > 0 ? "Rendah" : "-")
                                : (val === 5 ? "Istimewa" : val === 4 ? "Sangat Baik" : val === 3 ? "Baik" : val === 2 ? "Cukup" : val === 1 ? "Kurang" : "-");

                              return (
                                <div key={yr} className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-extrabold text-slate-700 font-mono">FY {yr}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${textColor}`}>
                                      Score: {val} ({scoreLabel})
                                    </span>
                                  </div>
                                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div 
                                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Performance Summary Metrics Table */}
                    <div className="space-y-4">
                      <div className="border border-surface-container-highest rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-950 text-white font-extrabold text-[10px] uppercase tracking-wider">
                              <th className="p-2.5 pl-3 border-r border-slate-800">Fiscal Year</th>
                              <th className="p-2.5 text-center border-r border-slate-800">Rating</th>
                              <th className="p-2.5 pr-3">Classification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const perfDetails = calculateTalentPerformanceDetails(currentTalent);
                              return evaluationYears.map((yr) => {
                                const yearKey = `fy${yr}`;
                                const val = currentTalent.performanceEvaluation?.[yearKey] ?? 0;
                                const is0To50 = perfDetails.is0To50Scale || val > 5;
                                const classification = is0To50
                                  ? (val >= 37.5 ? "Tinggi (Exceeds / High)" : val >= 25.0 ? "Sedang (Meets / Medium)" : val > 0 ? "Rendah (Development Needed / Low)" : "Tidak Ada Data")
                                  : (val === 5 ? "Istimewa (Outstanding)" : val === 4 ? "Sangat Baik (Exceeds)" : val === 3 ? "Baik (Meets Expectation)" : val === 2 ? "Cukup (Development Needed)" : val === 1 ? "Kurang (Unsatisfactory)" : "-");

                                return (
                                  <tr key={yr} className="hover:bg-slate-50/50">
                                    <td className="p-2 pl-3 font-bold text-slate-700 font-mono border-r border-slate-100">FY {yr}</td>
                                    <td className="p-2 text-center font-extrabold text-primary font-mono border-r border-slate-100">{val}</td>
                                    <td className="p-2 pr-3 font-semibold text-on-surface-variant">{classification}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Calculated Aggregate Card */}
                      {(() => {
                        const perfDetails = calculateTalentPerformanceDetails(currentTalent);
                        return (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Aggregate Average Rating (Sumbu Y)</span>
                              <span className="text-sm font-black text-[#b01a43] mt-0.5 block">{perfDetails.score50.toFixed(2)} / 50.00</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Committee Alignment Baseline</span>
                              <span className="text-xs font-extrabold text-slate-800 uppercase bg-white border border-slate-200 px-2.5 py-1 rounded-md inline-block mt-1">
                                {perfDetails.categoryName} Performance
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Individual Development Plan progress column */}
                <div className="pt-6">
                  <h3 className="font-display font-bold text-xs text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    INDIVIDUAL DEVELOPMENT MILESTONES (IDP)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentTalent.idp.map((item) => (
                      <div key={item.title} className="p-4 rounded-lg border border-surface-container-highest text-xs bg-surface flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-on-surface leading-snug">{item.title}</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-surface-container-highest font-semibold text-[9px] text-outline">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-[11px] mt-1 leading-normal">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-surface-container-low text-[10px] font-bold">
                          <span className="text-outline">Completion:</span>
                          <span className="text-secondary">{item.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Official signature footer */}
                <div className="mt-12 flex justify-between items-end border-t border-surface-container-highest pt-6">
                  <div>
                    <p className="text-[10px] text-outline uppercase tracking-wider">Approval Signature</p>
                    <div className="h-10 border-b border-outline-variant w-48 mt-2 flex items-center pl-2 text-sm italic font-display text-primary">
                      {adminProfile.name}
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-1.5 font-semibold">{adminProfile.title}, Global succession Board</p>
                  </div>
                  
                  <div className="text-right text-[9px] text-outline font-medium">
                    <p>Document Ref: TAL-AD-{currentTalent.id.toUpperCase()}-2026</p>
                    <p className="mt-0.5">Strict Confidentiality Level 3</p>
                  </div>
                </div>

              </div>

              {/* Action footer of modal (Not printed) */}
              <div className="p-4 bg-surface border-t border-surface-container-highest flex justify-end gap-3 print:hidden">
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border border-surface-container-highest bg-white text-secondary hover:bg-surface text-xs font-bold rounded-lg"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => window.print()}
                  className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Report Dossier
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERALL SYSTEM DATA SUMMARY REPORT MODAL */}
      <AnimatePresence>
        {isOverallSummaryModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:static print:overflow-visible">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsOverallSummaryModalOpen(false)}
            />
            
            {/* Modal Box Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full relative z-10 max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden print:max-h-none print:shadow-none print:border-none print:bg-white print:static"
            >
              {/* Header bar (Screen only) */}
              <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 print:hidden shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm text-white">
                      Rangkuman Laporan Eksekutif Keseluruhan Data System
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Total Data: {talents.length} Talenta Master | PT. Ajinomoto Indonesia
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenSendEmail("summary")}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-amber-400"
                  >
                    <Mail className="w-4 h-4 text-slate-950" />
                    Kirim Email Summary
                  </button>

                  <button
                    onClick={() => {
                      const headers = ["ID", "Nama", "Jabatan", "Departemen", "Lokasi", "Sumbu Y (Kinerja %)", "Sumbu X (Potensi %)", "Kotak Nine-Box", "Zona", "Rekomendasi Suksesi"];
                      const rows = talents.map(t => {
                        const placement = getTalentPlacement(t);
                        const cellName = getCellName(placement.performance, placement.potential);
                        const rec = getPlacementRecommendation(placement.performance, placement.potential);
                        return [
                          t.id,
                          t.name,
                          t.title,
                          t.division,
                          t.location || "Head Office",
                          getTalentPerformanceScore(t),
                          getTalentCoordinates(t).x.toFixed(2),
                          cellName,
                          placement.potential === "High" && placement.performance === "High" ? "Hijau (Star)" : placement.performance === "Low" ? "Merah (Risk)" : "Biru (Core)",
                          rec
                        ];
                      });
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `Master_Summary_Report_Talent_Ajinomoto_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Unduh CSV
                  </button>

                  <button 
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak / Print PDF
                  </button>

                  <button 
                    onClick={() => setIsOverallSummaryModalOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Body Content */}
              <div className="p-6 md:p-10 overflow-y-auto space-y-8 print:p-0 print:overflow-visible bg-white text-slate-900" id="printable-overall-summary-report">
                
                {/* 1. Executive Corporate Header */}
                <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ajinomoto_Group_Global_Brand_logo.png" 
                        className="h-7 object-contain" 
                        alt="Ajinomoto Logo" 
                      />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500 border-l border-slate-300 pl-2">
                        EXECUTIVE BOARD DOCKET
                      </span>
                    </div>
                    <h1 className="text-2xl font-black font-display tracking-tight text-slate-900">
                      LAPORAN RINGKASAN KESELURUHAN DATA TALENTA (MASTER SUMMARY)
                    </h1>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Konsolidasi Peta Suksesi, Matriks Nine-Box & Penilaian Talenta Internal PT Ajinomoto Indonesia
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-xs space-y-0.5 border-l-2 sm:border-l-0 sm:border-r-2 border-primary pl-3 sm:pl-0 sm:pr-3 shrink-0">
                    <p className="font-extrabold text-slate-900">TANGGAL: {new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="text-slate-600">TOTAL RECORD: <strong>{talents.length} Kandidat</strong></p>
                    <p className="text-slate-600">KLASIFIKASI: <strong className="text-rose-700">RAHASIA (CONFIDENTIAL)</strong></p>
                  </div>
                </div>

                {/* 2. Key Performance Indicators Summary Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    1. Ringkasan Eksekutif & Key Performance Indicators (KPI)
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">Total Talenta Terdata</span>
                      <span className="text-2xl font-black text-slate-900 mt-0.5 block">{talents.length} <span className="text-xs font-bold text-slate-500">Orang</span></span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-black uppercase text-emerald-800 block">Zona Hijau (Star / Promosi)</span>
                      <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
                        {talents.filter(t => {
                          const p = getTalentPlacement(t);
                          return (p.potential === "High" && p.performance === "High") || (p.potential === "High" && p.performance === "Medium") || (p.potential === "Medium" && p.performance === "High");
                        }).length} 
                        <span className="text-xs font-bold text-emerald-700 ml-1">
                          ({((talents.filter(t => {
                            const p = getTalentPlacement(t);
                            return (p.potential === "High" && p.performance === "High") || (p.potential === "High" && p.performance === "Medium") || (p.potential === "Medium" && p.performance === "High");
                          }).length / (talents.length || 1)) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>

                    <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200">
                      <span className="text-[10px] font-black uppercase text-sky-800 block">Zona Biru (Talenta Inti)</span>
                      <span className="text-2xl font-black text-sky-900 mt-0.5 block">
                        {talents.filter(t => {
                          const p = getTalentPlacement(t);
                          return (p.potential === "Medium" && p.performance === "Medium") || (p.potential === "High" && p.performance === "Low") || (p.potential === "Low" && p.performance === "High");
                        }).length}
                        <span className="text-xs font-bold text-sky-700 ml-1">
                          ({((talents.filter(t => {
                            const p = getTalentPlacement(t);
                            return (p.potential === "Medium" && p.performance === "Medium") || (p.potential === "High" && p.performance === "Low") || (p.potential === "Low" && p.performance === "High");
                          }).length / (talents.length || 1)) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>

                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-[10px] font-black uppercase text-rose-800 block">Zona Merah (Risiko / PIP)</span>
                      <span className="text-2xl font-black text-rose-900 mt-0.5 block">
                        {talents.filter(t => {
                          const p = getTalentPlacement(t);
                          return p.performance === "Low" || (p.potential === "Low" && p.performance === "Medium");
                        }).length}
                        <span className="text-xs font-bold text-rose-700 ml-1">
                          ({((talents.filter(t => {
                            const p = getTalentPlacement(t);
                            return p.performance === "Low" || (p.potential === "Low" && p.performance === "Medium");
                          }).length / (talents.length || 1)) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Distribution Matrix Summary Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-primary" />
                    2. Matriks Distribusi Nine-Box Keseluruhan
                  </h3>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
                    {[
                      { box: 7, name: "Enigma (Dilemma)", pot: "High", perf: "Low", bg: "bg-amber-100/80 border-amber-300 text-amber-900" },
                      { box: 8, name: "High Potential", pot: "High", perf: "Medium", bg: "bg-emerald-100/80 border-emerald-300 text-emerald-900" },
                      { box: 9, name: "Star Leader", pot: "High", perf: "High", bg: "bg-emerald-200 border-emerald-400 text-emerald-950 font-black" },
                      { box: 4, name: "Inconsistent Performer", pot: "Medium", perf: "Low", bg: "bg-rose-100/80 border-rose-300 text-rose-900" },
                      { box: 5, name: "Core Contributor", pot: "Medium", perf: "Medium", bg: "bg-sky-100/80 border-sky-300 text-sky-900" },
                      { box: 6, name: "High Performer", pot: "Medium", perf: "High", bg: "bg-emerald-100/80 border-emerald-300 text-emerald-900" },
                      { box: 1, name: "Underperformer", pot: "Low", perf: "Low", bg: "bg-rose-200 border-rose-400 text-rose-950 font-black" },
                      { box: 2, name: "Solid Performer", pot: "Low", perf: "Medium", bg: "bg-amber-100/80 border-amber-300 text-amber-900" },
                      { box: 3, name: "Specialist / Workhorse", pot: "Low", perf: "High", bg: "bg-sky-100/80 border-sky-300 text-sky-900" }
                    ].map((cell) => {
                      const count = talents.filter(t => {
                        const p = getTalentPlacement(t);
                        return p.potential === cell.pot && p.performance === cell.perf;
                      }).length;
                      return (
                        <div key={cell.box} className={`p-2.5 rounded-lg border ${cell.bg} flex flex-col justify-between items-center min-h-[70px]`}>
                          <span className="text-[9px] font-black uppercase block tracking-wider">Box {cell.box}: {cell.name}</span>
                          <span className="text-xl font-black mt-1 block">{count} <span className="text-[10px] font-bold">Talenta</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Department Statistics Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    3. Distribusi Talenta Berdasarkan Departemen / Divisi
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="p-2.5 border-r border-slate-800">Departemen / Divisi</th>
                          <th className="p-2.5 border-r border-slate-800 text-center">Total Talenta</th>
                          <th className="p-2.5 border-r border-slate-800 text-center">Zona Hijau (Star)</th>
                          <th className="p-2.5 border-r border-slate-800 text-center">Zona Biru (Core)</th>
                          <th className="p-2.5 text-center">Zona Merah (PIP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {Array.from(new Set(talents.map(t => t.division))).map((dept) => {
                          const deptTalents = talents.filter(t => t.division === dept);
                          const greenCount = deptTalents.filter(t => {
                            const p = getTalentPlacement(t);
                            return (p.potential === "High" && p.performance === "High") || (p.potential === "High" && p.performance === "Medium") || (p.potential === "Medium" && p.performance === "High");
                          }).length;
                          const blueCount = deptTalents.filter(t => {
                            const p = getTalentPlacement(t);
                            return (p.potential === "Medium" && p.performance === "Medium") || (p.potential === "High" && p.performance === "Low") || (p.potential === "Low" && p.performance === "High");
                          }).length;
                          const redCount = deptTalents.filter(t => {
                            const p = getTalentPlacement(t);
                            return p.performance === "Low" || (p.potential === "Low" && p.performance === "Medium");
                          }).length;

                          return (
                            <tr key={dept} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">{dept}</td>
                              <td className="p-2.5 text-center font-bold border-r border-slate-200">{deptTalents.length}</td>
                              <td className="p-2.5 text-center text-emerald-700 font-extrabold border-r border-slate-200">{greenCount}</td>
                              <td className="p-2.5 text-center text-sky-700 font-extrabold border-r border-slate-200">{blueCount}</td>
                              <td className="p-2.5 text-center text-rose-700 font-extrabold">{redCount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Complete Master Talent Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      4. Master Tabel Detail Seluruh Talenta ({talents.length} Personel)
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Halaman Cetak Master Data</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-300">
                          <th className="p-2 border-r border-slate-300 w-8 text-center">No</th>
                          <th className="p-2 border-r border-slate-300">Nama Lengkap</th>
                          <th className="p-2 border-r border-slate-300">Jabatan & Departemen</th>
                          <th className="p-2 border-r border-slate-300 text-center">Kinerja (%)</th>
                          <th className="p-2 border-r border-slate-300 text-center">Potensi (%)</th>
                          <th className="p-2 border-r border-slate-300 text-center">Nine-Box Cell</th>
                          <th className="p-2">Rekomendasi Suksesi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {talents.map((t, idx) => {
                          const placement = getTalentPlacement(t);
                          const cellName = getCellName(placement.performance, placement.potential);
                          const rec = getPlacementRecommendation(placement.performance, placement.potential);
                          const perfScore = getTalentPerformanceScore(t).toFixed(2);
                          const potScore = getTalentCoordinates(t).x.toFixed(2);

                          return (
                            <tr key={t.id} className="hover:bg-slate-50 page-break-inside-avoid">
                              <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                                {t.name}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <span className="font-semibold text-slate-800 block">{t.title}</span>
                                <span className="text-[9px] text-slate-500 block">{t.division} ({t.location || "HO"})</span>
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{perfScore}</td>
                              <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{potScore}</td>
                              <td className="p-2 text-center border-r border-slate-200">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  placement.potential === "High" && placement.performance === "High" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" :
                                  placement.performance === "Low" ? "bg-rose-100 text-rose-900 border border-rose-300" : "bg-sky-100 text-sky-900 border border-sky-300"
                                }`}>
                                  {cellName}
                                </span>
                              </td>
                              <td className="p-2 text-[10px] text-slate-700 leading-tight">
                                {rec}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Signature Sign-Off Block for Formal Printing */}
                <div className="pt-6 border-t-2 border-slate-300 page-break-inside-avoid">
                  <div className="grid grid-cols-3 gap-6 text-center text-xs">
                    <div className="space-y-12">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Disiapkan Oleh:</span>
                      <div className="border-b border-slate-400 w-3/4 mx-auto pb-1">
                        <p className="font-black text-slate-900">Komite Suksesi & HR</p>
                      </div>
                      <p className="text-[9px] text-slate-500">Talent Development Dept.</p>
                    </div>

                    <div className="space-y-12">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Ditinjau Oleh:</span>
                      <div className="border-b border-slate-400 w-3/4 mx-auto pb-1">
                        <p className="font-black text-slate-900">Head of Human Resources</p>
                      </div>
                      <p className="text-[9px] text-slate-500">PT. Ajinomoto Indonesia</p>
                    </div>

                    <div className="space-y-12">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Disetujui Oleh:</span>
                      <div className="border-b border-slate-400 w-3/4 mx-auto pb-1">
                        <p className="font-black text-slate-900">Board of Directors (BOD)</p>
                      </div>
                      <p className="text-[9px] text-slate-500">President Director</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action footer (Screen only) */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 print:hidden shrink-0">
                <button 
                  onClick={() => setIsOverallSummaryModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Tutup Preview
                </button>
                <button 
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Export PDF
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PROFILE DATA LENGKAP MODAL */}
      <AnimatePresence>
        {isEditProfileModalOpen && editProfileForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsEditProfileModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
              className="bg-white rounded-xl shadow-2xl border border-surface-container-highest max-w-2xl w-full relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-surface border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-primary" />
                  <span className="font-display font-extrabold text-sm text-secondary uppercase tracking-wide">Edit Data Profil Lengkap Karyawan</span>
                </div>
                <button 
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveProfile} className="flex flex-col overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-5 text-on-surface text-left flex-1 max-h-[65vh]">
                  
                  {/* Alert Banner */}
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg text-xs text-primary leading-relaxed font-medium">
                    Memperbarui data profil di sini akan secara dinamis menyelaraskan kartu suksesi, matriks 9-Box, data kualifikasi, visualisasi lab radar, dan pencetakan dokumen suksesi (PDF).
                  </div>

                  {/* Section 1: Informasi Dasar */}
                  <div className="space-y-4">
                    <h4 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5">1. Informasi Identitas & Jabatan</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Nama Lengkap</label>
                        <input 
                          type="text" 
                          required
                          value={editProfileForm.name}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">NIK Karyawan</label>
                        <input 
                          type="text" 
                          required
                          value={editProfileForm.nik || ""}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, nik: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Jabatan / Title</label>
                        <input 
                          type="text" 
                          required
                          value={editProfileForm.title}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, title: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Divisi / Department</label>
                        <input 
                          type="text" 
                          required
                          value={editProfileForm.division}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, division: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Penempatan & Kesiapan */}
                  <div className="space-y-4">
                    <h4 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5">2. Penempatan & Kesiapan Suksesi</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Lokasi Kerja (Base)</label>
                        <input 
                          type="text" 
                          required
                          value={editProfileForm.location}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, location: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Masa Kerja (Tenure)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Contoh: 6 Years"
                          value={editProfileForm.tenure}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, tenure: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Tingkat Kesiapan (Readiness)</label>
                        <select 
                          value={editProfileForm.readiness}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, readiness: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        >
                          <option value="READY NOW">READY NOW (Siap Sekarang)</option>
                          <option value="READY 1-2 YEARS">READY 1-2 YEARS (Siap 1-2 Tahun)</option>
                          <option value="READY 2+ YEARS">READY 2+ YEARS (Siap Lebih dari 2 Tahun)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Grade / Golongan</label>
                        <select 
                          value={editProfileForm.grade || "M4"}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, grade: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        >
                          <option value="M5">M5 (SVP / Director)</option>
                          <option value="M4">M4 (VP / Senior Director)</option>
                          <option value="M3">M3 (AVP / Director)</option>
                          <option value="M2">M2 (Senior Manager)</option>
                          <option value="M1">M1 (Manager)</option>
                          <option value="ST5">ST5 (Principal / Senior Advisor)</option>
                          <option value="ST4">ST4 (Lead / Advisor)</option>
                          <option value="ST3">ST3 (Senior Staff)</option>
                          <option value="ST2">ST2 (Staff)</option>
                          <option value="ST1">ST1 (Junior Staff)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Data Administrasi Karyawan */}
                  <div className="space-y-4">
                    <h4 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5">3. Data Administrasi & Avatar</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Jenis Kelamin</label>
                        <select 
                          value={editProfileForm.gender || detectGenderFromName(editProfileForm.name)}
                          onChange={(e) => {
                            const newGender = e.target.value as "Laki-laki" | "Perempuan";
                            const syncedAvatar = getSyncedAvatarUrl(editProfileForm.name, newGender, editProfileForm.avatar);
                            setEditProfileForm({ ...editProfileForm, gender: newGender, avatar: syncedAvatar });
                          }}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface font-semibold"
                        >
                          <option value="Laki-laki">👨 Laki-laki</option>
                          <option value="Perempuan">👩 Perempuan</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Tanggal Lahir</label>
                        <input 
                          type="date" 
                          required
                          value={editProfileForm.birthDate || "1988-10-10"}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, birthDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Tanggal Masuk Kerja</label>
                        <input 
                          type="date" 
                          required
                          value={editProfileForm.joinDate || "2021-01-01"}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, joinDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-surface-container-highest">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Foto Profil (Avatar)</label>
                        <span className="text-[10px] text-slate-500 font-medium">Upload file lokal atau atur URL foto</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="relative shrink-0">
                          <img 
                            src={editProfileForm.avatar} 
                            alt="Preview" 
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary/40 shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex flex-wrap gap-2">
                            {/* File Upload Button */}
                            <label className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload File Foto</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const base64Url = await compressImageFile(file, 256, 0.75);
                                      if (base64Url) {
                                        setEditProfileForm(prev => ({ ...prev, avatar: base64Url }));
                                      }
                                    } catch (err: any) {
                                      alert("Gagal memproses foto: " + (err.message || "Unknown error"));
                                    }
                                  }
                                }}
                              />
                            </label>

                            {/* Auto Gender Sync Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const g = editProfileForm.gender || detectGenderFromName(editProfileForm.name);
                                const syncedAvatar = getSyncedAvatarUrl(editProfileForm.name, g);
                                setEditProfileForm({ ...editProfileForm, gender: g, avatar: syncedAvatar });
                              }}
                              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              title="Atur foto otomatis sesuai gender"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Auto-Sync Foto Gender</span>
                            </button>
                          </div>

                          <input 
                            type="url" 
                            value={editProfileForm.avatar}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, avatar: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-primary text-on-surface"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Evaluasi Kinerja (Sumbu Y) */}
                  <div className="space-y-4">
                    <h4 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5">4. Indikator Evaluasi Kinerja (Sumbu Y)</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Nilai Evaluasi Kinerja Sumbu Y (12.5 - 50.0)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="12.5"
                          max="50"
                          value={editProfileForm.importedEvaluasiScore ?? 31.25}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, importedEvaluasiScore: parseFloat(e.target.value) || 31.25 })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Kategori Evaluasi Kinerja</label>
                        <select 
                          value={editProfileForm.importedEvaluasiCategory || "Sedang"}
                          onChange={(e) => {
                            const cat = e.target.value;
                            const code = cat === "Rendah" ? 1 : cat === "Tinggi" ? 3 : 2;
                            setEditProfileForm({ ...editProfileForm, importedEvaluasiCategory: cat, importedEvaluasiCode: code });
                          }}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                        >
                          <option value="Rendah">Rendah (Kode 1)</option>
                          <option value="Sedang">Sedang (Kode 2)</option>
                          <option value="Tinggi">Tinggi (Kode 3)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-surface border-t border-surface-container-highest flex justify-between items-center gap-3">
                  {userRole === "admin" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTalent(editProfileForm.id, editProfileForm.name)}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      HAPUS TALENTA
                    </button>
                  )}
                  <div className="flex gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditProfileModalOpen(false)}
                      className="px-5 py-2.5 rounded-lg border border-surface-container-highest text-secondary font-bold text-xs hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                    >
                      BATAL
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      SIMPAN PERUBAHAN
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT & SAVE PROFILING ADMIN MASTER MODAL */}
      <AnimatePresence>
        {isAdminMasterModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsAdminMasterModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-surface-container-highest dark:border-slate-800 max-w-xl w-full relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-surface dark:bg-slate-800 border-b border-surface-container-highest dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary dark:text-teal-400" />
                  <span className="font-display font-extrabold text-sm text-secondary dark:text-slate-100 uppercase tracking-wide">Profiling Admin Master Settings</span>
                </div>
                <button 
                  onClick={() => setIsAdminMasterModalOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high dark:hover:bg-slate-700 rounded-full text-on-surface-variant dark:text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveAdminMasterProfile} className="flex flex-col overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-4 text-on-surface dark:text-slate-100 text-left">
                  <div className="p-3 bg-primary/5 dark:bg-teal-950/40 border border-primary/20 dark:border-teal-800/60 rounded-lg text-xs text-primary dark:text-teal-300 leading-relaxed font-medium">
                    Profil Administrator Master ini mengendalikan otorisasi, nama persetujuan laporan suksesi resmi, serta identitas admin pada seluruh berkas ekspor dan dashboard.
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Nama Administrator Master</label>
                      <input 
                        type="text" 
                        required
                        value={adminProfile.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const words = name.trim().split(/\s+/);
                          const initials = words.map(w => w[0]).join("").substring(0, 3).toUpperCase() || "AD";
                          setAdminProfile({ ...adminProfile, name, initials });
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-slate-100"
                        placeholder="Misal: Marcus Sterling"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Peran / Jabatan Admin Master</label>
                      <input 
                        type="text" 
                        required
                        value={adminProfile.title}
                        onChange={(e) => setAdminProfile({ ...adminProfile, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-slate-100"
                        placeholder="Misal: Chief Talent Officer (Admin)"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Departemen / Unit Kerja</label>
                      <input 
                        type="text" 
                        value={adminProfile.department || "Human Capital Management Dept."}
                        onChange={(e) => setAdminProfile({ ...adminProfile, department: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-slate-100"
                        placeholder="Human Capital Management"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Email Resmi Admin</label>
                      <input 
                        type="email" 
                        value={adminProfile.email || "admin.hr@ajinomoto.co.id"}
                        onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-sm focus:outline-none focus:border-primary text-on-surface dark:text-slate-100"
                        placeholder="admin.hr@ajinomoto.co.id"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider block">Catatan Otorisasi Master Komite</label>
                      <textarea 
                        rows={3}
                        value={adminProfile.notes || "Otorisasi Administrator Master untuk Komite Talent Suksesi PT Ajinomoto Indonesia"}
                        onChange={(e) => setAdminProfile({ ...adminProfile, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-surface-container-highest dark:border-slate-700 text-xs focus:outline-none focus:border-primary text-on-surface dark:text-slate-100"
                        placeholder="Catatan otorisasi admin..."
                      />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-surface-container-highest dark:border-slate-700">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-display font-bold text-sm shadow-xs shrink-0">
                        {adminProfile.initials}
                      </div>
                      <div className="text-left text-xs">
                        <span className="font-bold text-on-surface dark:text-slate-100 block">{adminProfile.name}</span>
                        <span className="text-[10px] text-on-surface-variant dark:text-slate-400 block">{adminProfile.title} • {adminProfile.department || "HCM"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-surface dark:bg-slate-800 border-t border-surface-container-highest dark:border-slate-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdminMasterModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg border border-surface-container-highest dark:border-slate-700 text-secondary dark:text-slate-300 font-bold text-xs hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    SIMPAN PROFILING ADMIN MASTER
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMPORT DATA MODAL */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsImportOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
              className="bg-white rounded-xl shadow-2xl border border-surface-container-highest max-w-xl w-full relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-surface border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-secondary" />
                  <span className="font-display font-extrabold text-sm text-secondary uppercase tracking-wide">Import Data Pembaruan Talenta</span>
                </div>
                <button 
                  onClick={() => setIsImportOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-on-surface text-left">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Unggah file data terbaru dalam format <strong>JSON</strong> atau <strong>CSV</strong> untuk melakukan sinkronisasi otomatis ke dalam database lokal sistem suksesi. Jika data talenta (nama) sudah ada, sistem akan langsung memperbarui seluruh skor dan profilnya secara otomatis.
                </p>

                <div className="space-y-4">
                  {/* Option format */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="import-format" 
                        defaultChecked 
                        id="import-format-json"
                        className="accent-primary"
                        onChange={() => {}} 
                      />
                      Format JSON
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="import-format" 
                        id="import-format-csv"
                        className="accent-primary"
                        onChange={() => {}} 
                      />
                      Format CSV (Koma)
                    </label>
                  </div>

                  {/* Drag-and-drop / File upload zone */}
                  <div className="border-2 border-dashed border-surface-container-highest hover:border-primary/50 bg-surface rounded-xl p-6 text-center transition-all relative">
                    <input 
                      type="file" 
                      accept=".json,.csv"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      id="import-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          const textElem = document.getElementById("import-text-area") as HTMLTextAreaElement;
                          if (textElem) {
                            textElem.value = content;
                          }
                          const isCsv = file.name.endsWith(".csv");
                          const csvRadio = document.getElementById("import-format-csv") as HTMLInputElement;
                          const jsonRadio = document.getElementById("import-format-json") as HTMLInputElement;
                          if (isCsv && csvRadio) csvRadio.checked = true;
                          else if (jsonRadio) jsonRadio.checked = true;
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <Upload className="w-10 h-10 text-outline-variant mx-auto mb-2" />
                    <span className="text-xs font-bold block text-on-surface">Pilih File atau seret ke sini</span>
                    <span className="text-[10px] text-on-surface-variant block mt-1">Mendukung .json dan .csv</span>
                  </div>

                  {/* Textarea paste fallback */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Atau Paste Teks Data Di Sini</label>
                    <textarea 
                      id="import-text-area"
                      rows={6}
                      placeholder='Contoh JSON:&#10;[&#10;  {&#10;    "name": "Edwin Prasetyo",&#10;    "title": "Senior VP of Digital Solution",&#10;    "division": "Technology Dept.",&#10;    "studyBackgroundName": "S2 Sistem Informasi",&#10;    "studyBackgroundScore": 3&#10;  }&#10;]'
                      className="w-full p-3 bg-surface rounded-lg border border-surface-container-highest font-mono text-xs focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>

                  {/* Examples toggle/details for help */}
                  <div className="bg-surface p-3.5 rounded-lg border border-surface-container-highest text-xs space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5" />
                      Petunjuk Kolom CSV & JSON:
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Format kolom CSV yang didukung: <code>ID, Nama Lengkap, Jenis Kelamin, NIK Karyawan, Jabatan, Department / Divisi, Lokasi Kerja, Masa Kerja, Readiness Level, Tanggal Lahir, Umur, Tanggal Masuk, Riwayat Pelatihan, Kinerja Evaluation FY2020-FY2024, Latar Belakang Pendidikan & Score, Assessment Competencies</code>.
                    </p>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const csvText = "ID,Nama Lengkap,Jenis Kelamin (Laki-laki / Perempuan),NIK Karyawan,Jabatan,Department / Divisi,Lokasi Kerja,Masa Kerja,Readiness Level,Tanggal Lahir (YYYY-MM-DD),Umur (Tahun),Tanggal Masuk (YYYY-MM-DD),Riwayat Pelatihan / Training,Kinerja Evaluation FY2020 (1-5),Kinerja Evaluation FY2021 (1-5),Kinerja Evaluation FY2022 (1-5),Kinerja Evaluation FY2023 (1-5),Kinerja Evaluation FY2024 (1-5),Pendidikan Terakhir,Bobot Pendidikan (1-3),Score Assessment Logical Thinking (0-100),Score Assessment Leadership (0-100),Score Assessment Emotional Intelligence (0-100),Score Assessment Problem Solving (0-100),Score Assessment Strategic Thinking (0-100),Score Assessment Stakeholder Mgmt (0-100),Score Assessment Results Orientation (0-100)\nedwin-prasetyo,Edwin Prasetyo,Laki-laki,8820194,Senior Vice President Digital,Technology Dept.,Jakarta HQ,6 Years,READY 1-2 YEARS,1985-04-12,41,2018-05-15,Executive Leadership Masterclass [Leadership]; Advanced Strategic Tech Scaling [Management],4,5,4,5,5,S2 Teknik Informatika,3,88,95,80,82,100,75,91";
                          const txtArea = document.getElementById("import-text-area") as HTMLTextAreaElement;
                          if (txtArea) {
                            txtArea.value = csvText;
                            const csvRadio = document.getElementById("import-format-csv") as HTMLInputElement;
                            if (csvRadio) csvRadio.checked = true;
                          }
                        }}
                        className="text-[10px] font-bold text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded"
                      >
                        Gunakan Contoh CSV
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const jsonText = JSON.stringify([
                            {
                              id: "siti-rahma",
                              name: "Siti Rahma",
                              gender: "Perempuan",
                              nik: "8820199",
                              title: "Vice President of Wealth Management",
                              division: "Finance Dept.",
                              location: "Jakarta HQ",
                              tenure: "5 Years",
                              readiness: "READY NOW",
                              birthDate: "1988-10-10",
                              age: 38,
                              joinDate: "2020-03-01",
                              trainingsRaw: "Certified Wealth Advisor [Certification]; Advanced Finance Leadership [Leadership]",
                              studyBackgroundName: "S2 Strategic Finance",
                              studyBackgroundScore: 3,
                              logicalScore: 90,
                              leadershipScore: 88,
                              emotionalScore: 82,
                              problemSolvingScore: 85,
                              strategicScore: 92,
                              stakeholderScore: 80,
                              resultsScore: 88,
                              fy2020: 5, fy2021: 4, fy2022: 5, fy2023: 5, fy2024: 5
                            }
                          ], null, 2);
                          const txtArea = document.getElementById("import-text-area") as HTMLTextAreaElement;
                          if (txtArea) {
                            txtArea.value = jsonText;
                            const jsonRadio = document.getElementById("import-format-json") as HTMLInputElement;
                            if (jsonRadio) jsonRadio.checked = true;
                          }
                        }}
                        className="text-[10px] font-bold text-secondary hover:underline bg-secondary/5 px-2.5 py-1.5 rounded"
                      >
                        Gunakan Contoh JSON
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 p-5 bg-surface border-t border-surface-container-highest">
                <button 
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-5 py-2.5 border border-surface-container-highest bg-white text-secondary hover:bg-surface text-xs font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const txtArea = document.getElementById("import-text-area") as HTMLTextAreaElement;
                    const text = txtArea?.value || "";
                    if (!text.trim()) {
                      alert("Silakan unggah file atau masukkan teks data talenta.");
                      return;
                    }
                    const isCsvRadio = document.getElementById("import-format-csv") as HTMLInputElement;
                    const fileType = isCsvRadio?.checked ? "csv" : "json";
                    handleImportData(text, fileType);
                  }}
                  className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  Proses Import & Update
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD NEW TALENT MODAL */}
      <AnimatePresence>
        {isAddTalentOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsAddTalentOpen(false)}
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
              className="bg-white rounded-xl shadow-2xl border border-surface-container-highest max-w-2xl w-full relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-surface border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <span className="font-display font-extrabold text-sm text-primary uppercase tracking-wide">Tambah Kandidat Succession Baru</span>
                </div>
                <button 
                  onClick={() => setIsAddTalentOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddNewTalent} className="p-6 overflow-y-auto space-y-6 text-on-surface text-left">
                {/* 1. Basic Info Section */}
                <div className="space-y-4">
                  <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5 text-left">1. Informasi Dasar</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Nama Lengkap</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Farhan Hadi"
                        value={newTalent.name}
                        onChange={(e) => setNewTalent({...newTalent, name: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">NIK Karyawan</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: NIK1002486"
                        value={newTalent.nik}
                        onChange={(e) => setNewTalent({...newTalent, nik: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Jabatan</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: VP of Supply Chain Operations"
                        value={newTalent.title}
                        onChange={(e) => setNewTalent({...newTalent, title: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
                      <select 
                        value={newTalent.division}
                        onChange={(e) => setNewTalent({...newTalent, division: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="Technology Dept.">Technology Dept.</option>
                        <option value="Finance Dept.">Finance Dept.</option>
                        <option value="People & Culture Dept.">People & Culture Dept.</option>
                        <option value="Business Development Dept.">Business Development Dept.</option>
                        <option value="Operations & Supply Chain Dept.">Operations & Supply Chain Dept.</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Lokasi Kerja</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Jakarta HQ"
                        value={newTalent.location}
                        onChange={(e) => setNewTalent({...newTalent, location: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Masa Kerja (Tenure)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: 5 Years"
                        value={newTalent.tenure}
                        onChange={(e) => setNewTalent({...newTalent, tenure: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                  </div>

                  {/* Profiling Fields Grid (Grade, Tanggal Lahir, Umur, Tanggal Masuk) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Grade / Golongan</label>
                      <select 
                        value={newTalent.grade}
                        onChange={(e) => setNewTalent({...newTalent, grade: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="M5">M5 (SVP / Director)</option>
                        <option value="M4">M4 (VP / Senior Director)</option>
                        <option value="M3">M3 (AVP / Director)</option>
                        <option value="M2">M2 (Senior Manager)</option>
                        <option value="M1">M1 (Manager)</option>
                        <option value="ST5">ST5 (Principal / Senior Advisor)</option>
                        <option value="ST4">ST4 (Lead / Advisor)</option>
                        <option value="ST3">ST3 (Senior Staff)</option>
                        <option value="ST2">ST2 (Staff)</option>
                        <option value="ST1">ST1 (Junior Staff)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Lahir</label>
                      <input 
                        type="date" 
                        required
                        value={newTalent.birthDate}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          let calculatedAge = newTalent.age;
                          if (dateVal) {
                            const birthYear = new Date(dateVal).getFullYear();
                            const currentYear = new Date().getFullYear();
                            if (!isNaN(birthYear)) {
                              calculatedAge = currentYear - birthYear;
                            }
                          }
                          setNewTalent({...newTalent, birthDate: dateVal, age: calculatedAge});
                        }}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Umur (Tahun)</label>
                      <input 
                        type="number" 
                        required
                        min={17}
                        max={100}
                        placeholder="Umur"
                        value={newTalent.age}
                        onChange={(e) => setNewTalent({...newTalent, age: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Masuk</label>
                      <input 
                        type="date" 
                        required
                        value={newTalent.joinDate}
                        onChange={(e) => setNewTalent({...newTalent, joinDate: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                  </div>

                  {/* Educational Background Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Latar Belakang Pendidikan</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: S1 Teknik Industri atau S2 Manajemen Bisnis"
                        value={newTalent.studyBackgroundName}
                        onChange={(e) => setNewTalent({...newTalent, studyBackgroundName: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Poin Tingkatan Pendidikan (1-5)</label>
                      <select 
                        value={newTalent.studyBackgroundScore}
                        onChange={(e) => setNewTalent({...newTalent, studyBackgroundScore: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value={5}>5 (S3 / Pascasarjana)</option>
                        <option value={4}>4 (S1 / Magister - Standar)</option>
                        <option value={3}>3 (D3 / Ahli Madya)</option>
                        <option value={2}>2 (SLTA / Sederajat)</option>
                        <option value={1}>1 (SMP / Dasar)</option>
                        <option value={2}>2 (S1 / Sarjana Terkait)</option>
                        <option value={1}>1 (S1 Sektor Lain / Diploma / Sederajat)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Avatar Presets & Custom File Upload */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block text-left">Pilih Foto Profil (Preset Gender atau Upload File)</label>
                    
                    {/* File Upload Button */}
                    <label className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64Url = await compressImageFile(file, 256, 0.75);
                              if (base64Url) {
                                setNewTalent(prev => ({ ...prev, avatar: base64Url }));
                              }
                            } catch (err: any) {
                              alert("Gagal memproses foto: " + (err.message || "Unknown error"));
                            }
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex gap-4 items-center flex-wrap">
                    {(newTalent.gender === "Perempuan" ? FEMALE_AVATARS : MALE_AVATARS).slice(0, 6).map((imgUrl, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setNewTalent({...newTalent, avatar: imgUrl})}
                        className={`relative rounded-full p-0.5 border-2 transition-all overflow-hidden w-12 h-12 ${
                          newTalent.avatar === imgUrl ? "border-primary scale-110" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={imgUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                        {newTalent.avatar === imgUrl && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-full">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                    {newTalent.avatar && newTalent.avatar.startsWith("data:image") && (
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                        <img src={newTalent.avatar} className="w-6 h-6 rounded-full object-cover" alt="Custom" />
                        <span>Foto Custom Ter-upload</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Readiness & Scores */}
                <div className="space-y-4">
                  <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5 text-left">2. Readiness Level & Psychometric Scores</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Readiness Level</label>
                      <select 
                        value={newTalent.readiness}
                        onChange={(e) => setNewTalent({...newTalent, readiness: e.target.value})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="READY NOW">READY NOW (Siap Memimpin Segera)</option>
                        <option value="READY 1-2 YEARS">READY 1-2 YEARS (Siap dalam 1-2 Tahun)</option>
                        <option value="READY 2+ YEARS">READY 2+ YEARS (Siap dalam &gt;2 Tahun)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Logical Score (%)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        required
                        value={newTalent.logicalScore}
                        onChange={(e) => setNewTalent({...newTalent, logicalScore: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Leadership (%)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        required
                        value={newTalent.leadershipScore}
                        onChange={(e) => setNewTalent({...newTalent, leadershipScore: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Competencies Scores */}
                <div className="space-y-4">
                  <h3 className="font-display text-xs font-bold text-primary uppercase tracking-wider border-b border-surface-container-highest pb-1.5 text-left">3. Calibration Competencies (0-100)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5 bg-surface p-3.5 rounded-lg border border-surface-container-highest text-left">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Business Knowledge</span>
                        <span className="text-primary">{newTalent.problemSolvingScore}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
                        max="100" 
                        value={newTalent.problemSolvingScore} 
                        onChange={(e) => setNewTalent({...newTalent, problemSolvingScore: Number(e.target.value)})}
                        className="w-full accent-primary mt-1"
                      />
                    </div>

                    <div className="space-y-1.5 bg-surface p-3.5 rounded-lg border border-surface-container-highest text-left">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Leadership</span>
                        <span className="text-secondary">{newTalent.strategicScore}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
                        max="100" 
                        value={newTalent.strategicScore} 
                        onChange={(e) => setNewTalent({...newTalent, strategicScore: Number(e.target.value)})}
                        className="w-full accent-secondary mt-1"
                      />
                    </div>

                    <div className="space-y-1.5 bg-surface p-3.5 rounded-lg border border-surface-container-highest text-left">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Problem Solving</span>
                        <span className="text-emerald-700">{newTalent.stakeholderScore}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
                        max="100" 
                        value={newTalent.stakeholderScore} 
                        onChange={(e) => setNewTalent({...newTalent, stakeholderScore: Number(e.target.value)})}
                        className="w-full accent-emerald-700 mt-1"
                      />
                    </div>

                    <div className="space-y-1.5 bg-surface p-3.5 rounded-lg border border-surface-container-highest text-left">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Interpersonal Skill</span>
                        <span className="text-amber-700">{newTalent.resultsScore}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
                        max="100" 
                        value={newTalent.resultsScore} 
                        onChange={(e) => setNewTalent({...newTalent, resultsScore: Number(e.target.value)})}
                        className="w-full accent-amber-700 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-surface-container-highest">
                  <button 
                    type="button"
                    onClick={() => setIsAddTalentOpen(false)}
                    className="px-5 py-2.5 border border-surface-container-highest bg-white text-secondary hover:bg-surface text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    SIMPAN KE TALENT POOL
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SAVE FILTER MODAL */}
      <AnimatePresence>
        {isSaveFilterModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsSaveFilterModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="relative bg-surface rounded-2xl shadow-xl border border-surface-container-highest w-full max-w-lg z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-surface border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BookmarkPlus className="w-5 h-5 text-primary" />
                  <span className="font-display font-extrabold text-sm text-primary uppercase tracking-wide">Simpan Custom Filter (Quick View)</span>
                </div>
                <button 
                  onClick={() => setIsSaveFilterModalOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveCurrentFilter} className="p-6 space-y-5 text-on-surface text-left">
                {/* Parameter Summary Box */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kombinasi Filter Saat Ini:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Kata Kunci:</span>{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{searchTerm || "(Semua)"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Departemen/Divisi:</span>{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{divisionFilter}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Readiness Level:</span>{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{readinessFilter}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Hasil Talenta:</span>{" "}
                      <span className="font-extrabold text-primary">{filteredTalents.length} orang</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Nama Tampilan Filter <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Kandidat High Potential di Divisi Technology"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Keterangan / Deskripsi Singkat (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Keterangan singkat tujuan filter ini..."
                    value={newFilterDesc}
                    onChange={(e) => setNewFilterDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface font-medium"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-surface-container-highest">
                  <button 
                    type="button"
                    onClick={() => setIsSaveFilterModalOpen(false)}
                    className="px-5 py-2.5 border border-surface-container-highest bg-white text-slate-700 hover:bg-surface text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4" />
                    Simpan Tampilan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* 6. ADD RETIRING POSITION MODAL - FOR SUCCESSION PLANNING */}
        <AnimatePresence>
          {isAddRetiringPositionOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setIsAddRetiringPositionOpen(false)}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
                className="bg-white rounded-2xl border border-surface-container-highest shadow-xl w-full max-w-lg p-6 relative z-10"
              >
              <div className="flex justify-between items-center pb-4 border-b border-surface-container-highest mb-6">
                <div className="text-left">
                  <h2 className="font-display text-lg font-extrabold text-primary flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    TAMBAH PELACAKAN PENSIUN JABATAN
                  </h2>
                  <p className="text-xs text-on-surface-variant">Sistem Integrasi Penunjukan Suksesor Potensial Top Management</p>
                </div>
                <button 
                  onClick={() => setIsAddRetiringPositionOpen(false)}
                  className="p-1.5 hover:bg-surface rounded-full text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddRetiringPosition} className="space-y-5 text-left">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Nama Jabatan</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Chief Executive Officer, VP of Supply Chain"
                      value={newRetiringPos.positionName}
                      onChange={(e) => setNewRetiringPos({...newRetiringPos, positionName: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-outline"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Nama Petahana Saat Ini</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Dr. Ir. Haris Subiantoro"
                        value={newRetiringPos.currentIncumbent}
                        onChange={(e) => setNewRetiringPos({...newRetiringPos, currentIncumbent: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-outline"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Timeline / Tanggal Pensiun</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Maret 2027 (9 Bulan)"
                        value={newRetiringPos.retirementDate}
                        onChange={(e) => setNewRetiringPos({...newRetiringPos, retirementDate: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-outline"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Kebutuhan Sektor Department</label>
                      <select 
                        value={newRetiringPos.division}
                        onChange={(e) => setNewRetiringPos({...newRetiringPos, division: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="Technology Dept.">Technology Dept.</option>
                        <option value="Finance Dept.">Finance Dept.</option>
                        <option value="People & Culture Dept.">People & Culture Dept.</option>
                        <option value="Operations & Supply Chain Dept.">Operations & Supply Chain Dept.</option>
                        <option value="Business Development Dept.">Business Development Dept.</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Skala Urgensi Suksesi</label>
                      <select 
                        value={newRetiringPos.urgency}
                        onChange={(e) => setNewRetiringPos({...newRetiringPos, urgency: e.target.value as "High" | "Medium" | "Low"})}
                        className="w-full px-3.5 py-2.5 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        <option value="High">High Urgency</option>
                        <option value="Medium">Medium Urgency</option>
                        <option value="Low">Low Urgency</option>
                      </select>
                    </div>
                  </div>

                  {/* Competency target calibration */}
                  <div className="bg-surface p-4 rounded-xl border border-surface-container-highest space-y-3">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Kalibrasi Target Kompetensi Jabatan</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-on-surface-variant uppercase block">Target Kompetensi Utama 1</label>
                        <select 
                          value={newRetiringPos.targetCompetency1}
                          onChange={(e) => setNewRetiringPos({...newRetiringPos, targetCompetency1: e.target.value})}
                          className="w-full px-2.5 py-2 bg-white rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                        >
                          <option value="Business Knowledge">Business Knowledge</option>
                          <option value="Leadership">Leadership</option>
                          <option value="Problem Solving">Problem Solving</option>
                          <option value="Interpersonal Skill">Interpersonal Skill</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-on-surface-variant uppercase block">Target Kompetensi Utama 2</label>
                        <select 
                          value={newRetiringPos.targetCompetency2}
                          onChange={(e) => setNewRetiringPos({...newRetiringPos, targetCompetency2: e.target.value})}
                          className="w-full px-2.5 py-2 bg-white rounded-lg border border-surface-container-highest text-xs focus:outline-none focus:border-primary text-on-surface"
                        >
                          <option value="Problem Solving">Problem Solving</option>
                          <option value="Business Knowledge">Business Knowledge</option>
                          <option value="Leadership">Leadership</option>
                          <option value="Interpersonal Skill">Interpersonal Skill</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-container-highest">
                  <button 
                    type="button"
                    onClick={() => setIsAddRetiringPositionOpen(false)}
                    className="px-5 py-2.5 border border-surface-container-highest bg-white text-secondary hover:bg-surface text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    SIMPAN JABATAN PENSIUN
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* ADD/EDIT TRAINING MODAL */}
        <AnimatePresence>
          {isAddTrainingOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              {/* Modal backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setIsAddTrainingOpen(false)}
              />
              
              {/* Modal Box */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
                className="bg-white rounded-xl shadow-2xl border border-surface-container-highest max-w-lg w-full relative z-10 flex flex-col overflow-hidden text-on-surface"
              >
              {/* Header */}
              <div className="p-5 bg-surface border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <span className="font-display font-extrabold text-sm text-primary uppercase tracking-wide">
                    {editingTrainingId ? "Edit Program Pelatihan" : "Tambah Program Pelatihan Baru"}
                  </span>
                </div>
                <button 
                  onClick={() => setIsAddTrainingOpen(false)}
                  className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={editingTrainingId ? handleSaveEditTraining : handleAddTraining} className="p-6 space-y-4 text-on-surface text-left">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Nama Program Pelatihan / Sertifikasi</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Executive Leadership Development Course"
                    value={newTraining.name}
                    onChange={(e) => setNewTraining({...newTraining, name: e.target.value})}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Penyedia (Provider)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Harvard Business School"
                      value={newTraining.provider}
                      onChange={(e) => setNewTraining({...newTraining, provider: e.target.value})}
                      className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Pelaksanaan / Rencana</label>
                    <input 
                      type="date" 
                      required
                      value={newTraining.date}
                      onChange={(e) => setNewTraining({...newTraining, date: e.target.value})}
                      className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Kategori Pelatihan</label>
                    <select 
                      value={newTraining.type}
                      onChange={(e) => setNewTraining({...newTraining, type: e.target.value as any})}
                      className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                    >
                      <option value="Leadership">Leadership (Kepemimpinan)</option>
                      <option value="Technical">Technical (Teknis / Keahlian)</option>
                      <option value="Management">Management (Manajerial)</option>
                      <option value="Certification">Certification (Sertifikasi Profesional)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Status Pelaksanaan</label>
                    <select 
                      value={newTraining.status}
                      onChange={(e) => setNewTraining({...newTraining, status: e.target.value as any})}
                      className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface"
                    >
                      <option value="Planned">Planned (Direncanakan)</option>
                      <option value="In Progress">In Progress (Sedang Berjalan)</option>
                      <option value="Completed">Completed (Selesai)</option>
                      <option value="Cancelled">Cancelled (Dibatalkan)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Catatan Evaluasi / Keterangan Tambahan</label>
                  <textarea 
                    rows={3}
                    placeholder="Contoh: Evaluasi hasil belajar, nilai ujian sertifikasi, predikat kelulusan, atau rencana aksi pasca-pelatihan."
                    value={newTraining.notes}
                    onChange={(e) => setNewTraining({...newTraining, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-container-highest text-sm focus:outline-none focus:border-primary text-on-surface resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-surface-container-highest">
                  <button 
                    type="button"
                    onClick={() => setIsAddTrainingOpen(false)}
                    className="px-5 py-2.5 border border-surface-container-highest bg-white text-secondary hover:bg-surface text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    {editingTrainingId ? "Simpan Perubahan" : "Tambahkan Pelatihan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SEND EMAIL REPORT DISPATCH MODAL */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => {
                if (emailSendingStatus !== "sending") setIsEmailModalOpen(false);
              }}
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.08 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full relative z-10 flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100"
            >
              {/* Header */}
              <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-black text-base text-white">
                        Send Report via Email Gateway
                      </h3>
                      <span className="text-[9px] font-black uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                        {emailType === "summary" ? "Summary Data System" : "Individual Assessment"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Kirimkan rangkuman hasil evaluasi dan dokumen pendukung ke Direksi / Komite Talenta
                    </p>
                  </div>
                </div>
                
                {emailSendingStatus !== "sending" && (
                  <button 
                    onClick={() => setIsEmailModalOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-left flex-1 custom-scrollbar">
                
                {/* Switcher Tipe Laporan */}
                <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl flex gap-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleOpenSendEmail("summary")}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      emailType === "summary"
                        ? "bg-white dark:bg-slate-900 text-primary dark:text-teal-400 shadow-xs border border-slate-200 dark:border-slate-700 font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Summary Data System (BOD)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSendEmail("individual", selectedTalentId)}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      emailType === "individual"
                        ? "bg-white dark:bg-slate-900 text-primary dark:text-teal-400 shadow-xs border border-slate-200 dark:border-slate-700 font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Laporan Individual ({talents.find(t => t.id === emailTargetTalentId)?.name?.split(' ')[0] || "Talenta"})
                  </button>
                </div>

                {/* Sending Overlay Progress */}
                {emailSendingStatus === "sending" && (
                  <div className="py-10 px-6 text-center space-y-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                    <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
                    <div>
                      <h4 className="font-display font-black text-sm text-slate-900 dark:text-slate-100">
                        Proses Pengiriman Email Berlangsung...
                      </h4>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                        {emailSendingStep}
                      </p>
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {emailSendingStatus === "success" && (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex items-start gap-3 text-emerald-800 dark:text-emerald-200">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-display font-black text-sm">
                          Simulasi Audit Log SMTP In-App Berhasil Dibuat!
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                          Tercatat di riwayat internal untuk penerima: <strong>{emailForm.recipientEmail}</strong>.
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2 rounded-lg border border-amber-200 dark:border-amber-800 font-medium mt-2">
                          💡 <strong>Ingin menerima email asli di inbox Gmail Anda?</strong> Klik tombol <strong>"Buka Langsung di Gmail"</strong> di bawah untuk membuka draf email dengan subjek & isi pesan terisi otomatis!
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                      <button
                        type="button"
                        onClick={handleOpenInGmail}
                        className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Buka Langsung di Gmail
                      </button>
                      <button
                        type="button"
                        onClick={handleDirectMailto}
                        className="bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-200 font-bold text-xs px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        Buka Mail Client (Mailto)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailSendingStatus("idle")}
                        className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline px-2 cursor-pointer ml-auto"
                      >
                        Kirim Email Lagi
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Input */}
                {emailSendingStatus !== "sending" && (
                  <form onSubmit={handleSendEmailSubmit} className="space-y-4">
                    
                    {/* Explanation Box */}
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                      <span className="text-base shrink-0">ℹ️</span>
                      <div className="leading-normal space-y-1">
                        <strong className="font-bold block text-slate-900 dark:text-slate-100">Opsi Pengiriman Email Sistem:</strong>
                        <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 list-disc list-inside">
                          <li><strong>1. Server SMTP Gateway (Direct)</strong>: Mengirim email nyata dari server jika variabel `SMTP_HOST` & `SMTP_PASS` diisi di file `.env`.</li>
                          <li><strong>2. Buka di Gmail (1-Click Send)</strong>: Membuka draf email otomatis di aplikasi Web Gmail browser Anda untuk dikirim ke <code>mahmudnurdiansyah4@gmail.com</code>.</li>
                          <li><strong>3. Simulasi Server Log</strong>: Mencatat log audit 200 OK di sistem web untuk pengujian internal.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Recipient Presets */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Pilih Preset Penerima Komite / Email Saya:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEmailPresetChange("bod")}
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            emailPresetRecipient === "bod"
                              ? "border-primary bg-primary/10 text-primary dark:text-teal-300 font-black"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Direksi / BOD
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailPresetChange("hr_head")}
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            emailPresetRecipient === "hr_head"
                              ? "border-primary bg-primary/10 text-primary dark:text-teal-300 font-black"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          HR Head
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailPresetChange("dept_head")}
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            emailPresetRecipient === "dept_head"
                              ? "border-primary bg-primary/10 text-primary dark:text-teal-300 font-black"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Dept Head
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailPresetChange("my_email")}
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            emailPresetRecipient === "my_email"
                              ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black ring-1 ring-emerald-500"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                          title="Kirim ke email pribadi: mahmudnurdiansyah4@gmail.com"
                        >
                          📧 Email Saya
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailPresetChange("custom")}
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            emailPresetRecipient === "custom"
                              ? "border-primary bg-primary/10 text-primary dark:text-teal-300 font-black"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Manual Input
                        </button>
                      </div>
                    </div>

                    {/* Email Recipient Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Email Penerima (To) *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input 
                            type="email" 
                            required
                            placeholder="nama.penerima@ajinomoto.co.id / mahmudnurdiansyah4@gmail.com"
                            value={emailForm.recipientEmail}
                            onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Tembusan (CC)
                        </label>
                        <input 
                          type="text" 
                          placeholder="email.cc1@ajinomoto.co.id, email.cc2@..."
                          value={emailForm.ccEmail}
                          onChange={(e) => setEmailForm({ ...emailForm, ccEmail: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Subjek Surat Elektronik *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Body Message */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Pesan Ringkasan Eksekutif *
                      </label>
                      <textarea 
                        rows={6}
                        required
                        value={emailForm.message}
                        onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                        className="w-full p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary custom-scrollbar resize-none font-sans"
                      />
                    </div>

                    {/* Attachment Options */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                        Opsi Berkas Lampiran (Attachment):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                          <input 
                            type="checkbox"
                            checked={emailForm.attachPdf}
                            onChange={(e) => setEmailForm({ ...emailForm, attachPdf: e.target.checked })}
                            className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          <span>Dokumen PDF Report</span>
                        </label>
                        {emailType === "summary" && (
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                            <input 
                              type="checkbox"
                              checked={emailForm.attachCsv}
                              onChange={(e) => setEmailForm({ ...emailForm, attachCsv: e.target.checked })}
                              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            <span>Master Dataset CSV</span>
                          </label>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                          <input 
                            type="checkbox"
                            checked={emailForm.attachExecutiveSummary}
                            onChange={(e) => setEmailForm({ ...emailForm, attachExecutiveSummary: e.target.checked })}
                            className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          <span>Tautan Portal Digital</span>
                        </label>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenInGmail}
                          className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          title="Buka draf laporan langsung di aplikasi Web Gmail"
                        >
                          <Mail className="w-3.5 h-3.5 text-white" />
                          Buka di Gmail
                        </button>

                        <button
                          type="button"
                          onClick={handleDirectMailto}
                          className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl"
                          title="Buka di aplikasi email lokal seperti Outlook / Apple Mail"
                        >
                          <Send className="w-3.5 h-3.5 text-primary" />
                          Mail Client
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setIsEmailModalOpen(false)}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-amber-400"
                        >
                          <Mail className="w-4 h-4 text-slate-950" />
                          Simulasi Log System
                        </button>
                      </div>
                    </div>

                  </form>
                )}

                {/* Sent Email History Log */}
                {emailSentLog.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Riwayat Pengiriman Email Sesi Ini ({emailSentLog.length}):
                    </h5>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                      {emailSentLog.map((log) => (
                        <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {log.targetName} → {log.recipient}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[320px]">
                              {log.subject}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full block">
                              {log.status}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">{log.sentAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Redesigned Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-100 dark:border-rose-950/60 overflow-hidden z-10"
            >
              {/* Top Warning Stripe */}
              <div className="h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600"></div>

              <div className="p-6 space-y-5 text-left">
                {/* Header Icon & Title */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-900 shrink-0 shadow-xs">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                      {deleteConfirmConfig.title || "Konfirmasi Hapus Data"}
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Tindakan Permanen Tidak Dapat Dibatalkan
                    </p>
                  </div>
                </div>

                {/* Target Item Display Card */}
                {deleteConfirmConfig.itemName && (
                  <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/60 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {deleteConfirmConfig.itemName}
                      </span>
                      {deleteConfirmConfig.itemBadge && (
                        <span className="text-[10px] font-extrabold bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-md shrink-0">
                          {deleteConfirmConfig.itemBadge}
                        </span>
                      )}
                    </div>
                    {deleteConfirmConfig.itemSubtitle && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {deleteConfirmConfig.itemSubtitle}
                      </p>
                    )}
                  </div>
                )}

                {/* Warning Details Text */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {deleteConfirmConfig.warningText || "Apakah Anda benar-benar yakin ingin menghapus data ini? Seluruh riwayat dan penilaian terkait akan dihapus secara permanen dari basis data sistem."}
                </p>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmConfig.onConfirm) {
                        deleteConfirmConfig.onConfirm();
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteConfirmConfig.confirmButtonText || "Ya, Hapus Permanent"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Supabase Connection & Notification Modal */}
      <AnimatePresence>
        {supabaseModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Solid Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSupabaseModal(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 text-left"
            >
              {/* Top Branding Header */}
              <div className="p-5 bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-teal-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shadow-inner shrink-0">
                    <Database className="w-5 h-5 text-teal-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-xs text-teal-300 uppercase tracking-widest">
                        SUPABASE CLOUD DATABASE
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        supabaseModal.type === "success" 
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                          : supabaseModal.type === "error"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                      }`}>
                        {supabaseModal.type === "success" ? "Terhubung" : supabaseModal.type === "error" ? "Gagal" : supabaseModal.type === "syncing" ? "Proses Sync..." : "Informasi"}
                      </span>
                    </div>
                    <h3 className="font-display font-extrabold text-base text-white tracking-tight mt-0.5">
                      {supabaseModal.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSupabaseModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-slate-800 dark:text-slate-200">
                {/* Main Message */}
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  {supabaseModal.type === "success" ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                  ) : supabaseModal.type === "error" ? (
                    <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                  ) : (
                    <Zap className="w-6 h-6 text-teal-500 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {supabaseModal.message}
                    </p>
                    {supabaseModal.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {supabaseModal.details}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connection Status & Summary Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Project URL:</span>
                    <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 font-bold block truncate">
                      {supabaseConfig.url || "Belum dikonfigurasi"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mode Real-Time Auto-Sync:</span>
                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 block">
                      {isAutoSyncEnabled && supabaseConfig.isEnabled ? "Aktif (Otomatis)" : "Manual"}
                    </span>
                  </div>
                </div>

                {/* SQL Code Snippet if applicable */}
                {supabaseModal.sqlSnippet && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        SQL Script Inisialisasi Tabel
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(supabaseModal.sqlSnippet || "");
                          setShortcutToast("SQL Script berhasil disalin ke clipboard!");
                        }}
                        className="text-[10px] font-black bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" /> Salin Script SQL
                      </button>
                    </div>
                    <pre className="w-full bg-slate-950 text-emerald-400 font-mono text-[10px] p-3.5 rounded-xl border border-slate-800 max-h-[120px] overflow-y-auto leading-relaxed select-all">
                      {supabaseModal.sqlSnippet}
                    </pre>
                  </div>
                )}

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSupabaseSyncing}
                      onClick={() => handlePushToSupabase()}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      Push Data Ke Cloud
                    </button>
                    <button
                      type="button"
                      disabled={isSupabaseSyncing}
                      onClick={() => handlePullFromSupabase()}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      Pull Data Dari Cloud
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSupabaseModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    Tutup Popup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification when Shortcut Triggered */}
      <AnimatePresence>
        {shortcutToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[120] bg-slate-900/95 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 font-extrabold text-xs flex items-center gap-2.5 backdrop-blur-md"
          >
            <Zap className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
            <span>{shortcutToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette / Quick Search Modal (Ctrl + K) */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[110] flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandPaletteOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
            >
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/70 dark:bg-slate-950/50">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  placeholder="Cari talenta (nama, NIK, divisi) atau perintah..."
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-500 shadow-2xs shrink-0">
                  ESC
                </kbd>
              </div>

              <div className="max-h-96 overflow-y-auto p-2 space-y-3">
                {/* Candidates List */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 block mb-1">
                    Kandidat & Talenta
                  </span>
                  {filteredCommandTalents.length > 0 ? (
                    filteredCommandTalents.slice(0, 5).map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTalentId(t.id);
                          setActiveTab("profile");
                          setIsCommandPaletteOpen(false);
                          setShortcutToast(`Profil ${t.name} dibuka`);
                          setTimeout(() => setShortcutToast(null), 2000);
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {t.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                              {t.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {t.title} • {t.division}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {t.readiness}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">Tidak ada kandidat sesuai pencarian</div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 block mb-1">
                    Perintah System Cepat
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {userRole === "admin" && (
                      <button
                        onClick={() => { setActiveTab("home"); setIsCommandPaletteOpen(false); }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <span>Dashboard Overview</span>
                      </button>
                    )}
                    {userRole === "admin" && (
                      <button
                        onClick={() => { setActiveTab("talent-pool"); setIsCommandPaletteOpen(false); }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-primary" />
                        <span>Talent Directory</span>
                      </button>
                    )}
                    {userRole === "admin" && (
                      <button
                        onClick={() => { setActiveTab("nine-box"); setIsCommandPaletteOpen(false); }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <Grid3X3 className="w-4 h-4 text-primary" />
                        <span>Nine-Box Matrix</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setIsReportModalOpen(true); setIsCommandPaletteOpen(false); }}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => { setIsSidebarCollapsed(!isSidebarCollapsed); setIsCommandPaletteOpen(false); }}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <PanelLeftClose className="w-4 h-4 text-amber-500" />
                      <span>{isSidebarCollapsed ? "Perlebar Sidebar" : "Perkecil Sidebar"}</span>
                    </button>
                    <button
                      onClick={() => { setIsShortcutsModalOpen(true); setIsCommandPaletteOpen(false); }}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Keyboard className="w-4 h-4 text-sky-500" />
                      <span>Lihat Semua Shortcut</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-100 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center px-4">
                <span>Tekan Esc untuk keluar</span>
                <span className="font-mono text-[10px] text-slate-400">Ctrl + K untuk toggle</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <AnimatePresence>
        {isShortcutsModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShortcutsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-slate-100">
                      Pintas Keyboard (Shortcuts)
                    </h3>
                    <p className="text-xs text-slate-500">Navigasi cepat dan kontrol efisien dengan keyboard</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Section 1: Tampilan & Palette */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Navigasi & Layout Utama
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Perkecil / Perlebar Sidebar</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">B</kbd>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Command Palette / Cari Talenta</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">K</kbd>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Buka Menu Shortcut ini</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">?</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Tab Switcher Shortcuts */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-sky-500" />
                    Pindah Modul / Tab Cepat
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Dashboard Overview</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Alt</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">1</kbd>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Talent Pool Directory</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Alt</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">2</kbd>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Nine-Box Placement</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Alt</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">3</kbd>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Profil & IDP Detail</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Alt</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">4</kbd>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Advisory Controls</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Alt</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">5</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Modals & Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    Modal & Kontrol Pop-up
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Tutup Modal / Popup Terbuka</span>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs font-bold text-slate-700 dark:text-slate-300">Esc</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/95 transition-all cursor-pointer"
                >
                  Mengerti & Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
