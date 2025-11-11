interface ElectronAPI {
  openExamWindow: () => void;
  openStaffWindow: () => void;
  openAdminWindow: () => void;
  minimizeWindow: () => void;
  closeWindow: () => void;
  closeApp: () => void;
  getAppVersion: () => Promise<string>;
  showSaveDialog: (options: any) => Promise<any>;
  isElectron: boolean;
  platform: string;
  versions: any;
}

declare global {
  interface Window {
    secureExam: ElectronAPI;
  }
}

class WindowService {
  isElectron(): boolean {
    return !!(window.secureExam && window.secureExam.isElectron);
  }

  openExamWindow(): void {
    if (this.isElectron()) {
      window.secureExam.openExamWindow();
    } else {
      window.open('/#/exam', '_blank', 'noopener,noreferrer');
    }
  }

  openStaffWindow(): void {
    if (this.isElectron()) {
      window.secureExam.openStaffWindow();
    } else {
      window.open('/#/staff', '_blank', 'noopener,noreferrer');
    }
  }

  openAdminWindow(): void {
    if (this.isElectron()) {
      window.secureExam.openAdminWindow();
    } else {
      window.open('/#/admin', '_blank', 'noopener,noreferrer');
    }
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

  closeApp(): void {
    if (this.isElectron()) {
      window.secureExam.closeApp();
    }
  }

  async getAppVersion(): Promise<string> {
    if (this.isElectron()) {
      return await window.secureExam.getAppVersion();
    }
    return 'Web Version';
  }

  async showSaveDialog(options: any): Promise<any> {
    if (this.isElectron()) {
      return await window.secureExam.showSaveDialog(options);
    }
    // Fallback for web version
    return { canceled: true, filePath: null };
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