// This is a hack to enable expanded documentation by default,
// by overriding the default storage service.

function isUndefinedOrNull(obj: any) {
  return typeof obj === 'undefined' || obj === null;
}

export class StorageService {
  globalCache: Map<string, any>;
  workspaceCache: Map<string, any>;

  constructor() {
    this.globalCache = new Map();
    this.workspaceCache = new Map();
  }
  getCache(scope: number) {
    return scope === 0 /* GLOBAL */ ? this.globalCache : this.workspaceCache;
  }
  get(key: string, scope: number, fallbackValue: string): string {
    const value = this.getCache(scope).get(key);
    if (isUndefinedOrNull(value)) {
      return fallbackValue;
    }
    return value;
  }
  getBoolean(key: string, scope: number, fallbackValue: boolean): boolean {
    const value = this.getCache(scope).get(key);
    if (isUndefinedOrNull(value)) {
      return fallbackValue;
    }
    return value === 'true';
  }
  getNumber(key: string, scope: number, fallbackValue: number): number {
    const value = this.getCache(scope).get(key);
    if (isUndefinedOrNull(value)) {
      return fallbackValue;
    }
    return parseInt(value, 10);
  }
  store(key: string, value: any, scope: number) {
    // We remove the key for undefined/null values
    if (isUndefinedOrNull(value)) {
      return this.remove(key, scope);
    }
    // Otherwise, convert to String and store
    const valueStr = String(value);
    this.getCache(scope).set(key, valueStr);
  }
  remove(key: string, scope: number) {
    this.getCache(scope).delete(key);
  }
  onWillSaveState() {}
  onDidChangeStorage() {}
}
