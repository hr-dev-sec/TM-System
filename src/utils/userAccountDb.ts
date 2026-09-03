import { UserAccount } from "../types";

export const USER_ACCOUNTS_STORAGE_KEY = "ajinomoto_user_accounts_db";
export const ACTIVE_SESSION_STORAGE_KEY = "ajinomoto_active_session_user";

export const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  {
    id: "user-admin-master",
    name: "Marcus Sterling",
    email: "admin@ajinomoto.com",
    password: "password123",
    role: "admin",
    title: "Chief Talent Officer (Admin)",
    department: "Human Capital Management",
    status: "active",
    initials: "MS",
    notes: "Administrator Master Komite Suksesi PT Ajinomoto Indonesia",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z"
  },
  {
    id: "user-edwin-prasetyo",
    name: "Edwin Prasetyo",
    email: "user@ajinomoto.com",
    password: "password123",
    role: "user",
    title: "Section Manager Candidate",
    department: "Food Ingredients-1 (A-MJK)",
    linkedTalentId: "edwin-prasetyo",
    status: "active",
    initials: "EP",
    notes: "Kandidat Suksesi Department Manager FI-1",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z"
  },
  {
    id: "user-hr-assessor",
    name: "Rina Kusuma Wardhani",
    email: "hr.assessor@ajinomoto.com",
    password: "password123",
    role: "admin",
    title: "HR Succession Specialist",
    department: "Talent Development & Culture",
    status: "active",
    initials: "RK",
    notes: "Penilai Asesmen & Kalibrasi 9-Box Matrix Komite",
    createdAt: "2026-01-05T09:30:00.000Z",
    updatedAt: "2026-01-05T09:30:00.000Z"
  },
  {
    id: "user-executive-viewer",
    name: "Budi Santoso",
    email: "board.viewer@ajinomoto.com",
    password: "password123",
    role: "user",
    title: "Executive Board Advisor",
    department: "Board of Directors Office",
    status: "active",
    initials: "BS",
    notes: "Akses Peninjauan Strategis & Laporan PDF Komite Eksekutif",
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z"
  }
];

export function generateInitials(name: string): string {
  if (!name || typeof name !== "string") return "AC";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "AC";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Load user accounts from localStorage or initialize with defaults.
 */
export function loadUserAccounts(): UserAccount[] {
  if (typeof window === "undefined") return DEFAULT_USER_ACCOUNTS;
  try {
    const raw = localStorage.getItem(USER_ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      saveUserAccounts(DEFAULT_USER_ACCOUNTS);
      return DEFAULT_USER_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((acc: Partial<UserAccount>, idx: number) => ({
        id: acc.id || `user-gen-${Date.now()}-${idx}`,
        name: acc.name || "Pengguna Ajinomoto",
        email: (acc.email || `user${idx}@ajinomoto.com`).toLowerCase().trim(),
        password: acc.password || "password123",
        role: acc.role === "admin" ? "admin" : "user",
        title: acc.title || (acc.role === "admin" ? "HR Administrator" : "Karyawan / Talent"),
        department: acc.department || "Ajinomoto Indonesia",
        status: acc.status === "inactive" ? "inactive" : "active",
        linkedTalentId: acc.linkedTalentId || undefined,
        avatar: acc.avatar || undefined,
        initials: acc.initials || generateInitials(acc.name || ""),
        notes: acc.notes || "",
        lastLogin: acc.lastLogin || undefined,
        createdAt: acc.createdAt || new Date().toISOString(),
        updatedAt: acc.updatedAt || new Date().toISOString()
      }));
    }
    saveUserAccounts(DEFAULT_USER_ACCOUNTS);
    return DEFAULT_USER_ACCOUNTS;
  } catch (err) {
    console.error("Gagal memuat database akun pengguna dari localStorage:", err);
    return DEFAULT_USER_ACCOUNTS;
  }
}

/**
 * Save user accounts array to localStorage.
 */
export function saveUserAccounts(accounts: UserAccount[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(USER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch (err) {
    console.error("Gagal menyimpan database akun pengguna ke localStorage:", err);
    return false;
  }
}

/**
 * Authenticate email and password against user accounts database.
 */
export function authenticateUser(
  emailInput: string,
  passwordInput: string,
  accounts: UserAccount[]
): { success: boolean; account?: UserAccount; error?: string } {
  const normalizedEmail = emailInput.trim().toLowerCase();
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  if (!account) {
    return {
      success: false,
      error: "Alamat email resmi tidak terdaftar dalam database pengguna."
    };
  }

  if (account.status === "inactive") {
    return {
      success: false,
      error: "Akun ini berstatus non-aktif. Silakan hubungi Administrator HR untuk reaktivasi."
    };
  }

  if (account.password && account.password !== passwordInput) {
    return {
      success: false,
      error: "Kata sandi yang Anda masukkan tidak sesuai."
    };
  }

  return {
    success: true,
    account
  };
}

/**
 * Record successful login timestamp and persist to storage.
 */
export function recordUserLogin(accountId: string, accounts: UserAccount[]): { updatedAccounts: UserAccount[]; activeAccount?: UserAccount } {
  const now = new Date().toISOString();
  let activeAccount: UserAccount | undefined;

  const updated = accounts.map((acc) => {
    if (acc.id === accountId) {
      activeAccount = {
        ...acc,
        lastLogin: now,
        updatedAt: now
      };
      return activeAccount;
    }
    return acc;
  });

  saveUserAccounts(updated);
  return { updatedAccounts: updated, activeAccount };
}

/**
 * Export accounts to formatted JSON string.
 */
export function exportAccountsToJSON(accounts: UserAccount[]): string {
  const exportPayload = {
    appName: "Ajinomoto Succession Suite - User Database",
    version: "2026.2",
    exportedAt: new Date().toISOString(),
    totalAccounts: accounts.length,
    accounts
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import accounts from JSON with schema validation.
 */
export function importAccountsFromJSON(jsonStr: string): { success: boolean; accounts?: UserAccount[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const candidateList = Array.isArray(parsed) ? parsed : parsed.accounts;

    if (!Array.isArray(candidateList) || candidateList.length === 0) {
      return { success: false, error: "Format JSON tidak memuat daftar akun yang valid." };
    }

    const validated: UserAccount[] = [];
    const emailSet = new Set<string>();

    for (const item of candidateList) {
      if (!item.email || !item.name) continue;
      const cleanEmail = String(item.email).trim().toLowerCase();
      if (emailSet.has(cleanEmail)) continue;
      emailSet.add(cleanEmail);

      validated.push({
        id: item.id || `user-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: String(item.name).trim(),
        email: cleanEmail,
        password: item.password || "password123",
        role: item.role === "admin" ? "admin" : "user",
        title: item.title || (item.role === "admin" ? "HR Administrator" : "Karyawan"),
        department: item.department || "Ajinomoto Indonesia",
        status: item.status === "inactive" ? "inactive" : "active",
        linkedTalentId: item.linkedTalentId || undefined,
        avatar: item.avatar || undefined,
        initials: item.initials || generateInitials(item.name),
        notes: item.notes || "",
        lastLogin: item.lastLogin || undefined,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (validated.length === 0) {
      return { success: false, error: "Tidak ada data akun valid yang dapat diimpor." };
    }

    // Ensure at least one admin exists
    const hasAdmin = validated.some((a) => a.role === "admin" && a.status === "active");
    if (!hasAdmin) {
      validated[0].role = "admin";
      validated[0].status = "active";
    }

    saveUserAccounts(validated);
    return { success: true, accounts: validated };
  } catch (err: any) {
    return { success: false, error: `Gagal membaca file JSON: ${err.message || err}` };
  }
}
