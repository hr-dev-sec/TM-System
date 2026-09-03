// Utility kriptografi client-side menggunakan native Web Crypto API
// Menyediakan enkripsi AES-GCM 256-bit berbasis PBKDF2 Key Derivation (100.000 iterasi)

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

function bufferToBase64(buf: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buf));
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    stringToBuffer(passcode),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Mengenkripsi teks biasa dengan AES-GCM 256-bit menggunakan kunci yang diderivasi dari sandi
 */
export async function encryptText(plainText: string, passcode: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passcode, salt);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      stringToBuffer(plainText)
    );

    return {
      ciphertext: bufferToBase64(encrypted),
      salt: bufferToBase64(salt.buffer),
      iv: bufferToBase64(iv.buffer)
    };
  } catch (err) {
    console.error("Encryption error:", err);
    throw new Error("Gagal mengenkripsi data.");
  }
}

/**
 * Mendekripsi teks tersandi AES-GCM dengan kata sandi yang sesuai
 */
export async function decryptText(ciphertext: string, passcode: string, salt: string, iv: string): Promise<string> {
  try {
    const saltBuf = base64ToBuffer(salt);
    const ivBuf = base64ToBuffer(iv);
    const cipherBuf = base64ToBuffer(ciphertext);
    
    const key = await deriveKey(passcode, saltBuf);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuf
      },
      key,
      cipherBuf
    );

    return bufferToString(decrypted);
  } catch (err) {
    console.error("Decryption error:", err);
    throw new Error("Sandi salah atau data terkorupsi.");
  }
}

/**
 * Menghitung SHA-256 hash untuk verifikasi integritas data
 */
export async function calculateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
