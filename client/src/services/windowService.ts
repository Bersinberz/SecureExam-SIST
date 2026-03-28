interface ElectronAPI {
  // Security / Kiosk
  enterKiosk: () => Promise<{ success: boolean }>;
  exitKiosk: () => Promise<{ success: boolean }>;
  isKioskActive: () => Promise<boolean>;
  onSecurityViolation: (callback: (data: SecurityViolation) => void) => () => void;

  // App controls
  getAppVersion: () => Promise<string>;
  closeApp: () => Promise<void>;
  requestClose: () => Promise<{ confirmed: boolean }>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  isElectron: boolean;
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };

  // Close request event
  onCloseRequested: (callback: () => void) => () => void;
}

export interface SecurityViolation {
  type: 'blocked-shortcut' | 'focus-lost' | 'screenshot-attempt';
  shortcut?: string;
  timestamp: number;
}

declare global {
  interface Window {
    secureExam: ElectronAPI;
  }
}

class WindowService {
  // ── Detection ──────────────────────────────────────────────
  isElectron(): boolean {
    return !!(window.secureExam && window.secureExam.isElectron);
  }

  // ── Kiosk Mode ─────────────────────────────────────────────
  async enterKiosk(): Promise<boolean> {
    if (this.isElectron()) {
      const result = await window.secureExam.enterKiosk();
      return result.success;
    }
    // Web fallback — request fullscreen
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  async exitKiosk(): Promise<boolean> {
    if (this.isElectron()) {
      const result = await window.secureExam.exitKiosk();
      return result.success;
    }
    // Web fallback — exit fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      return true;
    } catch {
      return false;
    }
  }

  async isKioskActive(): Promise<boolean> {
    if (this.isElectron()) {
      return await window.secureExam.isKioskActive();
    }
    return !!document.fullscreenElement;
  }

  // ── Security Events ────────────────────────────────────────
  onSecurityViolation(callback: (data: SecurityViolation) => void): () => void {
    if (this.isElectron()) {
      return window.secureExam.onSecurityViolation(callback);
    }
    return () => {}; // noop for web
  }

  // ── App Controls ───────────────────────────────────────────
  async requestClose(): Promise<boolean> {
    if (this.isElectron()) {
      const result = await window.secureExam.requestClose();
      return result.confirmed;
    }
    return true; // Web version always allows close
  }

  onCloseRequested(callback: () => void): () => void {
    if (this.isElectron()) {
      return window.secureExam.onCloseRequested(callback);
    }
    return () => {};
  }

  async closeApp(): Promise<void> {
    if (this.isElectron()) {
      await window.secureExam.closeApp();
    }
  }

  async getAppVersion(): Promise<string> {
    if (this.isElectron()) {
      return await window.secureExam.getAppVersion();
    }
    return 'Web Version';
  }

  minimizeWindow(): void {
    if (this.isElectron()) {
      window.secureExam.minimizeWindow();
    }
  }

  closeWindow(): void {
    if (this.isElectron()) {
      window.secureExam.closeWindow();
    }
  }

  getPlatform(): string {
    if (this.isElectron()) {
      return window.secureExam.platform;
    }
    return 'web';
  }

  getVersions(): any {
    if (this.isElectron()) {
      return window.secureExam.versions;
    }
    return {};
  }
}

export default new WindowService();