// Packaging & Distribution Service
// Cross-platform builds, installers, auto-updates, license & telemetry

export type Platform = 'windows' | 'macos' | 'linux';
export type Architecture = 'x64' | 'arm64' | 'ia32' | 'universal';
export type PackageFormat = 'exe' | 'msi' | 'dmg' | 'pkg' | 'mas' | 'appimage' | 'deb' | 'rpm' | 'snap' | 'flatpak' | 'zip' | 'tar.gz';
export type BuildStatus = 'pending' | 'building' | 'success' | 'failed' | 'cancelled';

export interface PlatformConfig {
  platform: Platform;
  name: string;
  icon: string;
  architectures: Architecture[];
  formats: PackageFormat[];
  color: string;
}

export interface BuildTarget {
  id: string;
  platform: Platform;
  arch: Architecture;
  format: PackageFormat;
  enabled: boolean;
}

export interface BuildConfiguration {
  id: string;
  name: string;
  version: string;
  description: string;
  targets: BuildTarget[];
  signing: SigningConfig;
  notarization: NotarizationConfig;
  autoUpdate: AutoUpdateConfig;
  license: LicenseConfig;
  telemetry: TelemetryConfig;
  metadata: AppMetadata;
  buildOptions: BuildOptions;
}

export interface SigningConfig {
  enabled: boolean;
  windows: {
    certificateFile?: string;
    certificatePassword?: string;
    certificateSubjectName?: string;
    timestampServer?: string;
  };
  macos: {
    identity?: string;
    entitlements?: string;
    entitlementsInherit?: string;
    hardenedRuntime: boolean;
    gatekeeperAssess: boolean;
  };
  linux: {
    gpgKey?: string;
  };
}

export interface NotarizationConfig {
  enabled: boolean;
  appleId?: string;
  appleIdPassword?: string;
  teamId?: string;
  ascProvider?: string;
}

export interface AutoUpdateConfig {
  enabled: boolean;
  provider: 'github' | 's3' | 'generic' | 'custom';
  url?: string;
  channel: 'stable' | 'beta' | 'alpha' | 'dev';
  allowDowngrade: boolean;
  allowPrerelease: boolean;
  checkInterval: number; // minutes
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
}

export interface LicenseConfig {
  type: 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'BSD-3-Clause' | 'proprietary' | 'custom';
  customText?: string;
  eula?: string;
  eulaRequired: boolean;
  trialDays?: number;
  licenseKey?: {
    enabled: boolean;
    validationUrl?: string;
    offlineValidation: boolean;
  };
}

export interface TelemetryConfig {
  enabled: boolean;
  anonymousUsage: boolean;
  crashReports: boolean;
  performanceMetrics: boolean;
  featureUsage: boolean;
  endpoint?: string;
  sampleRate: number; // 0-100
  optOutByDefault: boolean;
  gdprCompliant: boolean;
  dataRetentionDays: number;
}

export interface AppMetadata {
  name: string;
  productName: string;
  appId: string;
  copyright: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  category?: string;
  keywords?: string[];
  icon?: string;
  splash?: string;
}

export interface BuildOptions {
  asar: boolean;
  asarUnpack?: string[];
  compression: 'store' | 'normal' | 'maximum';
  removePackageScripts: boolean;
  nodeGypRebuild: boolean;
  npmRebuild: boolean;
  buildDependenciesFromSource: boolean;
  electronVersion?: string;
  extraResources?: string[];
  extraFiles?: string[];
  fileAssociations?: FileAssociation[];
  protocols?: Protocol[];
}

export interface FileAssociation {
  ext: string[];
  name: string;
  description?: string;
  icon?: string;
  mimeType?: string;
  role?: 'Editor' | 'Viewer' | 'Shell' | 'None';
}

export interface Protocol {
  name: string;
  schemes: string[];
  role?: 'Editor' | 'Viewer' | 'Shell' | 'None';
}

export interface Build {
  id: string;
  configId: string;
  target: BuildTarget;
  status: BuildStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  logs: BuildLog[];
  artifacts: BuildArtifact[];
  error?: string;
}

export interface BuildLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: string;
}

export interface BuildArtifact {
  id: string;
  name: string;
  path: string;
  size: number;
  format: PackageFormat;
  platform: Platform;
  arch: Architecture;
  checksum?: {
    sha256: string;
    sha512?: string;
  };
  signed: boolean;
  notarized: boolean;
  downloadUrl?: string;
}

export interface UpdateInfo {
  version: string;
  releaseDate: Date;
  releaseNotes: string;
  mandatory: boolean;
  downloadUrl: string;
  size: number;
  checksum: string;
  signature?: string;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  currentVersion: string;
  latestVersion?: string;
  updateInfo?: UpdateInfo;
  error?: string;
}

type EventCallback = (event: PackagingEvent) => void;

export interface PackagingEvent {
  type: 'buildStart' | 'buildProgress' | 'buildComplete' | 'buildError' | 'updateAvailable' | 'updateDownloaded' | 'updateError';
  data: any;
}

// Platform configurations
const PLATFORMS: Record<Platform, PlatformConfig> = {
  windows: {
    platform: 'windows',
    name: 'Windows',
    icon: '🪟',
    architectures: ['x64', 'arm64', 'ia32'],
    formats: ['exe', 'msi', 'zip'],
    color: '#0078d4',
  },
  macos: {
    platform: 'macos',
    name: 'macOS',
    icon: '🍎',
    architectures: ['x64', 'arm64', 'universal'],
    formats: ['dmg', 'pkg', 'mas', 'zip'],
    color: '#000000',
  },
  linux: {
    platform: 'linux',
    name: 'Linux',
    icon: '🐧',
    architectures: ['x64', 'arm64'],
    formats: ['appimage', 'deb', 'rpm', 'snap', 'flatpak', 'tar.gz'],
    color: '#fcc624',
  },
};

// License templates
const LICENSE_TEMPLATES: Record<string, string> = {
  'MIT': `MIT License

Copyright (c) [year] [author]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,

  'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,

  'GPL-3.0': `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.`,

  'BSD-3-Clause': `BSD 3-Clause License

Copyright (c) [year], [author]
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,

  'proprietary': `PROPRIETARY SOFTWARE LICENSE AGREEMENT

This software and associated documentation files (the "Software") are 
proprietary and confidential. Unauthorized copying, modification, distribution,
or use of this Software, via any medium, is strictly prohibited.

The Software is provided under license and may only be used in accordance
with the terms of that license. Contact the vendor for licensing terms.

Copyright (c) [year] [author]. All rights reserved.`,
};

class PackagingService {
  private configurations: Map<string, BuildConfiguration> = new Map();
  private builds: Map<string, Build> = new Map();
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private updateStatus: UpdateStatus = {
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    currentVersion: '1.0.0',
  };

  constructor() {
    this.loadDefaultConfiguration();
  }

  private loadDefaultConfiguration(): void {
    const defaultConfig: BuildConfiguration = {
      id: 'default',
      name: 'Default Build',
      version: '1.0.0',
      description: 'Cross-platform application build',
      targets: this.generateDefaultTargets(),
      signing: {
        enabled: false,
        windows: { timestampServer: 'http://timestamp.digicert.com' },
        macos: { hardenedRuntime: true, gatekeeperAssess: true },
        linux: {},
      },
      notarization: { enabled: false },
      autoUpdate: {
        enabled: true,
        provider: 'github',
        channel: 'stable',
        allowDowngrade: false,
        allowPrerelease: false,
        checkInterval: 60,
        autoDownload: true,
        autoInstallOnAppQuit: true,
      },
      license: {
        type: 'MIT',
        eulaRequired: false,
      },
      telemetry: {
        enabled: false,
        anonymousUsage: true,
        crashReports: true,
        performanceMetrics: false,
        featureUsage: false,
        sampleRate: 100,
        optOutByDefault: true,
        gdprCompliant: true,
        dataRetentionDays: 90,
      },
      metadata: {
        name: 'my-app',
        productName: 'My Application',
        appId: 'com.example.myapp',
        copyright: `Copyright © ${new Date().getFullYear()}`,
        author: { name: 'Developer' },
      },
      buildOptions: {
        asar: true,
        compression: 'normal',
        removePackageScripts: true,
        nodeGypRebuild: false,
        npmRebuild: true,
        buildDependenciesFromSource: false,
      },
    };

    this.configurations.set(defaultConfig.id, defaultConfig);
  }

  private generateDefaultTargets(): BuildTarget[] {
    const targets: BuildTarget[] = [];
    let id = 0;

    // Windows targets
    targets.push(
      { id: `target-${id++}`, platform: 'windows', arch: 'x64', format: 'exe', enabled: true },
      { id: `target-${id++}`, platform: 'windows', arch: 'x64', format: 'msi', enabled: false },
      { id: `target-${id++}`, platform: 'windows', arch: 'arm64', format: 'exe', enabled: false },
    );

    // macOS targets
    targets.push(
      { id: `target-${id++}`, platform: 'macos', arch: 'x64', format: 'dmg', enabled: true },
      { id: `target-${id++}`, platform: 'macos', arch: 'arm64', format: 'dmg', enabled: true },
      { id: `target-${id++}`, platform: 'macos', arch: 'universal', format: 'dmg', enabled: false },
      { id: `target-${id++}`, platform: 'macos', arch: 'x64', format: 'pkg', enabled: false },
      { id: `target-${id++}`, platform: 'macos', arch: 'universal', format: 'mas', enabled: false },
    );

    // Linux targets
    targets.push(
      { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'appimage', enabled: true },
      { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'deb', enabled: true },
      { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'rpm', enabled: false },
      { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'snap', enabled: false },
      { id: `target-${id++}`, platform: 'linux', arch: 'x64', format: 'flatpak', enabled: false },
      { id: `target-${id++}`, platform: 'linux', arch: 'arm64', format: 'appimage', enabled: false },
    );

    return targets;
  }

  // Platform info
  getPlatforms(): typeof PLATFORMS {
    return PLATFORMS;
  }

  getPlatformConfig(platform: Platform): PlatformConfig {
    return PLATFORMS[platform];
  }

  // License templates
  getLicenseTemplate(type: string): string {
    return LICENSE_TEMPLATES[type] || '';
  }

  getLicenseTypes(): string[] {
    return Object.keys(LICENSE_TEMPLATES);
  }

  // Configuration management
  getConfiguration(id: string): BuildConfiguration | undefined {
    return this.configurations.get(id);
  }

  getDefaultConfiguration(): BuildConfiguration {
    return this.configurations.get('default')!;
  }

  updateConfiguration(id: string, updates: Partial<BuildConfiguration>): void {
    const config = this.configurations.get(id);
    if (config) {
      Object.assign(config, updates);
    }
  }

  saveConfiguration(config: BuildConfiguration): void {
    this.configurations.set(config.id, config);
  }

  // Target management
  toggleTarget(configId: string, targetId: string): void {
    const config = this.configurations.get(configId);
    if (config) {
      const target = config.targets.find(t => t.id === targetId);
      if (target) {
        target.enabled = !target.enabled;
      }
    }
  }

  addTarget(configId: string, target: BuildTarget): void {
    const config = this.configurations.get(configId);
    if (config) {
      config.targets.push(target);
    }
  }

  removeTarget(configId: string, targetId: string): void {
    const config = this.configurations.get(configId);
    if (config) {
      config.targets = config.targets.filter(t => t.id !== targetId);
    }
  }

  // Build execution
  async startBuild(configId: string, targetIds?: string[]): Promise<Build[]> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    const targets = targetIds
      ? config.targets.filter(t => targetIds.includes(t.id) && t.enabled)
      : config.targets.filter(t => t.enabled);

    if (targets.length === 0) {
      throw new Error('No build targets selected');
    }

    const builds: Build[] = [];

    for (const target of targets) {
      const build: Build = {
        id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        configId,
        target,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
        logs: [],
        artifacts: [],
      };

      this.builds.set(build.id, build);
      builds.push(build);

      // Start build asynchronously
      this.executeBuild(build, config);
    }

    return builds;
  }

  private async executeBuild(build: Build, config: BuildConfiguration): Promise<void> {
    build.status = 'building';
    build.progress = 0;

    this.emit({ type: 'buildStart', data: { build } });

    const steps = this.getBuildSteps(build.target, config);
    const totalSteps = steps.length;

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        this.addLog(build, 'info', step.message);
        
        await new Promise(r => setTimeout(r, step.duration));
        
        build.progress = Math.round(((i + 1) / totalSteps) * 100);
        
        this.emit({ type: 'buildProgress', data: { build, step: i + 1, totalSteps } });
      }

      // Generate artifact
      const artifact = this.generateArtifact(build, config);
      build.artifacts.push(artifact);

      build.status = 'success';
      build.endTime = new Date();

      this.addLog(build, 'info', `Build completed successfully!`);
      this.addLog(build, 'info', `Artifact: ${artifact.name} (${this.formatSize(artifact.size)})`);

      this.emit({ type: 'buildComplete', data: { build, artifact } });

    } catch (error: any) {
      build.status = 'failed';
      build.endTime = new Date();
      build.error = error.message;

      this.addLog(build, 'error', `Build failed: ${error.message}`);

      this.emit({ type: 'buildError', data: { build, error: error.message } });
    }
  }

  private getBuildSteps(target: BuildTarget, config: BuildConfiguration): Array<{ message: string; duration: number }> {
    const platform = PLATFORMS[target.platform];
    const steps = [
      { message: 'Preparing build environment...', duration: 500 },
      { message: 'Installing dependencies...', duration: 800 },
      { message: 'Compiling source code...', duration: 1200 },
      { message: 'Bundling application...', duration: 1000 },
      { message: `Building for ${platform.name} (${target.arch})...`, duration: 1500 },
    ];

    if (config.buildOptions.asar) {
      steps.push({ message: 'Creating ASAR archive...', duration: 600 });
    }

    steps.push({ message: `Packaging as ${target.format.toUpperCase()}...`, duration: 1000 });

    if (config.signing.enabled) {
      steps.push({ message: 'Signing application...', duration: 800 });
    }

    if (config.notarization.enabled && target.platform === 'macos') {
      steps.push({ message: 'Notarizing with Apple...', duration: 2000 });
    }

    steps.push({ message: 'Generating checksums...', duration: 300 });
    steps.push({ message: 'Finalizing build...', duration: 400 });

    return steps;
  }

  private generateArtifact(build: Build, config: BuildConfiguration): BuildArtifact {
    const platform = build.target.platform;
    const arch = build.target.arch;
    const format = build.target.format;
    const version = config.version;
    const name = config.metadata.name;

    const filename = `${name}-${version}-${platform}-${arch}.${format}`;
    const size = Math.floor(50 + Math.random() * 150) * 1024 * 1024; // 50-200 MB

    return {
      id: `artifact-${Date.now()}`,
      name: filename,
      path: `dist/${filename}`,
      size,
      format,
      platform,
      arch,
      checksum: {
        sha256: this.generateHash(64),
        sha512: this.generateHash(128),
      },
      signed: config.signing.enabled,
      notarized: config.notarization.enabled && platform === 'macos',
    };
  }

  private generateHash(length: number): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < length; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private addLog(build: Build, level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: string): void {
    build.logs.push({
      timestamp: new Date(),
      level,
      message,
      details,
    });
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Cancel build
  cancelBuild(buildId: string): void {
    const build = this.builds.get(buildId);
    if (build && build.status === 'building') {
      build.status = 'cancelled';
      build.endTime = new Date();
      this.addLog(build, 'warn', 'Build cancelled by user');
    }
  }

  // Get builds
  getBuild(id: string): Build | undefined {
    return this.builds.get(id);
  }

  getAllBuilds(): Build[] {
    return Array.from(this.builds.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getBuildsForConfig(configId: string): Build[] {
    return this.getAllBuilds().filter(b => b.configId === configId);
  }

  clearBuildHistory(): void {
    const activeBuilds = new Map<string, Build>();
    this.builds.forEach((build, id) => {
      if (build.status === 'building') {
        activeBuilds.set(id, build);
      }
    });
    this.builds = activeBuilds;
  }

  // Auto-update methods
  getUpdateStatus(): UpdateStatus {
    return { ...this.updateStatus };
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    this.updateStatus.checking = true;
    this.updateStatus.error = undefined;

    try {
      // Simulate checking for updates
      await new Promise(r => setTimeout(r, 1500));

      // Simulate finding an update (50% chance)
      if (Math.random() > 0.5) {
        const updateInfo: UpdateInfo = {
          version: '1.1.0',
          releaseDate: new Date(),
          releaseNotes: `## What's New\n\n- Bug fixes and performance improvements\n- New features added\n- Security updates`,
          mandatory: false,
          downloadUrl: 'https://example.com/download/v1.1.0',
          size: 85 * 1024 * 1024,
          checksum: this.generateHash(64),
        };

        this.updateStatus.available = true;
        this.updateStatus.latestVersion = updateInfo.version;
        this.updateStatus.updateInfo = updateInfo;

        this.emit({ type: 'updateAvailable', data: { updateInfo } });

        return updateInfo;
      }

      this.updateStatus.available = false;
      this.updateStatus.latestVersion = this.updateStatus.currentVersion;

      return null;

    } catch (error: any) {
      this.updateStatus.error = error.message;
      this.emit({ type: 'updateError', data: { error: error.message } });
      return null;

    } finally {
      this.updateStatus.checking = false;
    }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.updateStatus.available || !this.updateStatus.updateInfo) {
      throw new Error('No update available');
    }

    this.updateStatus.downloading = true;
    this.updateStatus.progress = 0;

    try {
      // Simulate download progress
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(r => setTimeout(r, 200));
        this.updateStatus.progress = i;
      }

      this.updateStatus.downloaded = true;
      this.updateStatus.downloading = false;

      this.emit({ type: 'updateDownloaded', data: { updateInfo: this.updateStatus.updateInfo } });

    } catch (error: any) {
      this.updateStatus.downloading = false;
      this.updateStatus.error = error.message;
      this.emit({ type: 'updateError', data: { error: error.message } });
    }
  }

  async installUpdate(): Promise<void> {
    if (!this.updateStatus.downloaded) {
      throw new Error('Update not downloaded');
    }

    // Simulate installation
    console.log('Installing update and restarting...');
    
    // In a real app, this would trigger the actual update installation
    this.updateStatus = {
      checking: false,
      available: false,
      downloading: false,
      downloaded: false,
      progress: 0,
      currentVersion: this.updateStatus.latestVersion || this.updateStatus.currentVersion,
    };
  }

  // Generate configuration files
  generateElectronBuilderConfig(configId: string): string {
    const config = this.configurations.get(configId);
    if (!config) return '';

    const builderConfig: any = {
      appId: config.metadata.appId,
      productName: config.metadata.productName,
      copyright: config.metadata.copyright,
      asar: config.buildOptions.asar,
      compression: config.buildOptions.compression,
      directories: {
        output: 'dist',
        buildResources: 'build',
      },
      files: ['dist/**/*', 'package.json'],
      extraResources: config.buildOptions.extraResources,
      extraFiles: config.buildOptions.extraFiles,
    };

    // Windows config
    const winTargets = config.targets.filter(t => t.platform === 'windows' && t.enabled);
    if (winTargets.length > 0) {
      builderConfig.win = {
        target: winTargets.map(t => ({ target: t.format === 'exe' ? 'nsis' : t.format, arch: [t.arch] })),
        icon: 'build/icon.ico',
      };
      if (config.signing.enabled && config.signing.windows.certificateFile) {
        builderConfig.win.certificateFile = config.signing.windows.certificateFile;
        builderConfig.win.certificatePassword = config.signing.windows.certificatePassword;
      }
    }

    // macOS config
    const macTargets = config.targets.filter(t => t.platform === 'macos' && t.enabled);
    if (macTargets.length > 0) {
      builderConfig.mac = {
        target: macTargets.map(t => ({ target: t.format, arch: [t.arch] })),
        icon: 'build/icon.icns',
        hardenedRuntime: config.signing.macos.hardenedRuntime,
        gatekeeperAssess: config.signing.macos.gatekeeperAssess,
      };
      if (config.signing.enabled && config.signing.macos.identity) {
        builderConfig.mac.identity = config.signing.macos.identity;
      }
      if (config.notarization.enabled) {
        builderConfig.afterSign = 'scripts/notarize.js';
      }
    }

    // Linux config
    const linuxTargets = config.targets.filter(t => t.platform === 'linux' && t.enabled);
    if (linuxTargets.length > 0) {
      builderConfig.linux = {
        target: linuxTargets.map(t => ({ target: t.format === 'appimage' ? 'AppImage' : t.format, arch: [t.arch] })),
        icon: 'build/icons',
        category: config.metadata.category || 'Development',
      };
    }

    // Auto-update config
    if (config.autoUpdate.enabled) {
      builderConfig.publish = {
        provider: config.autoUpdate.provider,
        url: config.autoUpdate.url,
        channel: config.autoUpdate.channel,
      };
    }

    return JSON.stringify(builderConfig, null, 2);
  }

  generatePackageJsonScripts(): Record<string, string> {
    return {
      'build': 'npm run build:all',
      'build:all': 'npm run build:win && npm run build:mac && npm run build:linux',
      'build:win': 'electron-builder --win',
      'build:mac': 'electron-builder --mac',
      'build:linux': 'electron-builder --linux',
      'build:win:x64': 'electron-builder --win --x64',
      'build:win:arm64': 'electron-builder --win --arm64',
      'build:mac:x64': 'electron-builder --mac --x64',
      'build:mac:arm64': 'electron-builder --mac --arm64',
      'build:mac:universal': 'electron-builder --mac --universal',
      'build:linux:x64': 'electron-builder --linux --x64',
      'build:linux:arm64': 'electron-builder --linux --arm64',
      'publish': 'electron-builder --publish always',
      'release': 'npm run build && npm run publish',
    };
  }

  // Event system
  on(event: string, callback: EventCallback): () => void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);

    return () => {
      const current = this.eventListeners.get(event) || [];
      this.eventListeners.set(event, current.filter(cb => cb !== callback));
    };
  }

  private emit(event: PackagingEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(cb => cb(event));

    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(cb => cb(event));
  }
}

// Singleton instance
export const packagingService = new PackagingService();
export default packagingService;
