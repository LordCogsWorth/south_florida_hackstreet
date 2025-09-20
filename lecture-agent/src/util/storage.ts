// src/util/storage.ts
export function getObjectStore(ctx: any) {
  return {
    tmpDir: () => "/tmp",
    ensureTmpDir: async (name: string) => {
      const path = `/tmp/${name}`;
      await require('fs').promises.mkdir(path, { recursive: true });
      return path;
    },
    downloadToTemp: async ({ videoUrl, fileId, objectKey, suffix }: any) => {
      const fs = require('fs');
      const path = require('path');
      const fetch = require('node-fetch');
      
      if (videoUrl) {
        const response = await fetch(videoUrl);
        const buffer = await response.buffer();
        const tempPath = path.join('/tmp', suffix || 'temp-video.mp4');
        await fs.promises.writeFile(tempPath, buffer);
        return tempPath;
      }
      
      if (objectKey) {
        // Get from Agentuity object store
        const buffer = await ctx.object.get(objectKey);
        const tempPath = path.join('/tmp', suffix || 'temp-file');
        await fs.promises.writeFile(tempPath, buffer);
        return tempPath;
      }
      
      throw new Error('Either videoUrl or objectKey required');
    },
    put: async (key: string, filePath: string) => {
      const fs = require('fs');
      const buffer = await fs.promises.readFile(filePath);
      await ctx.object.put(key, buffer);
      return { key };
    },
    putDir: async (prefix: string, dirPath: string) => {
      const fs = require('fs');
      const path = require('path');
      const files = await fs.promises.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const key = `${prefix}${file}`;
        const buffer = await fs.promises.readFile(filePath);
        await ctx.object.put(key, buffer);
      }
      
      return { prefix };
    },
    listPrefix: async (prefix: string) => {
      // List all objects with the given prefix
      const keys = await ctx.object.list(prefix);
      return keys.map((key: string) => ({
        key,
        name: key.split('/').pop()
      }));
    },
    getBuffer: async (key: string) => {
      return await ctx.object.get(key);
    }
  };
}