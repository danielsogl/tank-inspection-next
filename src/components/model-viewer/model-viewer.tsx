"use client";

import {
  type AbstractMesh,
  ActionManager,
  type Scene as BabylonScene,
  Color4,
  ExecuteCodeAction,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Engine,
  type ILoadedModel,
  Model,
  Scene,
  useScene,
} from "react-babylonjs";
import "@babylonjs/loaders/OBJ";
import { Loader2 } from "lucide-react";
import { useVehicle } from "@/contexts/vehicle-context";
import { cn } from "@/lib/utils";
import {
  getDefaultVehicleModel,
  getVehicleModel,
  type VehicleModelView,
} from "./model-registry";
import {
  type UseModelInteractionOptions,
  useModelInteraction,
} from "./use-model-interaction";

interface ModelViewerProps {
  className?: string;
  vehicleId?: string;
  onMeshClick?: (meshName: string) => void;
  onSceneReady?: (scene: BabylonScene) => void;
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading model...</span>
      </div>
    </div>
  );
}

// Tank model component that loads and sets up the OBJ model
interface TankModelProps {
  model: VehicleModelView;
  onMeshPointerOver: (mesh: AbstractMesh, scene: BabylonScene) => void;
  onMeshPointerOut: (mesh: AbstractMesh, scene: BabylonScene) => void;
  onMeshClick: (mesh: AbstractMesh, scene: BabylonScene) => void;
  onModelLoaded?: (model: ILoadedModel) => void;
}

function TankModel({
  model,
  onMeshPointerOver,
  onMeshPointerOut,
  onMeshClick,
  onModelLoaded,
}: TankModelProps) {
  const scene = useScene();

  const handleModelLoaded = useCallback(
    (loadedModel: ILoadedModel) => {
      if (!scene) return;

      // Create a group node for the model
      const groupNode = new TransformNode("group", scene);

      // Setup each mesh with action managers for interaction
      loadedModel.meshes?.forEach((mesh: AbstractMesh) => {
        if (mesh.name === "grid" || mesh.name === "__root__") return;

        mesh.parent = groupNode;
        mesh.isPickable = true;

        // Create action manager for mesh interactions
        mesh.actionManager = new ActionManager(scene);

        // Hover enter
        mesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            onMeshPointerOver(mesh, scene);
          }),
        );

        // Hover leave
        mesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            onMeshPointerOut(mesh, scene);
          }),
        );

        // Click
        mesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            onMeshClick(mesh, scene);
          }),
        );
      });

      // Center the model
      const { min } = groupNode.getHierarchyBoundingVectors(true);
      groupNode.position.y -= min.y;

      onModelLoaded?.(loadedModel);
    },
    [scene, onMeshPointerOver, onMeshPointerOut, onMeshClick, onModelLoaded],
  );

  return (
    <Model
      name={model.id}
      rootUrl={model.rootUrl}
      sceneFilename={model.sceneFilename}
      position={Vector3.Zero()}
      onModelLoaded={handleModelLoaded}
    />
  );
}

// Scene content component that sets up camera, lights, and model
interface SceneContentProps {
  model: VehicleModelView;
  interactionOptions: UseModelInteractionOptions;
  onSceneReady?: (scene: BabylonScene) => void;
}

function SceneContent({
  model,
  interactionOptions,
  onSceneReady,
}: SceneContentProps) {
  const scene = useScene();
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const { handleMeshPointerOver, handleMeshPointerOut, handleMeshClick } =
    useModelInteraction(interactionOptions);

  useEffect(() => {
    if (scene && onSceneReady) {
      onSceneReady(scene);
    }
  }, [scene, onSceneReady]);

  const handleModelLoaded = useCallback(() => {
    setIsModelLoaded(true);
  }, []);

  // Camera defaults from Angular implementation
  const cameraTarget = new Vector3(-0.011015, 3.995316, 1.5661425);
  const cameraRadius = 24.234461984506392;
  const cameraBeta = 1.2369455378250176;
  const cameraAlpha = -4.0993409363362945;

  return (
    <>
      <arcRotateCamera
        name="camera1"
        alpha={cameraAlpha}
        beta={cameraBeta}
        radius={cameraRadius}
        target={cameraTarget}
        minZ={0.1}
        wheelPrecision={50}
        panningSensibility={100}
      />
      <hemisphericLight
        name="light1"
        intensity={0.9}
        direction={new Vector3(0, 1, 0)}
      />
      <directionalLight
        name="dirLight"
        intensity={0.4}
        direction={new Vector3(-1, -2, -1)}
      />
      <Suspense fallback={null}>
        <TankModel
          model={model}
          onMeshPointerOver={handleMeshPointerOver}
          onMeshPointerOut={handleMeshPointerOut}
          onMeshClick={handleMeshClick}
          onModelLoaded={handleModelLoaded}
        />
      </Suspense>
      {!isModelLoaded && (
        <box name="loadingIndicator" size={0.001} visibility={0} />
      )}
    </>
  );
}

export function ModelViewer({
  className,
  vehicleId,
  onMeshClick,
  onSceneReady,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedVehicle } = useVehicle();

  // Get the vehicle model from context or prop, converting VehicleConfig to VehicleModelView
  const model: VehicleModelView = vehicleId
    ? (getVehicleModel(vehicleId) ?? getDefaultVehicleModel())
    : {
        id: selectedVehicle.id,
        name: selectedVehicle.name,
        rootUrl: selectedVehicle.model.rootUrl,
        sceneFilename: selectedVehicle.model.sceneFilename,
        description: selectedVehicle.description,
        agentId: selectedVehicle.agentId,
      };

  const interactionOptions: UseModelInteractionOptions = {
    onMeshClick,
  };

  // Handle scene mount for additional setup
  const handleSceneMount = useCallback(
    (sceneEventArgs: { scene: BabylonScene; canvas: HTMLCanvasElement }) => {
      const { scene, canvas } = sceneEventArgs;

      // Set transparent background
      scene.clearColor = new Color4(0, 0, 0, 0);

      // Store engine reference for resize
      engineRef.current = scene.getEngine();

      // Disable default canvas events to prevent scroll issues
      canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
        },
        { passive: false },
      );

      setIsLoading(false);
    },
    [],
  );

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full h-full", className)}>
      {isLoading && <LoadingFallback />}
      <Engine
        antialias
        adaptToDeviceRatio
        canvasId="model-viewer-canvas"
        style={{ width: "100%", height: "100%", outline: "none" }}
      >
        <Scene onSceneMount={handleSceneMount}>
          <SceneContent
            model={model}
            interactionOptions={interactionOptions}
            onSceneReady={onSceneReady}
          />
        </Scene>
      </Engine>
    </div>
  );
}
