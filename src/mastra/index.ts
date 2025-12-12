import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { Observability } from "@mastra/observability";
import { PgVector } from "@mastra/pg";
import { vehicleInspectionAgent } from "./agents/vehicle-inspection-agent";
import { SecurityAwareLogger } from "./lib/security-logger";
import { INSPECTION_INDEX_CONFIG } from "./lib/vector";
import { troubleshootingWorkflow } from "./workflows";

// Only create vector store if SUPABASE_DB_URL is configured
const vectors = process.env.SUPABASE_DB_URL
  ? {
      inspectionVectors: new PgVector({
        id: "inspection-vectors",
        connectionString: process.env.SUPABASE_DB_URL,
      }),
    }
  : undefined;

export const mastra = new Mastra({
  agents: { vehicleInspectionAgent },
  workflows: { troubleshootingWorkflow },
  storage: new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  vectors,
  logger: new SecurityAwareLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    // Enables DefaultExporter and CloudExporter for tracing
    default: { enabled: true },
  }),
});

// Export vector index config for reference
export { INSPECTION_INDEX_CONFIG };
