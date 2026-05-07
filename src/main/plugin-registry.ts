import type { PluginManifest } from '@shared/types';
import { FileManager } from './services/file-manager';

export class PluginRegistry {
  private static plugins: Map<string, PluginManifest> = new Map();

  static initialize(): void {
    const manifests = FileManager.loadAllPluginManifests();
    for (const manifest of manifests) {
      this.plugins.set(manifest.id, manifest);
    }
    console.log(`[PluginRegistry] Loaded ${this.plugins.size} plugins: ${[...this.plugins.keys()].join(', ')}`);
  }

  static getPlugin(id: string): PluginManifest | null {
    return this.plugins.get(id) || null;
  }

  static getAllPlugins(): PluginManifest[] {
    return [...this.plugins.values()];
  }

  static getPluginIds(): string[] {
    return [...this.plugins.keys()];
  }

  static reload(): void {
    this.plugins.clear();
    this.initialize();
  }
}
