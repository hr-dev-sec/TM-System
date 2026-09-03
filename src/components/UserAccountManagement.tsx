import React, { useState, useId } from "react";
import { 
  UserAccount, 
  TalentProfile 
} from "../types";
import { 
  generateInitials, 
  saveUserAccounts, 
  exportAccountsToJSON, 
  importAccountsFromJSON,
  DEFAULT_USER_ACCOUNTS 
} from "../utils/userAccountDb";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Shield, 
  Search, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building, 
  Briefcase, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Check,
  Sparkles,
  Link2,
  Cloud,
  CloudUpload,
  CloudDownload,
  Database,
  Copy,
  ExternalLink,
  Code2,
  CheckCheck
} from "lucide-react";
import { 
  getSupabaseConfig, 
  pushUserAccountsToSupabase, 
  pullUserAccountsFromSupabase, 
  deleteUserAccountFromSupabase,
  USER_ACCOUNTS_SQL_SCHEMA 
} from "../supabaseClient";

interface UserAccountManagementProps {
  accounts: UserAccount[];
  onAccountsChange: (updatedAccounts: UserAccount[]) => void;
  currentUserId?: string;
  talents: TalentProfile[];
  onNotify?: (message: string, type?: "success" | "warning" | "info") => void;
}

export const UserAccountManagement: React.FC<UserAccountManagementProps> = ({
  accounts,
  onAccountsChange,
  currentUserId,
  talents,
  onNotify
}) => {
  const searchInputId = useId();
  const roleFilterId = useId();
  const statusFilterId = useId();
  const importFileInputId = useId();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<UserAccount | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Form states for Create/Edit
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("password123");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formTitle, setFormTitle] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formLinkedTalentId, setFormLinkedTalentId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));

  // Supabase Dedicated Sheet ("user_accounts") Sync States
  const [isSupabasePushing, setIsSupabasePushing] = useState(false);
  const [isSupabasePulling, setIsSupabasePulling] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isSqlCopied, setIsSqlCopied] = useState(false);
  const [supabaseSyncMessage, setSupabaseSyncMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const supabaseConfig = getSupabaseConfig();

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.title.toLowerCase().includes(q) ||
      acc.department.toLowerCase().includes(q);

    const matchRole = roleFilter === "all" || acc.role === roleFilter;
    const matchStatus = statusFilter === "all" || acc.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const totalAdmins = accounts.filter((a) => a.role === "admin" && a.status === "active").length;
  const totalUsers = accounts.filter((a) => a.role === "user").length;
  const totalActive = accounts.filter((a) => a.status === "active").length;

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("password123");
    setFormRole("user");
    setFormTitle("");
    setFormDepartment("Food Ingredients-1 (A-MJK)");
    setFormStatus("active");
    setFormLinkedTalentId("");
    setFormNotes("");
    setFormError("");
    setShowModalPassword(false);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormEmail(acc.email);
    setFormPassword(acc.password || "password123");
    setFormRole(acc.role);
    setFormTitle(acc.title);
    setFormDepartment(acc.department);
    setFormStatus(acc.status);
    setFormLinkedTalentId(acc.linkedTalentId || "");
    setFormNotes(acc.notes || "");
    setFormError("");
    setShowModalPassword(false);
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName) {
      setFormError("Nama lengkap wajib diisi.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setFormError("Format alamat email tidak valid.");
      return;
    }

    // Check email uniqueness
    const duplicate = accounts.find(
      (a) => a.email.toLowerCase() === cleanEmail && (!editingAccount || a.id !== editingAccount.id)
    );
    if (duplicate) {
      setFormError(`Email '${cleanEmail}' sudah digunakan oleh pengguna ${duplicate.name}.`);
      return;
    }

    // Protect at least one active admin
    if (editingAccount && editingAccount.role === "admin" && formRole === "user") {
      if (totalAdmins <= 1 && editingAccount.status === "active") {
        setFormError("Sistem memerlukan minimal satu akun Administrator yang aktif.");
        return;
      }
    }

    if (editingAccount && editingAccount.status === "active" && formStatus === "inactive" && editingAccount.role === "admin") {
      if (totalAdmins <= 1) {
        setFormError("Tidak dapat menonaktifkan akun Administrator terakhir.");
        return;
      }
    }

    const nowIso = new Date().toISOString();

    let updatedList: UserAccount[];

    if (editingAccount) {
      // Update existing
      updatedList = accounts.map((item) => {
        if (item.id === editingAccount.id) {
          return {
            ...item,
            name: cleanName,
            email: cleanEmail,
            password: formPassword || "password123",
            role: formRole,
            title: formTitle.trim() || (formRole === "admin" ? "HR Administrator" : "Karyawan"),
            department: formDepartment.trim() || "Ajinomoto Indonesia",
            status: formStatus,
            linkedTalentId: formLinkedTalentId || undefined,
            notes: formNotes.trim(),
            initials: generateInitials(cleanName),
            updatedAt: nowIso
          };
        }
        return item;
      });
      onNotify?.(`Akun '${cleanName}' berhasil diperbarui dan disimpan ke database.`, "success");
    } else {
      // Create new
      const newAcc: UserAccount = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        email: cleanEmail,
        password: formPassword || "password123",
        role: formRole,
        title: formTitle.trim() || (formRole === "admin" ? "HR Administrator" : "Karyawan"),
        department: formDepartment.trim() || "Ajinomoto Indonesia",
        status: formStatus,
        linkedTalentId: formLinkedTalentId || undefined,
        notes: formNotes.trim(),
        initials: generateInitials(cleanName),
        createdAt: nowIso,
        updatedAt: nowIso
      };
      updatedList = [newAcc, ...accounts];
      onNotify?.(`Akun baru '${cleanName}' berhasil ditambahkan ke database pengguna.`, "success");
    }

    saveUserAccounts(updatedList);
    onAccountsChange(updatedList);
    setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    setIsFormModalOpen(false);
  };

  const handleToggleStatus = (acc: UserAccount) => {
    if (acc.role === "admin" && acc.status === "active" && totalAdmins <= 1) {
      onNotify?.("Tidak dapat menonaktifkan akun Administrator aktif satu-satunya.", "warning");
      return;
    }

    const nextStatus: "active" | "inactive" = acc.status === "active" ? "inactive" : "active";
    const updated = accounts.map((a) => (a.id === acc.id ? { ...a, status: nextStatus, updatedAt: new Date().toISOString() } : a));

    saveUserAccounts(updated);
    onAccountsChange(updated);
    setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    onNotify?.(`Status akun ${acc.name} diubah menjadi ${nextStatus === "active" ? "Aktif" : "Non-Aktif"}.`, "info");
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    if (deleteCandidate.id === currentUserId) {
      onNotify?.("Tidak dapat menghapus akun yang sedang Anda gunakan untuk login saat ini.", "warning");
      setDeleteCandidate(null);
      return;
    }

    if (deleteCandidate.role === "admin" && totalAdmins <= 1) {
      onNotify?.("Tidak dapat menghapus akun Administrator satu-satunya.", "warning");
      setDeleteCandidate(null);
      return;
    }

    const candidate = deleteCandidate;
    setDeleteCandidate(null);

    const updated = accounts.filter((a) => a.id !== candidate.id);
    saveUserAccounts(updated);
    onAccountsChange(updated);
    setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));

    // Jika Supabase aktif, hapus juga akun ini secara langsung dari tabel user_accounts di Supabase!
    if (supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.anonKey) {
      try {
        const res = await deleteUserAccountFromSupabase(candidate.id);
        if (res.success) {
          onNotify?.(`Akun ${candidate.name} berhasil dihapus dari database lokal & Supabase Cloud.`, "success");
          setSupabaseSyncMessage({
            text: `Akun ${candidate.name} (${candidate.email}) telah dihapus dari tabel 'user_accounts' di Supabase Cloud.`,
            type: "success"
          });
        } else {
          onNotify?.(`Akun ${candidate.name} dihapus dari lokal. (Hapus di Supabase: ${res.error}).`, "warning");
          setSupabaseSyncMessage({
            text: `Akun dihapus dari lokal, namun gagal dihapus di Supabase: ${res.error}. Anda dapat klik 'Push Akun ke Supabase' untuk menyelaraskan.`,
            type: "error"
          });
        }
      } catch (err: any) {
        onNotify?.(`Akun ${candidate.name} berhasil dihapus dari database lokal.`, "success");
      }
    } else {
      onNotify?.(`Akun ${candidate.name} berhasil dihapus dari database lokal.`, "success");
    }
  };

  const handleExportJson = () => {
    try {
      const jsonStr = exportAccountsToJSON(accounts);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ajinomoto_user_accounts_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onNotify?.("Data database akun berhasil diekspor ke file JSON.", "success");
    } catch (e) {
      onNotify?.("Gagal mengekspor data akun pengguna.", "warning");
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const parsed = importAccountsFromJSON(result);
      if (parsed.success && parsed.accounts) {
        onAccountsChange(parsed.accounts);
        setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
        onNotify?.(`Berhasil mengimpor ${parsed.accounts.length} akun pengguna ke database.`, "success");
      } else {
        onNotify?.(`Impor gagal: ${parsed.error || "Format tidak sesuai"}`, "warning");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleResetToDefaults = () => {
    saveUserAccounts(DEFAULT_USER_ACCOUNTS);
    onAccountsChange(DEFAULT_USER_ACCOUNTS);
    setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    setIsResetConfirmOpen(false);
    onNotify?.("Database akun telah dikembalikan ke akun default awal.", "info");
  };

  const copyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const togglePasswordVisibility = (accId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [accId]: !prev[accId] }));
  };

  const handlePushToSupabase = async () => {
    if (!supabaseConfig.isEnabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      const msg = "Koneksi Supabase belum diatur atau dinonaktifkan. Silakan periksa konfigurasi URL & Anon Key di Pengaturan.";
      setSupabaseSyncMessage({ text: msg, type: "error" });
      onNotify?.(msg, "warning");
      return;
    }

    setIsSupabasePushing(true);
    setSupabaseSyncMessage(null);
    try {
      const res = await pushUserAccountsToSupabase(accounts);
      if (res.success) {
        let msg = `Berhasil menyelaraskan ${res.count ?? accounts.length} akun aktif ke tabel 'user_accounts' di Supabase Cloud!`;
        if (res.deletedRemoteCount && res.deletedRemoteCount > 0) {
          msg += ` (${res.deletedRemoteCount} akun usang/terhapus di database Supabase berhasil dibersihkan).`;
        }
        if (res.warning) {
          msg += ` Catatan: ${res.warning}`;
          setSupabaseSyncMessage({ text: msg, type: "info" });
          onNotify?.(msg, "info");
        } else {
          setSupabaseSyncMessage({ text: msg, type: "success" });
          onNotify?.(msg, "success");
        }
        setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      } else {
        const errorMsg = res.error || "Gagal mengunggah akun ke Supabase.";
        setSupabaseSyncMessage({ text: errorMsg, type: "error" });
        onNotify?.(errorMsg, "warning");
        if (errorMsg.includes("user_accounts") && errorMsg.includes("belum dibuat")) {
          setIsSqlModalOpen(true);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Terjadi kesalahan.";
      setSupabaseSyncMessage({ text: errorMsg, type: "error" });
      onNotify?.(errorMsg, "warning");
    } finally {
      setIsSupabasePushing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!supabaseConfig.isEnabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      const msg = "Koneksi Supabase belum diatur atau dinonaktifkan. Silakan periksa konfigurasi URL & Anon Key di Pengaturan.";
      setSupabaseSyncMessage({ text: msg, type: "error" });
      onNotify?.(msg, "warning");
      return;
    }

    setIsSupabasePulling(true);
    setSupabaseSyncMessage(null);
    try {
      const res = await pullUserAccountsFromSupabase();
      if (res.success && res.accounts) {
        saveUserAccounts(res.accounts);
        onAccountsChange(res.accounts);
        const msg = `Berhasil mengunduh ${res.accounts.length} akun pengguna dari sheet/tabel 'user_accounts' di Supabase.`;
        setSupabaseSyncMessage({ text: msg, type: "success" });
        onNotify?.(msg, "success");
        setLastSavedTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      } else {
        const errorMsg = res.error || "Gagal mengambil data akun dari Supabase.";
        setSupabaseSyncMessage({ text: errorMsg, type: "error" });
        onNotify?.(errorMsg, "warning");
        if (errorMsg.includes("user_accounts") && errorMsg.includes("belum dibuat")) {
          setIsSqlModalOpen(true);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || "Terjadi kesalahan.";
      setSupabaseSyncMessage({ text: errorMsg, type: "error" });
      onNotify?.(errorMsg, "warning");
    } finally {
      setIsSupabasePulling(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(USER_ACCOUNTS_SQL_SCHEMA);
    setIsSqlCopied(true);
    onNotify?.("Skrip SQL tabel 'user_accounts' berhasil disalin!", "info");
    setTimeout(() => setIsSqlCopied(false), 2500);
  };

  return (
    <div id="user-accounts-database-manager" className="space-y-6 w-full min-w-0">
      {/* Header Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary/90 text-white rounded-2xl p-5 sm:p-6 lg:p-7 shadow-sm border border-slate-700/60 relative overflow-hidden w-full">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-1.5 text-left flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase backdrop-blur-xs border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="truncate">Sistem Manajemen Akun Terintegrasi</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
              Database Akun Pengguna & Hak Akses
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Kelola kredensial resmi, penugasan peran Administrator atau Karyawan, tautan profil suksesi, dan pengaturan status pengguna. Seluruh perubahan langsung <strong>disimpan secara otomatis</strong> ke database lokal dan dimuat pada setiap sesi login berikutnya.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Tambah Akun Baru</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Ekspor seluruh akun ke format JSON"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Ekspor JSON</span>
            </button>

            <label
              htmlFor={importFileInputId}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Impor akun dari file JSON"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Impor JSON</span>
              <input
                id={importFileInputId}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Metric Counters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-left min-w-0">
            <span className="text-[10px] font-bold text-slate-300 uppercase block truncate">Total Pengguna</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-2xl font-black text-white">{accounts.length}</span>
              <span className="text-[10px] text-slate-400 truncate">Akun Terdaftar</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-left min-w-0">
            <span className="text-[10px] font-bold text-teal-300 uppercase block truncate">Administrator Aktif</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-2xl font-black text-teal-300">{totalAdmins}</span>
              <span className="text-[10px] text-slate-400 truncate">Akses Penuh</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-left min-w-0">
            <span className="text-[10px] font-bold text-sky-300 uppercase block truncate">User / Karyawan</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-2xl font-black text-sky-300">{totalUsers}</span>
              <span className="text-[10px] text-slate-400 truncate">Talent / Viewer</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-left min-w-0">
            <span className="text-[10px] font-bold text-emerald-300 uppercase block truncate">Status Database</span>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-bold text-emerald-300 truncate">Tersimpan ({lastSavedTime})</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUPABASE DEDICATED SHEET: user_accounts SYNC PANEL */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-teal-600/30 relative overflow-hidden w-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1.5 text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Database className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="text-xs font-black tracking-wide uppercase text-teal-300">
                Sheet / Tabel Mandiri Supabase:
              </span>
              <code className="bg-teal-950/80 px-2 py-0.5 rounded text-teal-200 text-xs font-mono font-bold border border-teal-700/50">
                user_accounts
              </code>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider uppercase">
                100% Terpisah Dari succession_data
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Data akun dan hak akses pengguna disimpan di sheet/tabel tersendiri (<strong className="text-white">user_accounts</strong>) di database Supabase Cloud. Struktur tabel ini terisolasi sepenuhnya dari sheet <strong className="text-teal-200">succession_data</strong> agar pemeliharaan hak akses lebih rapi dan aman.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSupabasePushing || isSupabasePulling}
              onClick={handlePushToSupabase}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Unggah akun lokal ke tabel mandiri user_accounts di Supabase"
            >
              <CloudUpload className={`w-4 h-4 shrink-0 ${isSupabasePushing ? 'animate-bounce' : ''}`} />
              <span>{isSupabasePushing ? "Mengunggah..." : "Push Akun ke Supabase"}</span>
            </button>

            <button
              type="button"
              disabled={isSupabasePushing || isSupabasePulling}
              onClick={handlePullFromSupabase}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Tarik akun dari tabel mandiri user_accounts di Supabase"
            >
              <CloudDownload className={`w-4 h-4 shrink-0 ${isSupabasePulling ? 'animate-bounce' : ''}`} />
              <span>{isSupabasePulling ? "Menarik..." : "Tarik Akun dari Supabase"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSqlModalOpen(true)}
              className="bg-teal-950/80 hover:bg-teal-900 text-teal-200 border border-teal-700/60 font-bold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              title="Buka skrip DDL SQL untuk membuat sheet user_accounts"
            >
              <Code2 className="w-4 h-4 text-teal-300 shrink-0" />
              <span>Skrip SQL user_accounts</span>
            </button>
          </div>
        </div>

        {supabaseSyncMessage && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 border ${
            supabaseSyncMessage.type === "success" 
              ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200" 
              : supabaseSyncMessage.type === "error"
              ? "bg-rose-950/70 border-rose-500/50 text-rose-200"
              : "bg-sky-950/70 border-sky-500/50 text-sky-200"
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-left font-medium leading-relaxed">
              {supabaseSyncMessage.text}
            </div>
            {supabaseSyncMessage.type === "error" && supabaseSyncMessage.text.includes("user_accounts") && (
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-[10px] font-black cursor-pointer uppercase"
              >
                Lihat Skrip SQL
              </button>
            )}
            <button
              type="button"
              onClick={() => setSupabaseSyncMessage(null)}
              className="text-white/60 hover:text-white cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-surface-container-highest dark:border-slate-800 p-3.5 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full min-w-0">
        <div className="relative flex-1 min-w-0">
          <label htmlFor={searchInputId} className="sr-only">Cari Pengguna</label>
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pengguna, email, jabatan, atau divisi..."
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <label htmlFor={roleFilterId} className="text-[10px] font-bold text-slate-500 uppercase">Role:</label>
            <select
              id={roleFilterId}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Administrator</option>
              <option value="user">User / Karyawan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <label htmlFor={statusFilterId} className="text-[10px] font-bold text-slate-500 uppercase">Status:</label>
            <select
              id={statusFilterId}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all flex items-center gap-1 cursor-pointer"
            title="Kembalikan ke akun demo bawaan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-surface-container-highest dark:border-slate-800 shadow-xs overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-surface-container-highest dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Role & Hak Akses</th>
                <th className="py-3.5 px-4">Jabatan & Divisi</th>
                <th className="py-3.5 px-4">Kredensial Sandi</th>
                <th className="py-3.5 px-4">Tautan Talent</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest dark:divide-slate-800/60 text-xs">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Tidak ada akun ditemukan</p>
                    <p className="text-xs mt-0.5">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isCurrent = acc.id === currentUserId;
                  const isShownPassword = showPasswordMap[acc.id];
                  const linkedTalent = acc.linkedTalentId 
                    ? talents.find((t) => t.id === acc.linkedTalentId) 
                    : undefined;

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        acc.status === "inactive" ? "opacity-60 bg-slate-50/40 dark:bg-slate-900/40" : ""
                      }`}
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 shadow-2xs ${
                              acc.role === "admin"
                                ? "bg-teal-700 dark:bg-teal-600 text-white"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {acc.initials || generateInitials(acc.name)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {acc.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-black bg-primary/10 text-primary dark:text-teal-400 border border-primary/20 px-1.5 py-0.2 rounded-full uppercase">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="truncate">{acc.email}</span>
                              <button
                                type="button"
                                onClick={() => copyEmail(acc.email, acc.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                                title="Salin email"
                              >
                                {copiedEmailId === acc.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Mail className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {acc.role === "admin" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <Shield className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Users className="w-3 h-3 text-slate-500" />
                            User / Karyawan
                          </span>
                        )}
                      </td>

                      {/* Title & Department */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs truncate max-w-[200px]">
                            {acc.title || "-"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
                            <Building className="w-3 h-3 shrink-0" />
                            {acc.department || "Ajinomoto Indonesia"}
                          </span>
                        </div>
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {isShownPassword ? acc.password || "password123" : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(acc.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                            title={isShownPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                          >
                            {isShownPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Linked Talent Profile */}
                      <td className="py-3.5 px-4">
                        {linkedTalent ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold">
                            <Link2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{linkedTalent.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            Tanpa Tautan
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(acc)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            acc.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          }`}
                          title="Klik untuk ubah status akun"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${acc.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {acc.status === "active" ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(acc)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Akun"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(acc)}
                            disabled={isCurrent || (acc.role === "admin" && totalAdmins <= 1)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent || (acc.role === "admin" && totalAdmins <= 1)
                                ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                : "text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            }`}
                            title={
                              isCurrent
                                ? "Tidak dapat menghapus akun Anda sendiri yang sedang aktif"
                                : acc.role === "admin" && totalAdmins <= 1
                                ? "Tidak dapat menghapus admin satu-satunya"
                                : "Hapus Akun"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/40 px-4 py-3 border-t border-surface-container-highest dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Menampilkan <strong>{filteredAccounts.length}</strong> dari <strong>{accounts.length}</strong> akun pengguna
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            Storage Key: <code className="font-mono text-primary dark:text-teal-400">ajinomoto_user_accounts_db</code>
          </span>
        </div>
      </div>

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-surface-container-highest dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary/90 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
                  {editingAccount ? <Edit3 className="w-5 h-5 text-teal-300" /> : <UserPlus className="w-5 h-5 text-teal-300" />}
                </div>
                <div className="text-left">
                  <h4 className="font-display font-black text-base">
                    {editingAccount ? "Edit Akun Pengguna" : "Tambah Akun Pengguna Baru"}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {editingAccount ? "Perbarui informasi kredensial & otorisasi akses" : "Daftarkan akun resmi baru ke dalam database"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-left max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-medium">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Marcus Sterling, S.Psi., M.M."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Alamat Email Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="nama@ajinomoto.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormPassword(`ajinomoto${Math.floor(100 + Math.random() * 900)}`)}
                      className="text-[9px] font-black text-primary dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Acak Sandi
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Hak Akses / Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as "admin" | "user")}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="user">User / Karyawan (View Only / Talent IDP)</option>
                    <option value="admin">Administrator (Akses Penuh Suksesi)</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Status Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "active" | "inactive")}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="active">Aktif (Dapat Login)</option>
                    <option value="inactive">Non-Aktif (Login Dinonaktifkan)</option>
                  </select>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Jabatan Struktural
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Dept. Manager / HR Specialist"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Departemen / Divisi
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="Contoh: Food Ingredients-1 (A-MJK)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Linked Talent Profile */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Tautkan ke Profil Kandidat Talent (Opsional)
                  </label>
                  <select
                    value={formLinkedTalentId}
                    onChange={(e) => setFormLinkedTalentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">-- Tidak ditautkan ke profil manapun --</option>
                    {talents.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.title} - {t.division})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    Jika ditautkan, saat pengguna ini login, sistem akan otomatis membuka profil dan rencana IDP talent bersangkutan.
                  </span>
                </div>

                {/* Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                    Catatan Komite / Otorisasi
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Catatan tambahan hak akses atau otorisasi komite..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAccount ? "Simpan Perubahan Akun" : "Daftarkan Akun Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-surface-container-highest dark:border-slate-800 shadow-2xl p-6 text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display font-black text-lg text-slate-900 dark:text-slate-100">
                Konfirmasi Hapus Akun
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun pengguna <strong>{deleteCandidate.name}</strong> ({deleteCandidate.email})? Tindakan ini akan menghapus akun tersebut dari database lokal secara permanen.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Role:</span>
                <span className="font-bold uppercase">{deleteCandidate.role}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-semibold text-slate-500">Jabatan:</span>
                <span className="font-bold">{deleteCandidate.title}</span>
              </div>
            </div>

            {supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.anonKey && (
              <div className="flex items-center gap-2 p-2.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl text-[11px] text-teal-800 dark:text-teal-200">
                <Database className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <span>Akun ini juga akan <strong>langsung dihapus secara permanen dari tabel user_accounts di Supabase Cloud</strong>.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DEFAULT CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-surface-container-highest dark:border-slate-800 shadow-2xl p-6 text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display font-black text-lg text-slate-900 dark:text-slate-100">
                Kembalikan Akun Bawaan (Reset)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tindakan ini akan mengembalikan daftar akun pengguna ke akun bawaan sistem awal (Admin Marcus Sterling, Edwin Prasetyo, HR Assessor, dan Executive Viewer). Akun yang Anda buat secara manual akan digantikan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Pulihkan Bawaan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL DDL MODAL: USER_ACCOUNTS SHEET */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-surface-container-highest dark:border-slate-800 shadow-2xl p-6 text-left space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Skema SQL Sheet Mandiri:</span>
                    <code className="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded text-xs">user_accounts</code>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tabel ini <strong>100% terpisah</strong> dari tabel <code>succession_data</code> agar basis data kredensial terkelola secara mandiri.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Info */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Cara Menjalankan Skrip Ini di Supabase:</span>
              </div>
              <ol className="list-decimal list-inside text-[11px] space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                <li>Buka dashboard Supabase Anda di browser.</li>
                <li>Klik menu <strong>SQL Editor</strong> di sidebar sebelah kiri.</li>
                <li>Tempel (Paste) kode SQL di bawah ini, lalu klik tombol hijau <strong>Run</strong>.</li>
                <li>Tabel <code>user_accounts</code> akan langsung dibuat dan siap menerima sinkronisasi data akun!</li>
              </ol>
            </div>

            {/* Code Snippet Box */}
            <div className="relative flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3.5 py-1.5 rounded-t-xl text-[10px] font-mono border-b border-slate-800">
                <span>SQL Skema: user_accounts</span>
                <span className="text-teal-400 font-bold">PostgreSQL DDL</span>
              </div>
              <pre className="bg-slate-950 text-teal-300 font-mono text-[10px] p-4 rounded-b-xl overflow-y-auto max-h-[220px] select-all leading-relaxed border border-slate-800">
{USER_ACCOUNTS_SQL_SCHEMA}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={supabaseConfig.url ? `${supabaseConfig.url.replace('.supabase.co', '')}.supabase.com` : "https://supabase.com/dashboard"}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>Buka Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isSqlCopied ? (
                    <>
                      <CheckCheck className="w-4 h-4 text-white" />
                      <span>Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Skrip SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
