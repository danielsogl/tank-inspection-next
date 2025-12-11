import { ModelRouterLanguageModel } from "@mastra/core/llm";
import { createTool } from "@mastra/core/tools";
import { MastraAgentRelevanceScorer, rerankWithScorer } from "@mastra/rag";
import { z } from "zod";
import { getCachedEmbedding, ragQueryCache } from "../lib/cache";
import { AGENT_MODEL_MINI } from "../lib/models";
import {
  getVectorStore,
  INSPECTION_INDEX_CONFIG,
  type InspectionChunkMetadata,
} from "../lib/vector";
import { mapToRagVehicleType } from "../lib/vehicle-mapping";

/**
 * Default minimum similarity score for filtering low-quality results.
 */
const DEFAULT_MIN_SCORE = 0.5;

/**
 * Tool for querying the inspection vector database.
 *
 * This tool allows agents to search for relevant inspection information
 * based on semantic similarity to the query, with advanced filtering options.
 */
export const queryInspectionTool = createTool({
  id: "query-inspection",
  description: `Search the inspection database for relevant checkpoint information with advanced filtering.
Use this tool to find specific inspection procedures, specifications, thresholds,
and maintenance instructions for vehicle checkpoints.

The vehicle type is automatically determined from the current inspection context.

The tool supports additional filtering by:
- Vehicle variant (A4, A5, A6, A6M, A7, A7V)
- Crew role (driver, commander, gunner, loader)
- Maintenance level (L1, L2, L3, L4)
- Defect priority (critical, high, medium, low, info)
- Component ID (e.g., mtu_mb873, renk_hswl354)
- Data type (vehicle, checkpoint, component, defect, interval)

The tool returns the most relevant information based on semantic similarity and filters.`,
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query to find relevant inspection information"),
    vehicleVariant: z
      .enum(["A4", "A5", "A6", "A6M", "A7", "A7V"])
      .optional()
      .describe("Filter results by Leopard 2 variant (e.g., A6, A7V)"),
    crewRole: z
      .enum(["driver", "commander", "gunner", "loader"])
      .optional()
      .describe("Filter results by crew role responsible for the checkpoint"),
    maintenanceLevel: z
      .enum(["L1", "L2", "L3", "L4"])
      .optional()
      .describe(
        "Filter results by NATO maintenance level (L1=crew, L2=unit, L3=depot, L4=manufacturer)",
      ),
    priority: z
      .enum(["critical", "high", "medium", "low", "info"])
      .optional()
      .describe("Filter results by defect priority level"),
    componentId: z
      .string()
      .optional()
      .describe(
        "Filter results by specific component ID (e.g., mtu_mb873 for engine)",
      ),
    dataType: z
      .enum([
        "vehicle",
        "checkpoint",
        "component",
        "defect",
        "interval",
        "legacy",
      ])
      .optional()
      .describe("Filter results by data type"),
    topK: z
      .number()
      .optional()
      .default(5)
      .describe("Number of results to return (default: 5)"),
    minScore: z
      .number()
      .optional()
      .default(DEFAULT_MIN_SCORE)
      .describe(
        "Minimum similarity score threshold (0-1). Results below this score are filtered out.",
      ),
    useReranking: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Enable re-ranking for improved result relevance. Uses semantic analysis to reorder results.",
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        checkpointNumber: z.number().optional(),
        checkpointName: z.string().optional(),
        sectionName: z.string().optional(),
        sectionId: z.string(),
        vehicleType: z.string(),
        vehicleVariant: z.string().optional(),
        crewRole: z.string().optional(),
        maintenanceLevel: z.string().optional(),
        componentId: z.string().optional(),
        priority: z.string().optional(),
        estimatedTimeMin: z.number().optional(),
        dataType: z.string(),
        content: z.string(),
        score: z.number(),
      }),
    ),
    totalFound: z.number(),
  }),
  execute: async (inputData, context) => {
    const {
      query,
      vehicleVariant,
      crewRole,
      maintenanceLevel,
      priority,
      componentId,
      dataType,
      topK,
      minScore,
      useReranking,
    } = inputData;

    // Get vehicleId from context and map to RAG vehicle type
    const vehicleId =
      (context?.requestContext?.get("vehicleId") as string) || "leopard2";
    const vehicleType = mapToRagVehicleType(vehicleId);

    // Build filter object using spread operator for clean conditionals
    const filter = {
      vehicleType,
      ...(vehicleVariant && { vehicleVariant }),
      ...(crewRole && { crewRole }),
      ...(maintenanceLevel && { maintenanceLevel }),
      ...(priority && { priority }),
      ...(componentId && { componentId }),
      ...(dataType && { dataType }),
    };

    // Check cache first (include all parameters in cache key)
    const cacheKey = ragQueryCache.generateKey(query, {
      ...filter,
      topK,
      minScore,
      useReranking,
    });
    const cachedResult = ragQueryCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult as {
        results: {
          checkpointNumber?: number;
          checkpointName?: string;
          sectionName?: string;
          sectionId: string;
          vehicleType: string;
          vehicleVariant?: string;
          crewRole?: string;
          maintenanceLevel?: string;
          componentId?: string;
          priority?: string;
          estimatedTimeMin?: number;
          dataType: string;
          content: string;
          score: number;
        }[];
        totalFound: number;
      };
    }

    // Generate embedding for the query (cached)
    const queryEmbedding = await getCachedEmbedding(query);

    // Get singleton vector store (connection pooled)
    const vectorStore = getVectorStore();

    // Query the vector store with increased topK when re-ranking is enabled
    // (we fetch more results initially to have a better pool for re-ranking)
    const fetchTopK = useReranking ? Math.max(topK * 3, 15) : topK;

    const queryResults = await vectorStore.query({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      queryVector: queryEmbedding,
      topK: fetchTopK,
      filter:
        Object.keys(filter).length > 0
          ? (filter as Record<string, string | number | boolean>)
          : undefined,
      includeVector: false,
    });

    // Filter results by minimum score threshold
    let filteredResults = queryResults.filter(
      (result) => (result.score ?? 0) >= minScore,
    );

    // Apply re-ranking if enabled
    if (useReranking && filteredResults.length > 0) {
      const rerankModel = new ModelRouterLanguageModel(AGENT_MODEL_MINI);
      const scorer = new MastraAgentRelevanceScorer(
        "inspection-reranker",
        rerankModel,
      );

      const rerankedResults = await rerankWithScorer({
        results: filteredResults,
        query,
        scorer,
        options: {
          weights: {
            semantic: 0.5,
            vector: 0.3,
            position: 0.2,
          },
          topK,
        },
      });

      // Extract the original results from re-ranked output
      filteredResults = rerankedResults.map((r) => r.result);
    } else {
      // Limit to topK if not re-ranking
      filteredResults = filteredResults.slice(0, topK);
    }

    // Transform results
    const results = filteredResults.map((result) => {
      const metadata = result.metadata as InspectionChunkMetadata;
      return {
        checkpointNumber: metadata.checkpointNumber,
        checkpointName: metadata.checkpointName,
        sectionName: metadata.sectionName,
        sectionId: metadata.sectionId,
        vehicleType: metadata.vehicleType,
        vehicleVariant: metadata.vehicleVariant,
        crewRole: metadata.crewRole,
        maintenanceLevel: metadata.maintenanceLevel,
        componentId: metadata.componentId,
        priority: metadata.priority,
        estimatedTimeMin: metadata.estimatedTimeMin,
        dataType: metadata.dataType,
        content: metadata.text,
        score: result.score ?? 0,
      };
    });

    const response = {
      results,
      totalFound: results.length,
    };

    // Cache the result
    ragQueryCache.set(cacheKey, response);

    return response;
  },
});

/**
 * Tool for getting checkpoint details by number.
 * Vehicle type is automatically determined from the current inspection context.
 */
export const getCheckpointTool = createTool({
  id: "get-checkpoint",
  description: `Get detailed information about a specific checkpoint by its number.
Use this when you know the exact checkpoint number. The vehicle type is automatically
determined from the current inspection context.`,
  inputSchema: z.object({
    checkpointNumber: z
      .number()
      .describe("The checkpoint number (1-34 for Leopard 2, 1-34 for M1A2)"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    checkpoint: z
      .object({
        checkpointNumber: z.number(),
        sectionName: z.string().optional(),
        checkpointName: z.string().optional(),
        sectionId: z.string(),
        vehicleType: z.string(),
        role: z.string().optional(),
        content: z.string(),
      })
      .optional(),
  }),
  execute: async (inputData, context) => {
    const { checkpointNumber } = inputData;

    // Get vehicleId from context and map to RAG vehicle type
    const vehicleId =
      (context?.requestContext?.get("vehicleId") as string) || "leopard2";
    const vehicleType = mapToRagVehicleType(vehicleId);

    const query = `checkpoint ${checkpointNumber} ${vehicleType}`;

    // Use cached embedding
    const queryEmbedding = await getCachedEmbedding(query);

    // Get singleton vector store
    const vectorStore = getVectorStore();

    const queryResults = await vectorStore.query({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      queryVector: queryEmbedding,
      topK: 5,
      filter: {
        vehicleType,
        checkpointNumber,
      },
      includeVector: false,
    });

    const exactMatch = queryResults.find((result) => {
      const metadata = result.metadata as InspectionChunkMetadata;
      return (
        metadata.checkpointNumber === checkpointNumber &&
        metadata.vehicleType === vehicleType
      );
    });

    if (exactMatch) {
      const metadata = exactMatch.metadata as InspectionChunkMetadata;
      return {
        found: true,
        checkpoint: {
          checkpointNumber: metadata.checkpointNumber!,
          sectionName: metadata.sectionName,
          checkpointName: metadata.checkpointName,
          sectionId: metadata.sectionId,
          vehicleType: metadata.vehicleType,
          role: metadata.crewRole,
          content: metadata.text,
        },
      };
    }

    return {
      found: false,
      checkpoint: undefined,
    };
  },
});
