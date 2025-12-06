import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability } from '@mastra/observability';
import { PgVector } from '@mastra/pg';
import { leopard2Agent } from './agents/leopard2-agent';
import { m1AbramsAgent } from './agents/m1-abrams-agent';
import { INSPECTION_INDEX_CONFIG } from './lib/vector';

// Only create vector store if SUPABASE_DB_URL is configured
const vectors = process.env.SUPABASE_DB_URL
  ? {
      inspectionVectors: new PgVector({
        id: 'inspection-vectors',
        connectionString: process.env.SUPABASE_DB_URL,
      }),
    }
  : undefined;

export const mastra = new Mastra({
  agents: { leopard2Agent, m1AbramsAgent },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    // Persistent storage for conversation history and observability data
    url: 'file:../mastra.db',
  }),
  vectors,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    // Enables DefaultExporter and CloudExporter for tracing
    default: { enabled: true },
  }),
});

// Export vector index config for reference
export { INSPECTION_INDEX_CONFIG };
