type ArchiveDocument = {
  content: string;
  path: string;
  title: string;
};

type ArchivePayload = {
  documents: ArchiveDocument[];
  downloadName: string;
  lang: string;
  title: string;
};

type MermaidModule = {
  initialize(config: { securityLevel: string; startOnLoad: boolean; theme: string }): void;
  run(options: { nodes: Element[] }): Promise<void>;
};

declare const ARCHIVE: ArchivePayload;

declare module "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs" {
  const mermaid: MermaidModule;
  export default mermaid;
}
