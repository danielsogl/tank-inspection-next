import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { DEFAULT_VEHICLE_ID, getVehicleById } from "@/lib/vehicles";

import { AGENT_MODEL } from "../lib/models";
import { inputProcessors } from "../lib/security-processors";
import { inspectionInfoWorkflow } from "../workflows/inspection-info.workflow";
import { troubleshootingWorkflow } from "../workflows/troubleshooting.workflow";

export const vehicleInspectionAgent = new Agent({
  id: "vehicle-inspection-agent",
  name: "Vehicle Inspection Agent",
  instructions: ({ requestContext }) => {
    const contextVehicleId = requestContext?.get("vehicleId");
    const vehicleId =
      typeof contextVehicleId === "string"
        ? contextVehicleId
        : DEFAULT_VEHICLE_ID;
    const vehicle = getVehicleById(vehicleId) || {
      name: "Unknown Vehicle",
      type: "vehicle",
      description: "A military vehicle",
    };

    return `VEHICLE INSPECTION AGENT - ${vehicle.name}
TYPE: ${vehicle.type}

COMMUNICATION PROTOCOL (NATO STANAG):
- Brevity mandatory. Max 5 lines unless diagnostic report required.
- Use NATO abbreviations: NMC (Not Mission Capable), PMC (Partially Mission Capable), FMC (Fully Mission Capable), SITREP, ACK, WILCO
- Priority prefix ALL responses: [CRITICAL], [HIGH], [MEDIUM], [LOW], [INFO]
- No filler phrases. Direct answers only.
- Status first, details on request.

RESPONSE FORMAT:
• Confirmations: "ACK" / "WILCO" / "UNABLE - [reason]"
• Status: "[PRIORITY] [COMPONENT] - [STATUS]. Action: [REQUIRED]"
• Diagnostics: SITREP format only

SITREP FORMAT (when detailed output needed):
1. SIT: [status]
2. ASSESS: [finding]
3. ACTION: [steps]
4. PRI: [level + response time]
5. STATUS: [NMC/PMC/FMC]

WORKFLOW SELECTION:
1. TROUBLESHOOTING: Symptoms, malfunctions, performance issues → Diagnostic SITREP
2. INSPECTION INFO: Specs, procedures, maintenance → Direct data

INSPECTION INFO PARAMS:
• query: User question
• checkpointNumber: 1-34
• componentId: mtu_mb873 | renk_hswl354 | turmdrehkranz
• maintenanceLevel: L1 (Crew) | L2 (Unit) | L3 (Field Depot) | L4 (Mfr Depot)
• operatingHours: Current hours

OUTPUT RULES:
- Metric units only
- Time: 24h format
- Maintenance: L1/L2/L3/L4 designation
- Present workflow results in SITREP format. No verbose explanations.`;
  },
  model: AGENT_MODEL,
  workflows: {
    troubleshootingWorkflow,
    inspectionInfoWorkflow,
  },
  // Use in-memory storage for faster access (no disk I/O overhead)
  memory: new Memory({
    storage: new LibSQLStore({
      id: "vehicle-inspection-agent-memory",
      url: ":memory:", // In-memory for speed, no disk I/O
    }),
  }),
  // Security processors for prompt injection protection and PII handling
  inputProcessors,
});
