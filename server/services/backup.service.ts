import { SystemBackupPayload } from '../../src/types';
import { ENV } from '../utils/env';

export class BackupService {
  static async signBackup(payload: SystemBackupPayload): Promise<string> {
    const dataStr = JSON.stringify(payload.data);
    
    // Create simple SHA-like signature using BACKUP_TOKEN_SECRET for security verification
    let hash = 0;
    const combinedStr = `${dataStr}.${ENV.BACKUP_TOKEN_SECRET}`;
    for (let i = 0; i < combinedStr.length; i++) {
      hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
      hash |= 0;
    }
    const signature = Math.abs(hash).toString(16);

    return JSON.stringify({
      ...payload,
      signature
    });
  }

  static async verifyAndRestoreBackup(backupJsonStr: string): Promise<SystemBackupPayload | null> {
    try {
      const parsed = JSON.parse(backupJsonStr);
      if (parsed.version !== '10.5') return null;
      if (!parsed.data || !parsed.signature) return null;

      const dataStr = JSON.stringify(parsed.data);
      let hash = 0;
      const combinedStr = `${dataStr}.${ENV.BACKUP_TOKEN_SECRET}`;
      for (let i = 0; i < combinedStr.length; i++) {
        hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
        hash |= 0;
      }
      const expectedSignature = Math.abs(hash).toString(16);

      if (parsed.signature !== expectedSignature) {
        console.error("🚨 Backup verification failed: Signature mismatch!");
        return null;
      }

      return parsed as SystemBackupPayload;
    } catch {
      return null;
    }
  }
}
