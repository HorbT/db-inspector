"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginRegistry = void 0;
const file_manager_1 = require("./services/file-manager");
class PluginRegistry {
    static initialize() {
        const manifests = file_manager_1.FileManager.loadAllPluginManifests();
        for (const manifest of manifests) {
            this.plugins.set(manifest.id, manifest);
        }
        console.log(`[PluginRegistry] Loaded ${this.plugins.size} plugins: ${[...this.plugins.keys()].join(', ')}`);
    }
    static getPlugin(id) {
        return this.plugins.get(id) || null;
    }
    static getAllPlugins() {
        return [...this.plugins.values()];
    }
    static getPluginIds() {
        return [...this.plugins.keys()];
    }
    static reload() {
        this.plugins.clear();
        this.initialize();
    }
}
exports.PluginRegistry = PluginRegistry;
PluginRegistry.plugins = new Map();
//# sourceMappingURL=plugin-registry.js.map