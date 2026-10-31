type ArchiveDocument = {
  content: string;
  path: string;
  title: string;
};

type ArchivePayload = {
  documents: ArchiveDocument[];
  downloadName: string;
  labels: {
    copied: string;
    copyAgentUrl: string;
    copyDoc: string;
    copyFailed: string;
    count: string;
    download: string;
    empty: string;
    search: string;
    source: string;
  };
  lang: string;
  sourceUrl: string;
  title: string;
};

type DocumentNode = {
  document: ArchiveDocument;
  kind: "document";
};

type DirectoryNode = {
  children: TreeNode[];
  kind: "directory";
  label: string;
  path: string;
};

type TreeNode = DocumentNode | DirectoryNode;

type MermaidModule = {
  initialize(config: { securityLevel: string; startOnLoad: boolean; theme: string }): void;
  run(options: { nodes: Element[] }): Promise<void>;
};

declare const ARCHIVE: ArchivePayload;

declare module "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs" {
  const mermaid: MermaidModule;
  export default mermaid;
}
