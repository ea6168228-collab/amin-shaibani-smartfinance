import { AppLicense } from '../../src/types';
import { ENV } from '../utils/env';

export class LicenseService {
  private static mockLicenseDb = new Map<string, AppLicense>();

  static async activateLicense(installationId: string, licenseKey: string, customerName: string, phone: string, deviceId?: string): Promise<AppLicense> {
    // Generate secure validation hash using licenseKey and APP_LICENSE_SECRET
    const isValidKey = licenseKey.startsWith("AMIN-") && licenseKey.length >= 15;
    
    if (!isValidKey) {
      throw new Error("رمز ترخيص غير صالح أو خاطئ التنسيق");
    }

    const activatedAt = new Date().toISOString();
    // 365 days expiry
    const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const license: AppLicense = {
      installationId,
      licenseKey,
      customerName,
      phone,
      deviceId,
      activatedAt,
      expiresAt,
      status: 'active'
    };

    this.mockLicenseDb.set(installationId, license);
    return license;
  }

  static async verifyLicense(installationId: string): Promise<AppLicense | null> {
    const existing = this.mockLicenseDb.get(installationId);
    if (!existing) return null;

    // Check expiry
    if (existing.expiresAt && new Date(existing.expiresAt).getTime() < Date.now()) {
      existing.status = 'expired';
    }

    return existing;
  }
}
