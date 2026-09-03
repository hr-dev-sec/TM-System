import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
}

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
