import * as SecureStore from 'expo-secure-store';

const chunkSize = 1800;

type ChunkManifest = {
  chunks: number;
};

async function clearChunks(key: string, count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, index) =>
      SecureStore.deleteItemAsync(`${key}.${index}`)
    )
  );
}

async function readManifest(key: string): Promise<ChunkManifest | null> {
  const value = await SecureStore.getItemAsync(`${key}.manifest`);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ChunkManifest;
    return Number.isInteger(parsed.chunks) && parsed.chunks > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const manifest = await readManifest(key);
    if (!manifest) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: manifest.chunks }, (_, index) =>
        SecureStore.getItemAsync(`${key}.${index}`)
      )
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousManifest = await readManifest(key);
    if (previousManifest) {
      await clearChunks(key, previousManifest.chunks);
    }
    await SecureStore.deleteItemAsync(key);

    if (value.length <= chunkSize) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}.manifest`);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) ?? [];
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${index}`, chunk))
    );
    await SecureStore.setItemAsync(
      `${key}.manifest`,
      JSON.stringify({ chunks: chunks.length } satisfies ChunkManifest)
    );
  },

  async removeItem(key: string): Promise<void> {
    const manifest = await readManifest(key);
    if (manifest) {
      await clearChunks(key, manifest.chunks);
    }
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(`${key}.manifest`)
    ]);
  }
};
