/**
 * Seed script for populating the vector database with inspection data.
 *
 * This script:
 * 1. Reads structured JSON data from data/leopard2-rag/
 * 2. Converts JSON to semantic German text for better embeddings
 * 3. Chunks documents using Mastra's MDocument with recursive strategy
 * 4. Generates embeddings using Mastra's ModelRouterEmbeddingModel
 * 5. Upserts the chunks into the Supabase pgvector database
 *
 * Run with: npx tsx src/mastra/scripts/seed-inspection-data.ts
 */

// Load environment variables from .env file
import "dotenv/config";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { EMBEDDING_MODEL_ID, getEmbeddingModel } from "../lib/models";
import { getVectorStore, INSPECTION_INDEX_CONFIG } from "../lib/vector";
import type {
  Component,
  DefectTaxonomy,
  InspectionChunkMetadata,
  MaintenanceInterval,
  MaintenanceSection,
  VehicleData,
} from "../types/rag-data.types";
import {
  checkpointBaseToText,
  checkpointDefectsToText,
  checkpointTasksToText,
  componentFailuresToText,
  componentSpecsToText,
  defectPriorityToText,
  maintenanceIntervalToText,
  monitoringPointsToText,
  vehicleSpecsToText,
} from "./converters";

// ============================================================================
// Chunking Configuration
// ============================================================================

/**
 * Chunking parameters optimized for each data type.
 * - maxSize: Target maximum chunk size in characters
 * - overlap: Characters of overlap between chunks for context continuity
 * - separators: Priority order for splitting (most preferred first)
 */
const CHUNK_CONFIG = {
  vehicle: {
    maxSize: 450,
    overlap: 50,
    separators: ["\n\n", "\n", ". "],
  },
  checkpoint: {
    maxSize: 400,
    overlap: 50,
    separators: ["\n\n", "\n", ". ", ", "],
  },
  component: {
    maxSize: 450,
    overlap: 50,
    separators: ["\n\n", "\n", ". "],
  },
  defect: {
    maxSize: 350,
    overlap: 30,
    separators: ["\n", ". "],
  },
  interval: {
    maxSize: 400,
    overlap: 40,
    separators: ["\n\n", "\n", ". "],
  },
};

// ============================================================================
// Data Loaders
// ============================================================================

/**
 * Load all vehicle data files.
 */
function loadVehicleData(dataDir: string): VehicleData[] {
  const vehiclesDir = join(dataDir, "vehicles");
  const files = readdirSync(vehiclesDir).filter((f) => f.endsWith(".json"));

  return files.map((file) => {
    const content = readFileSync(join(vehiclesDir, file), "utf-8");
    return JSON.parse(content) as VehicleData;
  });
}

/**
 * Load all maintenance sections with checkpoints.
 */
function loadMaintenanceSections(dataDir: string): MaintenanceSection[] {
  const sectionsDir = join(dataDir, "maintenance", "sections");
  const files = readdirSync(sectionsDir).filter((f) => f.endsWith(".json"));

  return files.map((file) => {
    const content = readFileSync(join(sectionsDir, file), "utf-8");
    return JSON.parse(content) as MaintenanceSection;
  });
}

/**
 * Load all component data recursively.
 */
function loadComponents(dataDir: string): Component[] {
  const componentsDir = join(dataDir, "components");
  const components: Component[] = [];

  function loadFromDir(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        loadFromDir(fullPath);
      } else if (entry.endsWith(".json")) {
        const content = readFileSync(fullPath, "utf-8");
        components.push(JSON.parse(content) as Component);
      }
    }
  }

  loadFromDir(componentsDir);
  return components;
}

/**
 * Load defect taxonomy.
 */
function loadDefectTaxonomy(dataDir: string): DefectTaxonomy | null {
  try {
    const content = readFileSync(
      join(dataDir, "defects", "taxonomy.json"),
      "utf-8",
    );
    return JSON.parse(content) as DefectTaxonomy;
  } catch {
    return null;
  }
}

/**
 * Load maintenance intervals.
 */
function loadMaintenanceIntervals(
  dataDir: string,
): { intervals: MaintenanceInterval[] } | null {
  try {
    const content = readFileSync(
      join(dataDir, "maintenance", "intervals.json"),
      "utf-8",
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ============================================================================
// Chunk Preparation Functions (using MDocument)
// ============================================================================

/**
 * Prepare vehicle chunks using MDocument with recursive chunking.
 * Converts vehicle specs to semantic German text before chunking.
 */
async function prepareVehicleChunks(
  vehicles: VehicleData[],
): Promise<{ text: string; metadata: InspectionChunkMetadata }[]> {
  const allChunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  for (const vehicle of vehicles) {
    // Convert to semantic German text
    const semanticText = vehicleSpecsToText(vehicle);

    // Create MDocument and chunk
    const doc = MDocument.fromText(semanticText);
    const chunks = await doc.chunk({
      strategy: "recursive",
      ...CHUNK_CONFIG.vehicle,
    });

    // Create metadata for each chunk
    for (const chunk of chunks) {
      allChunks.push({
        text: chunk.text,
        metadata: {
          vehicleType: "leopard2" as const,
          vehicleVariant: vehicle.variant,
          sectionId: "VEHICLE",
          sectionName: `${vehicle.name} Spezifikationen`,
          text: chunk.text,
          source: `data/leopard2-rag/vehicles/${vehicle.id}.json`,
          dataType: "vehicle" as const,
        },
      });
    }
  }

  return allChunks;
}

/** Chunk result type for internal use */
type ChunkResult = { text: string; metadata: InspectionChunkMetadata };

/** Build base metadata for a checkpoint */
function buildCheckpointMetadata(
  section: MaintenanceSection,
  checkpoint: MaintenanceSection["subsystems"][0],
): Partial<InspectionChunkMetadata> {
  return {
    vehicleType: "leopard2" as const,
    sectionId: section.id,
    sectionName: section.name,
    checkpointNumber: checkpoint.number,
    checkpointName: checkpoint.name,
    crewRole: checkpoint.responsible_role,
    estimatedTimeMin: checkpoint.estimated_time_min,
    vehicleVariant:
      checkpoint.vehicle_variants.length === 6
        ? undefined
        : checkpoint.vehicle_variants[0],
    source: `data/leopard2-rag/maintenance/sections/${section.id.toLowerCase()}.json`,
  };
}

/** Create base info chunks for a checkpoint */
async function createBaseChunks(
  section: MaintenanceSection,
  checkpoint: MaintenanceSection["subsystems"][0],
  baseMetadata: Partial<InspectionChunkMetadata>,
): Promise<ChunkResult[]> {
  const baseText = checkpointBaseToText(section, checkpoint);
  const baseDoc = MDocument.fromText(baseText);
  const chunks = await baseDoc.chunk({
    strategy: "recursive",
    ...CHUNK_CONFIG.checkpoint,
  });

  return chunks.map((chunk) => ({
    text: chunk.text,
    metadata: {
      ...baseMetadata,
      text: chunk.text,
      dataType: "checkpoint" as const,
    } as InspectionChunkMetadata,
  }));
}

/** Create task chunks for a checkpoint (when complex enough) */
async function createTaskChunks(
  section: MaintenanceSection,
  checkpoint: MaintenanceSection["subsystems"][0],
  baseMetadata: Partial<InspectionChunkMetadata>,
): Promise<ChunkResult[]> {
  const tasksText = checkpointTasksToText(section, checkpoint);
  if (!tasksText || tasksText.length <= 200) {
    return [];
  }

  const tasksDoc = MDocument.fromText(tasksText);
  const chunks = await tasksDoc.chunk({
    strategy: "recursive",
    ...CHUNK_CONFIG.checkpoint,
  });

  return chunks.map((chunk) => ({
    text: chunk.text,
    metadata: {
      ...baseMetadata,
      text: chunk.text,
      dataType: "checkpoint" as const,
    } as InspectionChunkMetadata,
  }));
}

/** Create defect chunks for a checkpoint */
function createDefectChunks(
  section: MaintenanceSection,
  checkpoint: MaintenanceSection["subsystems"][0],
  baseMetadata: Partial<InspectionChunkMetadata>,
): ChunkResult[] {
  const defectTexts = checkpointDefectsToText(section, checkpoint);
  return defectTexts.map((defectText) => ({
    text: defectText,
    metadata: {
      ...baseMetadata,
      text: defectText,
      dataType: "defect" as const,
    } as InspectionChunkMetadata,
  }));
}

/**
 * Prepare checkpoint chunks using MDocument with hierarchical splitting.
 * Creates separate chunks for:
 * - Base checkpoint info
 * - Tasks (when complex)
 * - Each defect indicator
 */
async function prepareCheckpointChunks(
  sections: MaintenanceSection[],
): Promise<ChunkResult[]> {
  const allChunks: ChunkResult[] = [];

  for (const section of sections) {
    for (const checkpoint of section.subsystems) {
      const baseMetadata = buildCheckpointMetadata(section, checkpoint);

      const baseChunks = await createBaseChunks(
        section,
        checkpoint,
        baseMetadata,
      );
      const taskChunks = await createTaskChunks(
        section,
        checkpoint,
        baseMetadata,
      );
      const defectChunks = createDefectChunks(
        section,
        checkpoint,
        baseMetadata,
      );

      allChunks.push(...baseChunks, ...taskChunks, ...defectChunks);
    }
  }

  return allChunks;
}

/**
 * Prepare component chunks using MDocument with hierarchical splitting.
 * Creates separate chunks for:
 * - Component specs (semantic text, not JSON)
 * - Each monitoring point
 * - Each failure mode
 */
async function prepareComponentChunks(
  components: Component[],
): Promise<{ text: string; metadata: InspectionChunkMetadata }[]> {
  const allChunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  for (const component of components) {
    // Base metadata shared by all chunks for this component
    const baseMetadata: Partial<InspectionChunkMetadata> = {
      vehicleType: "leopard2" as const,
      sectionId: component.category.toUpperCase(),
      sectionName: component.name,
      componentId: component.id,
      source: `data/leopard2-rag/components/${component.category}/${component.id}.json`,
    };

    // 1. Component specs as semantic text (not JSON.stringify)
    const specsText = componentSpecsToText(component);
    const specsDoc = MDocument.fromText(specsText);
    const specsChunks = await specsDoc.chunk({
      strategy: "recursive",
      ...CHUNK_CONFIG.component,
    });

    for (const chunk of specsChunks) {
      allChunks.push({
        text: chunk.text,
        metadata: {
          ...baseMetadata,
          text: chunk.text,
          dataType: "component" as const,
        } as InspectionChunkMetadata,
      });
    }

    // 2. Monitoring points as separate chunks
    const monitoringTexts = monitoringPointsToText(component);
    for (const text of monitoringTexts) {
      allChunks.push({
        text,
        metadata: {
          ...baseMetadata,
          text,
          dataType: "component" as const,
        } as InspectionChunkMetadata,
      });
    }

    // 3. Failures as separate chunks
    const failureTexts = componentFailuresToText(component);
    for (const text of failureTexts) {
      allChunks.push({
        text,
        metadata: {
          ...baseMetadata,
          text,
          dataType: "component" as const,
        } as InspectionChunkMetadata,
      });
    }
  }

  return allChunks;
}

/**
 * Prepare defect taxonomy chunks using MDocument.
 * Each priority level becomes a separate chunk.
 */
async function prepareDefectChunks(
  taxonomy: DefectTaxonomy | null,
): Promise<{ text: string; metadata: InspectionChunkMetadata }[]> {
  if (!taxonomy) return [];

  const allChunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  for (const priority of taxonomy.priorities) {
    const text = defectPriorityToText(priority);

    // Defect priorities are typically small, so we keep them as single chunks
    allChunks.push({
      text,
      metadata: {
        vehicleType: "leopard2" as const,
        sectionId: "DEFECT",
        sectionName: `Mangelpriorität ${priority.level}`,
        priority: priority.level,
        text,
        source: "data/leopard2-rag/defects/taxonomy.json",
        dataType: "defect" as const,
      },
    });
  }

  return allChunks;
}

/**
 * Prepare maintenance interval chunks using MDocument.
 */
async function prepareIntervalChunks(
  data: { intervals: MaintenanceInterval[] } | null,
): Promise<{ text: string; metadata: InspectionChunkMetadata }[]> {
  if (!data) return [];

  const allChunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  for (const interval of data.intervals) {
    const semanticText = maintenanceIntervalToText(interval);

    // Create MDocument and chunk
    const doc = MDocument.fromText(semanticText);
    const chunks = await doc.chunk({
      strategy: "recursive",
      ...CHUNK_CONFIG.interval,
    });

    for (const chunk of chunks) {
      allChunks.push({
        text: chunk.text,
        metadata: {
          vehicleType: "leopard2" as const,
          sectionId: "MAINTENANCE",
          sectionName: interval.name,
          maintenanceLevel: interval.level,
          text: chunk.text,
          source: "data/leopard2-rag/maintenance/intervals.json",
          dataType: "interval" as const,
        },
      });
    }
  }

  return allChunks;
}

// ============================================================================
// Main Seeding Function
// ============================================================================

/**
 * Main seeding function.
 * Loads data, converts to semantic text, chunks with MDocument, and upserts to vector store.
 */
async function seedInspectionData() {
  console.log("Starting inspection data seeding with MDocument chunking...\n");

  const allChunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  const dataDir = join(process.cwd(), "data", "leopard2-rag");
  console.log(`Loading structured JSON data from: ${dataDir}\n`);

  // Load and chunk vehicles
  console.log("Processing vehicle data with semantic conversion...");
  try {
    const vehicles = loadVehicleData(dataDir);
    const vehicleChunks = await prepareVehicleChunks(vehicles);
    allChunks.push(...vehicleChunks);
    console.log(
      `  ${vehicles.length} vehicles -> ${vehicleChunks.length} chunks`,
    );
  } catch (error) {
    console.warn(`  No vehicle data found: ${error}`);
  }

  // Load and chunk checkpoints (with hierarchical splitting)
  console.log("Processing checkpoints with hierarchical chunking...");
  try {
    const sections = loadMaintenanceSections(dataDir);
    const checkpointChunks = await prepareCheckpointChunks(sections);
    allChunks.push(...checkpointChunks);
    const totalCheckpoints = sections.reduce(
      (sum, s) => sum + s.subsystems.length,
      0,
    );
    console.log(
      `  ${sections.length} sections with ${totalCheckpoints} checkpoints -> ${checkpointChunks.length} chunks`,
    );
  } catch (error) {
    console.warn(`  No checkpoint data found: ${error}`);
  }

  // Load and chunk components (with semantic conversion)
  console.log("Processing components with semantic conversion...");
  try {
    const components = loadComponents(dataDir);
    const componentChunks = await prepareComponentChunks(components);
    allChunks.push(...componentChunks);
    console.log(
      `  ${components.length} components -> ${componentChunks.length} chunks`,
    );
  } catch (error) {
    console.warn(`  No component data found: ${error}`);
  }

  // Load and chunk defect taxonomy
  console.log("Processing defect taxonomy...");
  try {
    const taxonomy = loadDefectTaxonomy(dataDir);
    const defectChunks = await prepareDefectChunks(taxonomy);
    allChunks.push(...defectChunks);
    console.log(`  Loaded defect taxonomy -> ${defectChunks.length} chunks`);
  } catch (error) {
    console.warn(`  No defect data found: ${error}`);
  }

  // Load and chunk maintenance intervals
  console.log("Processing maintenance intervals...");
  try {
    const intervals = loadMaintenanceIntervals(dataDir);
    const intervalChunks = await prepareIntervalChunks(intervals);
    allChunks.push(...intervalChunks);
    console.log(
      `  Loaded maintenance intervals -> ${intervalChunks.length} chunks`,
    );
  } catch (error) {
    console.warn(`  No interval data found: ${error}`);
  }

  // Chunk size statistics
  const chunkSizes = allChunks.map((c) => c.text.length);
  const sizeStats = {
    min: Math.min(...chunkSizes),
    max: Math.max(...chunkSizes),
    avg: Math.round(
      chunkSizes.reduce((sum, s) => sum + s, 0) / chunkSizes.length,
    ),
  };
  console.log(`\nChunk size statistics:`);
  console.log(`  Min: ${sizeStats.min} chars`);
  console.log(`  Max: ${sizeStats.max} chars`);
  console.log(`  Avg: ${sizeStats.avg} chars`);

  console.log(`\nTotal structured data chunks: ${allChunks.length}\n`);

  if (allChunks.length === 0) {
    console.error("No data found to seed. Please add JSON data files.");
    process.exit(1);
  }

  // Generate embeddings using Mastra's ModelRouterEmbeddingModel
  console.log(`Generating embeddings with ${EMBEDDING_MODEL_ID}...`);
  console.log("  This may take a moment...\n");

  try {
    const { embeddings } = await embedMany({
      model: getEmbeddingModel(),
      values: allChunks.map((chunk) => chunk.text),
    });
    console.log(`  Generated ${embeddings.length} embeddings\n`);

    // Initialize vector store and create index
    console.log("Initializing vector store...");
    const vectorStore = getVectorStore();

    console.log(`  Creating index: ${INSPECTION_INDEX_CONFIG.indexName}`);
    await vectorStore.createIndex({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      dimension: INSPECTION_INDEX_CONFIG.dimension,
      metric: INSPECTION_INDEX_CONFIG.metric,
    });

    // Clear existing data before inserting new embeddings
    console.log("  Clearing existing embeddings...");
    await vectorStore.truncateIndex({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
    });
    console.log("  Index ready (cleared)\n");

    // Upsert embeddings
    console.log("Upserting embeddings to vector store...");
    await vectorStore.upsert({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      vectors: embeddings,
      metadata: allChunks.map((chunk) => chunk.metadata),
    });
    console.log(`  Upserted ${embeddings.length} vectors\n`);

    // Cleanup and summary
    await vectorStore.disconnect?.();

    console.log("Seeding complete!\n");
    console.log("Summary:");

    // Count by data type
    const byType = allChunks.reduce(
      (acc, chunk) => {
        acc[chunk.metadata.dataType] = (acc[chunk.metadata.dataType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} chunks`);
    });

    console.log(`\n  Total: ${allChunks.length} chunks indexed`);
  } catch (error) {
    console.error("Failed to generate embeddings or upsert:", error);
    process.exit(1);
  }
}

// Run the seeding script (async IIFE required - tsx doesn't support top-level await)
// NOSONAR: S7785 - top-level await not supported by tsx bundler
(async () => {
  try {
    await seedInspectionData();
  } catch (error) {
    console.error("Seed script failed:", error);
    process.exit(1);
  }
})();
