import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UserAccount } from "./types";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
}

export const USER_ACCOUNTS_SQL_SCHEMA = `-- ==========================================================
-- SHEET / TABEL MANDIRI: USER_ACCOUNTS (TERPISAH DARI SUKSESI)
-- ==========================================================

-- 1. Buat tabel user_accounts jika belum ada
create table if not exists user_accounts (
  id text primary key,
  name text not null,
  email text not null unique,
  password text default 'password123',
  role text not null default 'user',
  title text default '',
  department text default '',
  status text not null default 'active',
  linked_talent_id text,
  avatar text,
  initials text,
  notes text,
  last_login timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sinkronisasi kolom (jika tabel sudah pernah dibuat sebelumnya tanpa kolom avatar/lainnya)
alter table user_accounts add column if not exists password text default 'password123';
alter table user_accounts add column if not exists role text default 'user';
alter table user_accounts add column if not exists title text default '';
alter table user_accounts add column if not exists department text default '';
alter table user_accounts add column if not exists status text default 'active';
alter table user_accounts add column if not exists linked_talent_id text;
alter table user_accounts add column if not exists avatar text;
alter table user_accounts add column if not exists initials text;
alter table user_accounts add column if not exists notes text;
alter table user_accounts add column if not exists last_login timestamp with time zone;
alter table user_accounts add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- 3. Muat ulang cache skema PostgREST Supabase
notify pgrst, 'reload schema';

-- 4. Aktifkan Row Level Security (RLS)
alter table user_accounts enable row level security;

-- 5. Kebijakan akses baca dan tulis (publik/komite)
drop policy if exists "Allow public read and write on user_accounts" on user_accounts;
create policy "Allow public read and write on user_accounts" 
on user_accounts 
for all 
using (true) 
with check (true);

-- 6. Berikan hak akses penuh ke role anon, authenticated, dan service_role
grant all on user_accounts to anon, authenticated, service_role;`;

export const SUCCESSION_DATA_SQL_SCHEMA = `-- ==========================================================
-- SHEET / TABEL MANDIRI: SUCCESSION_DATA (DATA TALENTA SUKSESI)
-- ==========================================================

-- 1. Buat tabel penampung data suksesi
create table if not exists succession_data (
  id text primary key,
  talents jsonb not null,
  retiring_positions jsonb not null,
  evaluation_years jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Aktifkan Row Level Security (RLS)
alter table succession_data enable row level security;

-- 3. Izinkan akses baca dan tulis publik
drop policy if exists "Allow public read and write" on succession_data;
create policy "Allow public read and write" 
on succession_data 
for all 
using (true) 
with check (true);

-- 4. Berikan izin akses penuh ke anon dan authenticated
grant all on succession_data to anon, authenticated, service_role;`;

const DEFAULT_URL = (import.meta as any).env.VITE_SUPABASE_URL || "https://lpdofcdffazatvczzzrj.supabase.co";
const DEFAULT_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZG9mY2RmZmF6YXR2Y3p6enJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNDM0MjMsImV4cCI6MjA5OTkxOTQyM30.kmaFHE_SLs2603w0sKAPIe-LGB6DAjg6P-9jaI72Y3A";

export function getSupabaseConfig(): SupabaseConfig {
  const saved = localStorage.getItem("supabase_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Auto-migrate if stored key is the old non-JWT format starting with "sb_"
      const finalAnonKey = (!parsed.anonKey || parsed.anonKey.startsWith("sb_")) 
        ? DEFAULT_ANON_KEY 
        : parsed.anonKey;
      
      return {
        url: parsed.url || DEFAULT_URL,
        anonKey: finalAnonKey,
        isEnabled: parsed.isEnabled !== false && !!(parsed.url || DEFAULT_URL) && !!finalAnonKey
      };
    } catch (e) {
      // ignore
    }
  }
  return {
    url: DEFAULT_URL,
    anonKey: DEFAULT_ANON_KEY,
    isEnabled: !!DEFAULT_URL && !!DEFAULT_ANON_KEY
  };
}

export function saveSupabaseConfig(config: Partial<SupabaseConfig>) {
  const current = getSupabaseConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("supabase_config", JSON.stringify(updated));
}

let supabaseInstance: SupabaseClient | null = null;
let lastUrl = "";
let lastKey = "";

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  // Clean URL: strip trailing slashes or /rest/v1/
  let cleanUrl = config.url.trim();
  if (cleanUrl.endsWith("/")) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  if (cleanUrl.endsWith("/rest/v1")) {
    cleanUrl = cleanUrl.slice(0, -8);
  }
  if (cleanUrl.endsWith("/")) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  const key = config.anonKey.trim();

  if (supabaseInstance && lastUrl === cleanUrl && lastKey === key) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(cleanUrl, key, {
      auth: {
        persistSession: false
      }
    });
    lastUrl = cleanUrl;
    lastKey = key;
    return supabaseInstance;
  } catch (err) {
    console.error("Error creating Supabase client:", err);
    return null;
  }
}

export async function pushToSupabase(
  talents: any[],
  retiringPositions: any[],
  evaluationYears: string[]
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Supabase client not initialized. Check URL and Anon Key." };
  }

  try {
    // Compress oversized base64 images in talents array before sending payload to prevent PostgreSQL statement timeout
    const sanitizedTalents = await sanitizeTalentsForSync(talents);

    const { error } = await client
      .from("succession_data")
      .upsert({
        id: "default",
        talents: sanitizedTalents,
        retiring_positions: retiringPositions || [],
        evaluation_years: evaluationYears || [],
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) {
      if (error.message.includes("statement timeout")) {
        return { 
          success: false, 
          error: "Query timeout (statement timeout) pada server Supabase. Mohon pastikan tabel 'succession_data' sudah memiliki izin RLS dan coba lakukan Push ulang." 
        };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}

async function compressDataUrl(dataUrl: string, maxDim = 256, quality = 0.75): Promise<string> {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/") || dataUrl.length < 30000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl);
    }
  });
}

async function sanitizeTalentsForSync(talents: any[]): Promise<any[]> {
  if (!Array.isArray(talents)) return [];
  return Promise.all(
    talents.map(async (t) => {
      let avatar = t.avatar;
      if (avatar && typeof avatar === "string" && avatar.startsWith("data:image/")) {
        if (avatar.length > 20000) {
          avatar = await compressDataUrl(avatar, 200, 0.7);
        }
        // Safety check: if compression failed or string is still unreasonably huge (>80KB), reset avatar to dicebear URL
        if (avatar && avatar.length > 80000) {
          avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name || "User")}`;
        }
      }
      return {
        ...t,
        avatar
      };
    })
  );
}

export async function pullFromSupabase(): Promise<{ 
  success: boolean; 
  data?: { talents: any[]; retiring_positions: any[]; evaluation_years: string[] }; 
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Supabase client not initialized. Check URL and Anon Key." };
  }

  try {
    const { data, error } = await client
      .from("succession_data")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "No data found in Supabase yet. You can 'Push' your current local data to initialize it." };
    }

    return { 
      success: true, 
      data: {
        talents: data.talents || [],
        retiring_positions: data.retiring_positions || [],
        evaluation_years: data.evaluation_years || []
      } 
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}

export function formatSupabaseFriendlyError(err: any): string {
  const msg = err?.message || String(err || "");
  if (msg.includes("Failed to fetch") || err?.name === "TypeError" || msg.includes("NetworkError")) {
    return (
      "Koneksi ke Supabase terputus (Failed to fetch). " +
      "Periksa: 1) Pastikan URL Project & Anon Key di Pengaturan sudah sesuai dengan dashboard Supabase Anda. " +
      "2) Pastikan status proyek di Supabase Cloud dalam status ACTIVE (bukan Paused). " +
      "3) Periksa apakah ekstensi browser (AdBlocker, Brave Shields, dsb.) memblokir domain supabase.co. " +
      "4) Periksa koneksi internet Anda lalu coba kembali."
    );
  }
  return msg;
}

/**
 * Mengunggah data akun pengguna ke sheet/tabel tersendiri: "user_accounts" di Supabase.
 * Menggunakan upsert berdasarkan id unik masing-masing akun dan menyelaraskan data (menghapus akun usang di cloud).
 */
export async function pushUserAccountsToSupabase(
  accounts: UserAccount[]
): Promise<{ success: boolean; error?: string; count?: number; warning?: string; deletedRemoteCount?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Koneksi Supabase belum diatur. Periksa Project URL dan Anon Key di Pengaturan." };
  }

  try {
    const formattedRows = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      password: a.password || "password123",
      role: a.role,
      title: a.title || "",
      department: a.department || "",
      status: a.status || "active",
      linked_talent_id: a.linkedTalentId || null,
      avatar: a.avatar || null,
      initials: a.initials || null,
      notes: a.notes || null,
      last_login: a.lastLogin || null,
      created_at: a.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    let currentRows = formattedRows.map((r) => ({ ...r }));
    const omittedColumns: string[] = [];

    // Attempt upsert with automatic column stripping if Supabase schema cache lacks optional columns (e.g. avatar)
    let upsertSucceeded = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { error } = await client
        .from("user_accounts")
        .upsert(currentRows, { onConflict: "id" });

      if (!error) {
        upsertSucceeded = true;
        break;
      }

      // Check if error is due to a missing column in Supabase schema cache
      const missingColMatch =
        error.message.match(/Could not find the '([^']+)' column of 'user_accounts'/i) ||
        error.message.match(/column "([^"]+)" of relation "user_accounts" does not exist/i);

      if (missingColMatch && missingColMatch[1]) {
        const missingCol = missingColMatch[1];
        if (!omittedColumns.includes(missingCol)) {
          omittedColumns.push(missingCol);
        }
        currentRows = currentRows.map((row) => {
          const copy = { ...row };
          delete (copy as Record<string, unknown>)[missingCol];
          return copy;
        });
        continue;
      }

      if (
        error.message.includes('relation "user_accounts" does not exist') || 
        error.message.includes("does not exist")
      ) {
        return {
          success: false,
          error: "Tabel/sheet 'user_accounts' belum dibuat di database Supabase Anda. Jalankan skrip SQL skema tabel 'user_accounts' di SQL Editor Supabase."
        };
      }

      return { success: false, error: formatSupabaseFriendlyError(error) };
    }

    if (!upsertSucceeded) {
      return { success: false, error: "Gagal menyelaraskan struktur kolom tabel user_accounts di Supabase." };
    }

    // SELARASKAN DATA: Hapus data di database cloud Supabase yang sudah dihapus dari akun lokal
    let deletedRemoteCount = 0;
    try {
      const localIds = accounts.map((a) => a.id);
      const { data: remoteRows, error: fetchRemoteErr } = await client
        .from("user_accounts")
        .select("id");

      if (!fetchRemoteErr && remoteRows && remoteRows.length > 0) {
        const idsToDelete = remoteRows
          .map((r: any) => r.id)
          .filter((remoteId: string) => !localIds.includes(remoteId));

        if (idsToDelete.length > 0) {
          const { error: delErr } = await client
            .from("user_accounts")
            .delete()
            .in("id", idsToDelete);

          if (!delErr) {
            deletedRemoteCount = idsToDelete.length;
          }
        }
      }
    } catch (cleanupErr) {
      console.warn("Gagal menyelaraskan penghapusan remote:", cleanupErr);
    }

    return {
      success: true,
      count: currentRows.length,
      deletedRemoteCount,
      warning: omittedColumns.length > 0
        ? `Kolom [${omittedColumns.join(", ")}] dilewati sementara karena belum ada di tabel Supabase. Jalankan skrip SQL terbaru di modal untuk sinkronisasi penuh.`
        : undefined
    };
  } catch (err: any) {
    return { success: false, error: formatSupabaseFriendlyError(err) };
  }
}

/**
 * Menghapus akun tertentu langsung dari sheet/tabel "user_accounts" di Supabase Cloud.
 */
export async function deleteUserAccountFromSupabase(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Koneksi Supabase belum diatur. Periksa Project URL dan Anon Key di Pengaturan." };
  }

  try {
    const { error } = await client
      .from("user_accounts")
      .delete()
      .eq("id", accountId);

    if (error) {
      return { success: false, error: formatSupabaseFriendlyError(error) };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseFriendlyError(err) };
  }
}

/**
 * Menarik seluruh data akun pengguna dari sheet/tabel tersendiri: "user_accounts" di Supabase.
 */
export async function pullUserAccountsFromSupabase(): Promise<{
  success: boolean;
  accounts?: UserAccount[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Koneksi Supabase belum diatur. Periksa Project URL dan Anon Key di Pengaturan." };
  }

  try {
    // Coba dengan pengurutan created_at jika ada kolomnya, fallback ke select sederhana
    let result = await client
      .from("user_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (result.error && (result.error.message.includes("created_at") || result.error.message.includes("does not exist"))) {
      result = await client.from("user_accounts").select("*");
    }

    const { data, error } = result;

    if (error) {
      if (
        error.message.includes('relation "user_accounts" does not exist') || 
        error.message.includes("does not exist")
      ) {
        return {
          success: false,
          error: "Tabel/sheet 'user_accounts' belum dibuat di database Supabase Anda. Jalankan skrip SQL skema tabel 'user_accounts' di SQL Editor Supabase."
        };
      }
      return { success: false, error: formatSupabaseFriendlyError(error) };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Belum ada data di tabel 'user_accounts' Supabase. Anda dapat melakukan 'Push Akun' dari data lokal terlebih dahulu untuk mengisi data awal."
      };
    }

    const accounts: UserAccount[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password || "password123",
      role: row.role === "admin" ? "admin" : "user",
      title: row.title || "",
      department: row.department || "",
      status: row.status === "inactive" ? "inactive" : "active",
      linkedTalentId: row.linked_talent_id || undefined,
      avatar: row.avatar || undefined,
      initials: row.initials || undefined,
      notes: row.notes || undefined,
      lastLogin: row.last_login || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    }));

    return { success: true, accounts };
  } catch (err: any) {
    return { success: false, error: formatSupabaseFriendlyError(err) };
  }
}
