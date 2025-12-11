import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getCachedEmbedding } from "../lib/cache";
import {
  getVectorStore,
  INSPECTION_INDEX_CONFIG,
  type InspectionChunkMetadata,
} from "../lib/vector";

/**
 * Tool for querying component details from the RAG database.
 * Returns semantic text chunks containing component information.
 */
export const getComponentDetailsTool = createTool({
  id: "get-component-details",
  description: `Get detailed information about a specific vehicle component.

This tool retrieves component knowledge including:
- Technical specifications (power, torque, dimensions, etc.)
- Monitoring points with normal ranges and critical thresholds
- Common failures with symptoms and causes
- Diagnostic information

Available component IDs:
- mtu_mb873: MTU MB 873 Ka-501 V12 Diesel Engine (Leopard 2)
- renk_hswl354: RENK HSWL 354 Automatic Transmission (Leopard 2)
- turmdrehkranz: Turret ring and rotation system

Use this tool when the user asks about:
- Component specifications or technical details
- Monitoring parameters and thresholds
- Common failures and troubleshooting`,
  inputSchema: z.object({
    componentId: z
      .string()
      .describe(
        'The component ID to get details for (e.g., "mtu_mb873", "renk_hswl354", "turmdrehkranz")',
      ),
    topK: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of relevant chunks to return"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    componentId: z.string(),
    chunks: z.array(
      z.object({
        content: z.string(),
        category: z.string().optional(),
        score: z.number(),
      }),
    ),
    totalChunks: z.number(),
  }),
  execute: async (inputData) => {
    const { componentId, topK } = inputData;

    // Use cached embedding with component-specific query
    const queryEmbedding = await getCachedEmbedding(
      `Komponente ${componentId} technische Daten Spezifikationen Wartung Überwachung Ausfälle`,
    );

    // Get singleton vector store
    const vectorStore = getVectorStore();

    // Query for all chunks related to this component
    const queryResults = await vectorStore.query({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      queryVector: queryEmbedding,
      topK,
      filter: {
        componentId,
      },
      includeVector: false,
    });

    if (queryResults.length === 0) {
      return {
        found: false,
        componentId,
        chunks: [],
        totalChunks: 0,
      };
    }

    // Transform results - return semantic text chunks
    const chunks = queryResults.map((result) => {
      const metadata = result.metadata as InspectionChunkMetadata;
      return {
        content: metadata.text,
        category: metadata.sectionId,
        score: result.score ?? 0,
      };
    });

    return {
      found: true,
      componentId,
      chunks,
      totalChunks: chunks.length,
    };
  },
});
