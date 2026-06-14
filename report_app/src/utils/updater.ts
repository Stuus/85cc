export const CURRENT_VERSION = '1.0.0';

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  updateUrl: string;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch('https://raw.githubusercontent.com/Stuus/85cc/main/report_app/package.json', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch version info from GitHub.');
      return null;
    }

    const data = await response.json();
    const remoteVersion = data.version;

    if (!remoteVersion) return null;

    const hasUpdate = isNewerVersion(remoteVersion, CURRENT_VERSION);
    return {
      hasUpdate,
      latestVersion: remoteVersion,
      updateUrl: 'https://github.com/Stuus/85cc'
    };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
}

// Simple semver compare (e.g. 1.0.1 > 1.0.0)
function isNewerVersion(remote: string, current: string): boolean {
  const rParts = remote.split('.').map(Number);
  const cParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}
