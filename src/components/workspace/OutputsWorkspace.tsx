"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { CurrentButton } from "@/components/current/CurrentButton";
import type { OutputGalleryNodeData, OutputNodeData } from "@/types";
import { resolveOutputMedia } from "@/utils/outputMedia";

export function OutputsWorkspace({ onBack }: { onBack?: () => void } = {}) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const history = useWorkflowStore((state) => state.globalImageHistory);
  const setWorkspaceView = useWorkflowStore((state) => state.setWorkspaceView);
  const outputNodes = nodes.filter((node) => node.type === "output" || node.type === "outputGallery");

  const back = () => {
    setWorkspaceView("canvas");
    onBack?.();
  };

  return (
    <main className="current-outputs absolute inset-0 h-full min-h-0 overflow-y-auto" aria-label="Workflow outputs">
      <header className="current-outputs__header">
        <div><span className="current-eyebrow">Review</span><h1>Workflow outputs</h1></div>
        <CurrentButton variant="secondary" onClick={back}>Back to Canvas</CurrentButton>
      </header>
      <section aria-labelledby="output-nodes-heading">
        <h2 id="output-nodes-heading">Output nodes</h2>
        <div className="current-output-grid">
          {outputNodes.length === 0 && <p className="current-empty-state">Add an output node to collect final media.</p>}
          {outputNodes.map((node) => {
            const data = node.data as unknown as OutputNodeData & OutputGalleryNodeData;
            const resolved = node.type === "output" ? resolveOutputMedia(data) : null;
            const media = node.type === "outputGallery"
              ? [...(data.images || []).map((src) => ({ type: "image", src })), ...(data.videos || []).map((src) => ({ type: "video", src }))]
              : resolved ? [resolved] : [];
            return <article className="current-output-card" key={node.id}>
              <h3>{data.customTitle || (node.type === "outputGallery" ? "Output gallery" : "Output")}</h3>
              <div className="current-output-card__media">{media.length === 0 ? <span>Waiting for media</span> : media.map((item, index) => item.type === "image" ? <img key={index} src={item.src} alt="Workflow output" /> : item.type === "video" ? <video key={index} src={item.src} controls /> : <audio key={index} src={item.src} controls />)}</div>
            </article>;
          })}
        </div>
      </section>
      <section aria-labelledby="latest-generations-heading">
        <h2 id="latest-generations-heading">Latest generations</h2>
        <div className="current-output-grid current-output-grid--history">
          {history.length === 0 && <p className="current-empty-state">Generated images will appear here.</p>}
          {history.map((item) => <figure className="current-output-card" key={item.id}><img src={item.image} alt={item.prompt || "Generated image"} /><figcaption>{item.prompt || "Untitled generation"}</figcaption></figure>)}
        </div>
      </section>
    </main>
  );
}
