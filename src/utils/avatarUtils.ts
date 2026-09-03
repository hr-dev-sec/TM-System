export const FEMALE_AVATARS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&q=80&w=400"
];

export const MALE_AVATARS = [
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400"
];

export function detectGenderFromName(name: string): "Laki-laki" | "Perempuan" {
  if (!name) return "Laki-laki";
  const nameUpper = name.toUpperCase();
  const femaleKeywords = [
    "ERLINA", "ANNISA", "ALFINDEA", "FENNY", "YUNIASTUTI", "ELSA", "ANGGIA",
    "PUTRI", "RAMADHANI", "LUTFIA", "ANGGRAINI", "FININAWATI", "WAHYUDI",
    "SITI", "DEWI", "FITRI", "NURUL", "MARIA", "RETNO", "SRI", "WULAN",
    "DWI", "RINA", "NUR", "DIAN", "INDRA", "RAHMA", "TRI", "YULIA", "SHINTA",
    "MAYA", "DESI", "INTAN", "AGUSTINA", "DINI", "EKA", "CANDRA", "RATNA"
  ];
  
  const words = nameUpper.split(/[\s,.-]+/);
  for (const word of words) {
    if (femaleKeywords.includes(word)) {
      return "Perempuan";
    }
  }
  return "Laki-laki";
}

export function getSyncedAvatarUrl(name: string, gender?: "Laki-laki" | "Perempuan", currentAvatar?: string): string {
  const detectedGender = gender || detectGenderFromName(name);
  
  // If user uploaded custom base64 image, preserve it
  if (currentAvatar && currentAvatar.startsWith("data:image")) {
    return currentAvatar;
  }
  
  // Generate index based on name string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash);

  if (detectedGender === "Perempuan") {
    return FEMALE_AVATARS[index % FEMALE_AVATARS.length];
  } else {
    return MALE_AVATARS[index % MALE_AVATARS.length];
  }
}

/**
 * Compress image file to max dimension (default 256px) and return lightweight Base64 JPEG.
 * Prevents massive payloads (>2MB) from causing database statement timeouts.
 */
export async function compressImageFile(file: File, maxDim = 256, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar untuk kompresi"));
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
          resolve(event.target?.result as string);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

