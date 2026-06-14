export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    // @ts-ignore - File System Access API types might not be present by default
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
    return dirHandle;
  } catch (error) {
    console.error('User cancelled or failed to get directory access', error);
    return null;
  }
}

export async function writeJsonFile(dirHandle: FileSystemDirectoryHandle, filename: string, data: any): Promise<void> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (error) {
    console.error(`Failed to write JSON file ${filename}`, error);
    throw error;
  }
}

export async function readJsonFile(dirHandle: FileSystemDirectoryHandle, filename: string): Promise<any | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (error) {
    console.error(`Failed to read JSON file ${filename}`, error);
    return null;
  }
}

export async function writeTextFile(dirHandle: FileSystemDirectoryHandle, filename: string, text: string): Promise<void> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  } catch (error) {
    console.error(`Failed to write Text file ${filename}`, error);
    throw error;
  }
}

export async function listTextFiles(dirHandle: FileSystemDirectoryHandle): Promise<string[]> {
  const files: string[] = [];
  try {
    // @ts-ignore
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
        files.push(entry.name);
      }
    }
  } catch (error) {
    console.error('Failed to list text files', error);
  }
  return files;
}

export async function getOrCreateConfigDir(dirHandle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await dirHandle.getDirectoryHandle('config', { create: true });
  } catch (error) {
    console.error('Failed to get or create config directory', error);
    return null;
  }
}

export async function listConfigFiles(dirHandle: FileSystemDirectoryHandle): Promise<string[]> {
  const files: string[] = [];
  try {
    const configDir = await getOrCreateConfigDir(dirHandle);
    if (!configDir) return files;
    
    // @ts-ignore
    for await (const entry of configDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        files.push(entry.name);
      }
    }
  } catch (error) {
    console.error('Failed to list config files', error);
  }
  return files;
}

export async function renameConfigFile(dirHandle: FileSystemDirectoryHandle, oldName: string, newName: string): Promise<boolean> {
  try {
    const configDir = await getOrCreateConfigDir(dirHandle);
    if (!configDir) return false;
    
    const fileHandle = await configDir.getFileHandle(oldName);
    const file = await fileHandle.getFile();
    const data = await file.text();
    
    // Write new file
    const newFileHandle = await configDir.getFileHandle(newName, { create: true });
    // @ts-ignore
    const writable = await newFileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    
    // Delete old file
    // @ts-ignore
    await configDir.removeEntry(oldName);
    return true;
  } catch (error) {
    console.error('Failed to rename config file', error);
    return false;
  }
}
