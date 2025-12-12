"use client";

import type { AbstractMesh, Scene } from "@babylonjs/core";
import { Color3 } from "@babylonjs/core";
import { useCallback, useRef, useState } from "react";

// Highlight colors matching the Angular implementation
const AGENT_HIGHLIGHT_COLOR = Color3.FromHexString("#FF594F"); // Coral red for agent
const HOVER_HIGHLIGHT_COLOR = Color3.FromHexString("#4FC3FF"); // Light blue for hover

const AGENT_OUTLINE_WIDTH = 0.12;
const HOVER_OUTLINE_WIDTH = 0.08;

export interface UseModelInteractionOptions {
  onMeshClick?: (meshName: string) => void;
}

export interface UseModelInteractionReturn {
  hoveredMesh: string | null;
  selectedMesh: string | null;
  agentHighlights: Set<string>;
  handleMeshPointerOver: (mesh: AbstractMesh, scene: Scene) => void;
  handleMeshPointerOut: (mesh: AbstractMesh, scene: Scene) => void;
  handleMeshClick: (mesh: AbstractMesh, scene: Scene) => void;
  setAgentHighlights: (parts: string[], scene: Scene | null) => void;
  clearAgentHighlights: (scene: Scene | null) => void;
  clearSelection: () => void;
}

export function useModelInteraction(
  options: UseModelInteractionOptions = {},
): UseModelInteractionReturn {
  const { onMeshClick } = options;

  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const agentHighlightsRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState({});

  const handleMeshPointerOver = useCallback(
    (mesh: AbstractMesh, _scene: Scene) => {
      if (mesh.name === "grid") return;

      // Apply hover highlight only if not already agent-highlighted
      if (!agentHighlightsRef.current.has(mesh.name)) {
        mesh.outlineColor = HOVER_HIGHLIGHT_COLOR;
        mesh.outlineWidth = HOVER_OUTLINE_WIDTH;
        mesh.renderOutline = true;
      }

      setHoveredMesh(mesh.name);
    },
    [],
  );

  const handleMeshPointerOut = useCallback(
    (mesh: AbstractMesh, _scene: Scene) => {
      if (mesh.name === "grid") return;

      // Restore agent highlight or remove highlight completely
      if (agentHighlightsRef.current.has(mesh.name)) {
        mesh.outlineColor = AGENT_HIGHLIGHT_COLOR;
        mesh.outlineWidth = AGENT_OUTLINE_WIDTH;
        mesh.renderOutline = true;
      } else {
        mesh.renderOutline = false;
      }

      setHoveredMesh(null);
    },
    [],
  );

  const handleMeshClick = useCallback(
    (mesh: AbstractMesh, _scene: Scene) => {
      if (mesh.name === "grid") return;

      setSelectedMesh(mesh.name);
      onMeshClick?.(mesh.name);
    },
    [onMeshClick],
  );

  const setAgentHighlights = useCallback(
    (parts: string[], scene: Scene | null) => {
      if (!scene) return;

      // Clear previous agent highlights
      agentHighlightsRef.current.forEach((partName) => {
        const mesh = scene.getMeshByName(partName);
        if (mesh) {
          mesh.renderOutline = false;
        }
      });
      agentHighlightsRef.current.clear();

      // Apply new agent highlights
      parts.forEach((partName) => {
        const mesh = scene.getMeshByName(partName);
        if (mesh) {
          mesh.outlineColor = AGENT_HIGHLIGHT_COLOR;
          mesh.outlineWidth = AGENT_OUTLINE_WIDTH;
          mesh.renderOutline = true;
          agentHighlightsRef.current.add(partName);
        }
      });

      forceUpdate({});
    },
    [],
  );

  const clearAgentHighlights = useCallback((scene: Scene | null) => {
    if (!scene) return;

    agentHighlightsRef.current.forEach((partName) => {
      const mesh = scene.getMeshByName(partName);
      if (mesh) {
        mesh.renderOutline = false;
      }
    });
    agentHighlightsRef.current.clear();
    forceUpdate({});
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMesh(null);
  }, []);

  return {
    hoveredMesh,
    selectedMesh,
    agentHighlights: agentHighlightsRef.current,
    handleMeshPointerOver,
    handleMeshPointerOut,
    handleMeshClick,
    setAgentHighlights,
    clearAgentHighlights,
    clearSelection,
  };
}
