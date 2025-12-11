/**
 * Seed script for populating the vector database with inspection data.
 *
 * This script:
 * 1. Reads structured JSON data from data/leopard2-rag/
 * 2. Parses data into structured chunks with metadata
 * 3. Generates embeddings using Mastra's ModelRouterEmbeddingModel
 * 4. Upserts the chunks into the Supabase pgvector database
 *
 * Run with: npx tsx src/mastra/scripts/seed-inspection-data.ts
 */

// Load environment variables from .env file
import 'dotenv/config';

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { embedMany } from 'ai';
import { getVectorStore, INSPECTION_INDEX_CONFIG } from '../lib/vector';
import { getEmbeddingModel, EMBEDDING_MODEL_ID } from '../lib/models';
import type {
  VehicleData,
  MaintenanceSection,
  Component,
  DefectTaxonomy,
  MaintenanceInterval,
  InspectionChunkMetadata,
} from '../types/rag-data.types';

/**
 * Load all vehicle data files.
 */
function loadVehicleData(dataDir: string): VehicleData[] {
  const vehiclesDir = join(dataDir, 'vehicles');
  const files = readdirSync(vehiclesDir).filter((f) => f.endsWith('.json'));

  return files.map((file) => {
    const content = readFileSync(join(vehiclesDir, file), 'utf-8');
    return JSON.parse(content) as VehicleData;
  });
}

/**
 * Load all maintenance sections with checkpoints.
 */
function loadMaintenanceSections(dataDir: string): MaintenanceSection[] {
  const sectionsDir = join(dataDir, 'maintenance', 'sections');
  const files = readdirSync(sectionsDir).filter((f) => f.endsWith('.json'));

  return files.map((file) => {
    const content = readFileSync(join(sectionsDir, file), 'utf-8');
    return JSON.parse(content) as MaintenanceSection;
  });
}

/**
 * Load all component data.
 */
function loadComponents(dataDir: string): Component[] {
  const componentsDir = join(dataDir, 'components');
  const components: Component[] = [];

  function loadFromDir(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        loadFromDir(fullPath);
      } else if (entry.endsWith('.json')) {
        const content = readFileSync(fullPath, 'utf-8');
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
    const content = readFileSync(join(dataDir, 'defects', 'taxonomy.json'), 'utf-8');
    return JSON.parse(content) as DefectTaxonomy;
  } catch {
    return null;
  }
}

/**
 * Load maintenance intervals.
 */
function loadMaintenanceIntervals(dataDir: string): { intervals: MaintenanceInterval[] } | null {
  try {
    const content = readFileSync(join(dataDir, 'maintenance', 'intervals.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Prepare vehicle data chunks for embedding.
 */
function prepareVehicleChunks(
  vehicles: VehicleData[],
): { text: string; metadata: InspectionChunkMetadata }[] {
  return vehicles.map((vehicle) => {
    const text = `
Fahrzeug: ${vehicle.name}
Variante: ${vehicle.variant}
Hersteller: ${vehicle.manufacturer}
Baujahr: ${vehicle.in_service_since}

Technische Daten:
- Gewicht: ${vehicle.specs.weight_tons} Tonnen
- Besatzung: ${vehicle.specs.crew} Personen
- Motor: ${vehicle.specs.engine.model}, ${vehicle.specs.engine.power_hp} PS (${vehicle.specs.engine.power_kw} kW)
- Getriebe: ${vehicle.specs.transmission.model}, ${vehicle.specs.transmission.gears_forward} Vorwärtsgänge
- Hauptbewaffnung: ${vehicle.specs.armament.main_gun.model}, ${vehicle.specs.armament.main_gun.caliber_mm}mm
- Höchstgeschwindigkeit: ${vehicle.specs.max_speed_kmh} km/h
- Reichweite: ${vehicle.specs.range_km} km

${vehicle.notes || ''}
`.trim();

    return {
      text,
      metadata: {
        vehicleType: 'leopard2' as const,
        vehicleVariant: vehicle.variant,
        sectionId: 'VEHICLE',
        sectionName: `${vehicle.name} Spezifikationen`,
        text,
        source: `data/leopard2-rag/vehicles/${vehicle.id}.json`,
        dataType: 'vehicle' as const,
      },
    };
  });
}

/**
 * Prepare checkpoint chunks for embedding.
 */
function prepareCheckpointChunks(
  sections: MaintenanceSection[],
): { text: string; metadata: InspectionChunkMetadata }[] {
  const chunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  for (const section of sections) {
    for (const checkpoint of section.subsystems) {
      let text = `
Sektion ${section.id}: ${section.name}
Checkpoint ${checkpoint.number}: ${checkpoint.name}

Beschreibung: ${checkpoint.description}
Typ: ${checkpoint.type}
Erwarteter Wert: ${typeof checkpoint.expected_value === 'string' ? checkpoint.expected_value : checkpoint.expected_value.description}
Werkzeuge: ${checkpoint.tools_required.join(', ') || 'Keine'}
Geschätzte Zeit: ${checkpoint.estimated_time_min} Minuten
Foto erforderlich: ${checkpoint.photo_required ? 'Ja' : 'Nein'}
Verantwortlich: ${checkpoint.responsible_role}
Varianten: ${checkpoint.vehicle_variants.join(', ')}
`.trim();

      if (checkpoint.tasks && checkpoint.tasks.length > 0) {
        text += '\n\nSchritte:\n';
        checkpoint.tasks.forEach((task) => {
          text += `${task.step}. ${task.description}\n`;
          if (task.details) text += `   ${task.details}\n`;
        });
      }

      if (checkpoint.common_defects && checkpoint.common_defects.length > 0) {
        text += '\n\nHäufige Mängel:\n';
        checkpoint.common_defects.forEach((defect) => {
          text += `- ${defect.description} (${defect.priority}): ${defect.action}\n`;
        });
      }

      chunks.push({
        text,
        metadata: {
          vehicleType: 'leopard2' as const,
          sectionId: section.id,
          sectionName: section.name,
          checkpointNumber: checkpoint.number,
          checkpointName: checkpoint.name,
          crewRole: checkpoint.responsible_role,
          estimatedTimeMin: checkpoint.estimated_time_min,
          vehicleVariant:
            checkpoint.vehicle_variants.length === 6 ? undefined : checkpoint.vehicle_variants[0],
          text,
          source: `data/leopard2-rag/maintenance/sections/${section.id.toLowerCase()}.json`,
          dataType: 'checkpoint' as const,
        },
      });
    }
  }

  return chunks;
}

/**
 * Prepare component chunks for embedding.
 */
function prepareComponentChunks(
  components: Component[],
): { text: string; metadata: InspectionChunkMetadata }[] {
  return components.map((component) => {
    let text = `
Komponente: ${component.name}
ID: ${component.id}
Kategorie: ${component.category}

Spezifikationen:
${JSON.stringify(component.specs, null, 2)}
`.trim();

    if (component.monitoring_points && component.monitoring_points.length > 0) {
      text += '\n\nÜberwachungsparameter:\n';
      component.monitoring_points.forEach((point) => {
        text += `- ${point.name}: ${point.normal_range.min || '-'} bis ${point.normal_range.max || '-'} ${point.unit}\n`;
        if (point.critical_threshold) {
          text += `  Kritischer Grenzwert: ${point.critical_threshold.min || '-'} / ${point.critical_threshold.max || '-'} ${point.unit}\n`;
        }
      });
    }

    if (component.common_failures && component.common_failures.length > 0) {
      text += '\n\nHäufige Ausfälle:\n';
      component.common_failures.forEach((failure) => {
        text += `- ${failure.name} (MTBF: ${failure.mtbf_hours || 'unbekannt'}h)\n`;
        text += `  Symptome: ${failure.symptoms.join(', ')}\n`;
      });
    }

    return {
      text,
      metadata: {
        vehicleType: 'leopard2' as const,
        sectionId: component.category.toUpperCase(),
        sectionName: component.name,
        componentId: component.id,
        text,
        source: `data/leopard2-rag/components/${component.id}.json`,
        dataType: 'component' as const,
      },
    };
  });
}

/**
 * Prepare defect taxonomy chunks for embedding.
 */
function prepareDefectChunks(
  taxonomy: DefectTaxonomy | null,
): { text: string; metadata: InspectionChunkMetadata }[] {
  if (!taxonomy) return [];

  return taxonomy.priorities.map((priority) => {
    const text = `
Mangelpriorität: ${priority.name_de} (${priority.name_en})
Level: ${priority.level}

Reaktionszeit: ${priority.response_time}
Fahrzeugstatus: ${priority.vehicle_status}
Eskalation: ${priority.escalation}

Beispiele:
${priority.examples.map((ex) => `- ${ex}`).join('\n')}

Keywords: ${priority.keywords.join(', ')}
`.trim();

    return {
      text,
      metadata: {
        vehicleType: 'leopard2' as const,
        sectionId: 'DEFECT',
        sectionName: `Mangelpriorität ${priority.level}`,
        priority: priority.level,
        text,
        source: 'data/leopard2-rag/defects/taxonomy.json',
        dataType: 'defect' as const,
      },
    };
  });
}

/**
 * Prepare maintenance interval chunks for embedding.
 */
function prepareIntervalChunks(
  data: { intervals: MaintenanceInterval[] } | null,
): { text: string; metadata: InspectionChunkMetadata }[] {
  if (!data) return [];

  return data.intervals.map((interval) => {
    const text = `
Wartungsintervall: ${interval.name}
Level: ${interval.level}
Ausführung: ${interval.executor}
Dauer: ${interval.duration}

Trigger: ${interval.trigger.type} = ${interval.trigger.value} ${interval.trigger.unit || ''}

Aufgaben:
${interval.tasks.map((task) => `- ${task}`).join('\n')}

${interval.notes || ''}
`.trim();

    return {
      text,
      metadata: {
        vehicleType: 'leopard2' as const,
        sectionId: 'MAINTENANCE',
        sectionName: interval.name,
        maintenanceLevel: interval.level,
        text,
        source: 'data/leopard2-rag/maintenance/intervals.json',
        dataType: 'interval' as const,
      },
    };
  });
}

/**
 * Main seeding function.
 */
async function seedInspectionData() {
  console.log('Starting inspection data seeding...\n');

  const allChunks: { text: string; metadata: InspectionChunkMetadata }[] = [];

  const dataDir = join(process.cwd(), 'data', 'leopard2-rag');
  console.log(`Loading structured JSON data from: ${dataDir}\n`);

  // Load vehicles
  console.log('Loading vehicle data...');
  try {
    const vehicles = loadVehicleData(dataDir);
    const vehicleChunks = prepareVehicleChunks(vehicles);
    allChunks.push(...vehicleChunks);
    console.log(`  Loaded ${vehicles.length} vehicles (${vehicleChunks.length} chunks)`);
  } catch (error) {
    console.warn(`  No vehicle data found: ${error}`);
  }

  // Load maintenance sections & checkpoints
  console.log('Loading maintenance checkpoints...');
  try {
    const sections = loadMaintenanceSections(dataDir);
    const checkpointChunks = prepareCheckpointChunks(sections);
    allChunks.push(...checkpointChunks);
    const totalCheckpoints = sections.reduce((sum, s) => sum + s.subsystems.length, 0);
    console.log(
      `  Loaded ${sections.length} sections with ${totalCheckpoints} checkpoints (${checkpointChunks.length} chunks)`,
    );
  } catch (error) {
    console.warn(`  No checkpoint data found: ${error}`);
  }

  // Load components
  console.log('Loading component data...');
  try {
    const components = loadComponents(dataDir);
    const componentChunks = prepareComponentChunks(components);
    allChunks.push(...componentChunks);
    console.log(`  Loaded ${components.length} components (${componentChunks.length} chunks)`);
  } catch (error) {
    console.warn(`  No component data found: ${error}`);
  }

  // Load defect taxonomy
  console.log('Loading defect taxonomy...');
  try {
    const taxonomy = loadDefectTaxonomy(dataDir);
    const defectChunks = prepareDefectChunks(taxonomy);
    allChunks.push(...defectChunks);
    console.log(`  Loaded defect taxonomy (${defectChunks.length} chunks)`);
  } catch (error) {
    console.warn(`  No defect data found: ${error}`);
  }

  // Load maintenance intervals
  console.log('Loading maintenance intervals...');
  try {
    const intervals = loadMaintenanceIntervals(dataDir);
    const intervalChunks = prepareIntervalChunks(intervals);
    allChunks.push(...intervalChunks);
    console.log(`  Loaded maintenance intervals (${intervalChunks.length} chunks)`);
  } catch (error) {
    console.warn(`  No interval data found: ${error}`);
  }

  console.log(`\nTotal structured data chunks: ${allChunks.length}\n`);

  if (allChunks.length === 0) {
    console.error('No data found to seed. Please add JSON data files.');
    process.exit(1);
  }

  // Generate embeddings using Mastra's ModelRouterEmbeddingModel
  console.log(`Generating embeddings with ${EMBEDDING_MODEL_ID}...`);
  console.log('  This may take a moment...\n');

  try {
    const { embeddings } = await embedMany({
      model: getEmbeddingModel(),
      values: allChunks.map((chunk) => chunk.text),
    });
    console.log(`  Generated ${embeddings.length} embeddings\n`);

    // Initialize vector store and create index
    console.log('Initializing vector store...');
    const vectorStore = getVectorStore();

    console.log(`  Creating index: ${INSPECTION_INDEX_CONFIG.indexName}`);
    await vectorStore.createIndex({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      dimension: INSPECTION_INDEX_CONFIG.dimension,
      metric: INSPECTION_INDEX_CONFIG.metric,
    });
    console.log('  Index ready\n');

    // Upsert embeddings
    console.log('Upserting embeddings to vector store...');
    await vectorStore.upsert({
      indexName: INSPECTION_INDEX_CONFIG.indexName,
      vectors: embeddings,
      metadata: allChunks.map((chunk) => chunk.metadata),
    });
    console.log(`  Upserted ${embeddings.length} vectors\n`);

    // Cleanup and summary
    await vectorStore.disconnect?.();

    console.log('Seeding complete!\n');
    console.log('Summary:');

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
    console.error('Failed to generate embeddings or upsert:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedInspectionData().catch(console.error);
