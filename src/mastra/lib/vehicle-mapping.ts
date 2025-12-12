/**
 * Vehicle type mapping utility
 *
 * Maps frontend vehicle IDs to RAG vehicleType values used in the vector store.
 */

// RAG vehicle types used in the vector store metadata
export type RagVehicleType = "leopard2" | "m1a2";

// Map frontend vehicle IDs to RAG vehicleType values
export const VEHICLE_TYPE_MAP: Record<string, RagVehicleType> = {
  leopard2: "leopard2",
  "m1-abrams": "m1a2",
};

/**
 * Maps a frontend vehicle ID to the corresponding RAG vehicle type.
 * Falls back to 'leopard2' if the vehicle ID is not found.
 *
 * @param vehicleId - The frontend vehicle ID (e.g., 'leopard2', 'm1-abrams')
 * @returns The RAG vehicle type (e.g., 'leopard2', 'm1a2')
 */
export function mapToRagVehicleType(vehicleId: string): RagVehicleType {
  return VEHICLE_TYPE_MAP[vehicleId] || "leopard2";
}
