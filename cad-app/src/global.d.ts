export {};

declare global {
  interface Window {
    /** Exposed by electron/preload.ts; undefined when running in a plain browser. */
    nirman?: {
      platform: string;
      saveFile(req: {
        kind: 'project' | 'stl' | 'obj';
        defaultName: string;
        data: string | Uint8Array;
      }): Promise<{ saved: boolean; path?: string }>;
      openProject(): Promise<{ name: string; text: string } | null>;
    };
  }
}
