import type { PluginManifest } from '../shared/types';
export declare class PluginRegistry {
    private static plugins;
    static initialize(): void;
    static getPlugin(id: string): PluginManifest | null;
    static getAllPlugins(): PluginManifest[];
    static getPluginIds(): string[];
    static reload(): void;
}
