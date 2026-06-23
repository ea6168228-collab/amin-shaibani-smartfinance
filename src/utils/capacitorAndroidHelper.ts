import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Checks if the application is running in a native mobile environment (Android/iOS).
 */
export function isNativeCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Native file sharing and saving for PDF documents.
 * @param base64OrDataUri The base64 raw string, or the complete data URI containing 'data:application/pdf;base64,...'
 * @param fileName The desired name for the PDF file (e.g., 'report.pdf').
 */
export async function saveAndSharePdf(base64OrDataUri: string, fileName: string): Promise<boolean> {
  try {
    if (!isNativeCapacitor()) {
      return false;
    }

    let base64Data = base64OrDataUri;
    if (base64OrDataUri.includes('base64,')) {
      base64Data = base64OrDataUri.split('base64,')[1];
    }

    // Clean filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\u0600-\u06FF\.]/g, '_');

    // Write file to application Cache folder (accessible by Share plugin)
    const result = await Filesystem.writeFile({
      path: cleanFileName,
      data: base64Data,
      directory: Directory.Cache
    });

    // Share natively via Android Share intent
    await Share.share({
      title: 'حفظ ومشاركة ملف PDF',
      text: cleanFileName,
      url: result.uri,
      dialogTitle: 'مشاركة أو حفظ ملف الكشف عبر:'
    });

    return true;
  } catch (error) {
    console.error('Error in saveAndSharePdf native flow:', error);
    return false;
  }
}

/**
 * Native backup file sharing (saves JSON string as a sharesheet file).
 * @param jsonString The raw custom backup JSON string.
 * @param fileName The desired backup filename.
 */
export async function saveAndShareBackup(jsonString: string, fileName: string): Promise<boolean> {
  try {
    if (!isNativeCapacitor()) {
      return false;
    }

    // Convert standard JSON string to Base64 manually
    const textEncoder = new TextEncoder();
    const bytes = textEncoder.encode(jsonString);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    // Clean filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\u0600-\u06FF\.]/g, '_');

    // Write file to Cache
    const result = await Filesystem.writeFile({
      path: cleanFileName,
      data: base64Data,
      directory: Directory.Cache
    });

    // Share native file
    await Share.share({
      title: 'تصدير نسخة احتياطية',
      text: cleanFileName,
      url: result.uri,
      dialogTitle: 'مشاركة أو حفظ النسخة الاحتياطية في جهازك:'
    });

    return true;
  } catch (error) {
    console.error('Error in saveAndShareBackup native flow:', error);
    return false;
  }
}
