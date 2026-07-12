import type { WorkflowFile } from "@/store/workflowStore";
import type { NodeGroup, WorkflowProposal } from "@/types";
import { repairWorkflowJSON, validateWorkflowJSON } from "./validation";
import { getNodeConnectionCapabilities } from "@/lib/workflow/nodeCapabilities";
import { getAppliedProposalNodeData } from "./proposalNodeConfig";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

function stableId(appliedProposal: unknown): string {
  const input = JSON.stringify(canonicalize(appliedProposal));
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `wf_proposal_${(hash >>> 0).toString(36)}`;
}

export function proposalToWorkflow(proposal: WorkflowProposal): WorkflowFile {
  const nodeIds = new Set(proposal.nodes.map((node) => node.id));
  if (nodeIds.size !== proposal.nodes.length || proposal.nodes.some((node) => !node.id)) {
    throw new Error("Invalid workflow proposal: node IDs must be unique");
  }
  if (proposal.connections.some((connection) => !nodeIds.has(connection.from) || !nodeIds.has(connection.to))) {
    throw new Error("Invalid workflow proposal: connection references an unknown node");
  }
  const nodesById = new Map(proposal.nodes.map((node) => [node.id, node]));
  for (const connection of proposal.connections) {
    const source = nodesById.get(connection.from)!;
    const target = nodesById.get(connection.to)!;
    if (!getNodeConnectionCapabilities(source.type).outputs.includes(connection.type)) {
      throw new Error(`Invalid workflow proposal: ${source.type} cannot output ${connection.type}`);
    }
    if (!getNodeConnectionCapabilities(target.type).inputs.includes(connection.type)) {
      throw new Error(`Invalid workflow proposal: ${target.type} cannot accept input ${connection.type}`);
    }
  }

  const groupedNodeIds = new Set<string>();
  for (const group of proposal.groups ?? []) {
    if (!group.name.trim()) throw new Error("Invalid workflow proposal: group name cannot be empty");
    if (group.nodeIds.length === 0) throw new Error(`Invalid workflow proposal: group ${group.name} cannot be empty`);
    const membership = new Set(group.nodeIds);
    if (membership.size !== group.nodeIds.length) throw new Error(`Invalid workflow proposal: group ${group.name} contains duplicate nodes`);
    for (const nodeId of membership) {
      if (!nodeIds.has(nodeId)) throw new Error(`Invalid workflow proposal: group ${group.name} references unknown node ${nodeId}`);
      if (groupedNodeIds.has(nodeId)) throw new Error(`Invalid workflow proposal: node ${nodeId} belongs to multiple groups`);
      groupedNodeIds.add(nodeId);
    }
  }

  const appliedNodes = proposal.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    data: getAppliedProposalNodeData(node),
  }));
  const appliedProposal = {
    name: proposal.name,
    nodes: appliedNodes,
    connections: proposal.connections.map(({ from, to, type, description }) => ({
      from,
      to,
      type,
      description,
    })),
    groups: proposal.groups?.map(({ name, color, nodeIds }) => ({
      name,
      color,
      nodeIds: [...nodeIds].sort(),
    })),
  };

  const workflow = repairWorkflowJSON({
    version: 1,
    id: stableId(appliedProposal),
    name: proposal.name,
    edgeStyle: "curved",
    nodes: appliedNodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: { x: 80 + (index % 3) * 390, y: 100 + Math.floor(index / 3) * 390 },
      data: node.data,
    })),
    edges: proposal.connections.map((connection, index) => ({
      id: `proposal-edge-${index + 1}-${connection.from}-${connection.to}`,
      source: connection.from,
      sourceHandle: connection.type,
      target: connection.to,
      targetHandle: connection.type,
    })),
  });
  workflow.edges = workflow.edges.map((edge, index) => ({
    ...edge,
    data: { ...(edge.data ?? {}), description: proposal.connections[index].description },
  }));

  if (proposal.groups?.length) {
    const groups: Record<string, NodeGroup> = {};
    proposal.groups.forEach((group, index) => {
      const groupId = `proposal-group-${index + 1}`;
      const groupedNodes = workflow.nodes.filter((node) => group.nodeIds.includes(node.id));
      if (groupedNodes.length === 0) return;
      groupedNodes.forEach((node) => { node.groupId = groupId; });
      const xs = groupedNodes.map((node) => node.position.x);
      const ys = groupedNodes.map((node) => node.position.y);
      groups[groupId] = {
        id: groupId,
        name: group.name,
        color: group.color,
        position: { x: Math.min(...xs) - 30, y: Math.min(...ys) - 70 },
        size: { width: Math.max(...xs) - Math.min(...xs) + 380, height: Math.max(...ys) - Math.min(...ys) + 420 },
      };
    });
    workflow.groups = groups;
  }

  const validation = validateWorkflowJSON(workflow);
  if (!validation.valid) {
    throw new Error(`Invalid workflow proposal: ${validation.errors.map((error) => `${error.path} ${error.message}`).join(", ")}`);
  }
  return workflow;
}
