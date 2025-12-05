import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Maintenance intervals based on NATO AJP-4 and MTU maintenance concept.
 */
const MAINTENANCE_INTERVALS = [
  {
    id: 'L1-DAILY',
    level: 'L1' as const,
    name: 'Tägliche Wartung (vor/nach Betrieb)',
    executor: 'crew',
    trigger: {
      type: 'event' as const,
      value: 'before_after_operation',
    },
    duration: '30 Minuten',
    tasks: [
      'Motorölstand prüfen',
      'Kühlmittelstand prüfen',
      'Kraftstoffstand prüfen',
      'Ketten auf Spannung und Beschädigungen prüfen',
      'Laufrollen Sichtprüfung',
      'Beleuchtung funktionsfähig',
      'Feuerlöschanlage Druck prüfen',
      'Batteriezustand prüfen',
      'Funktionstests durchführen',
    ],
    sections: ['A', 'B', 'F'],
    notes: 'Vor jeder Ausfahrt und nach Rückkehr durchzuführen. Basis für Einsatzbereitschaft.',
  },
  {
    id: 'L1-WEEKLY',
    level: 'L1' as const,
    name: 'Wöchentliche Wartung',
    executor: 'crew',
    trigger: {
      type: 'calendar' as const,
      value: 7,
      unit: 'days',
    },
    duration: '60 Minuten',
    tasks: [
      'Alle Prüfpunkte der täglichen Wartung',
      'Luftfilter Vorabscheider leeren',
      'Kraftstofffilter Wasserabscheider prüfen',
      'Getriebeölstand prüfen',
      'Turmdrehkranz schmieren (12 Punkte)',
      'Waffenreinigung',
      'Munitionslagerung kontrollieren',
      'Elektronik Selbsttests',
      'NBC-Schutzanlage testen',
      'Erste-Hilfe-Material prüfen',
    ],
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    notes: 'Erweiterte Prüfung aller Systeme. Besatzung arbeitet als Team.',
  },
  {
    id: 'L2-250H',
    level: 'L2' as const,
    name: '250-Stunden Wartung (Ölwechsel)',
    executor: 'unit_technician',
    trigger: {
      type: 'operating_hours' as const,
      value: 250,
    },
    duration: '4 Stunden',
    tasks: [
      'Motoröl wechseln (85 Liter)',
      'Kraftstofffilter Inspektion',
      'Luftfilter reinigen',
      'Keilriemen Spannung prüfen und nachstellen',
      'Kühlmittelsystem Druck prüfen',
      'Getriebeöl prüfen',
      'Hydraulikflüssigkeit nachfüllen bei Bedarf',
      'Alle Schmierstellen abschmieren',
      'Bremssystem prüfen',
      'Funktionstest aller Systeme',
    ],
    sections: ['A', 'B'],
    notes: 'MTU-Wartungskonzept Level 1. Entspricht NATO AJP-4 Level 2 (Intermediate).',
  },
  {
    id: 'L2-500H',
    level: 'L2' as const,
    name: '500-Stunden Wartung (Filter)',
    executor: 'unit_technician',
    trigger: {
      type: 'operating_hours' as const,
      value: 500,
    },
    duration: '8 Stunden',
    tasks: [
      'Alle Aufgaben der 250h-Wartung',
      'Kraftstofffilter austauschen',
      'Ölfilter austauschen',
      'Zentrifugalfilter reinigen',
      'Kurbelgehäuseentlüftung prüfen',
      'Getriebeöl prüfen (bei Bedarf wechseln)',
      'Turbolader inspizieren',
      'Abgasanlage auf Dichtheit prüfen',
      'Kettenbolzen Verschleiß messen',
      'Laufrollen Lager prüfen',
      'Stoßdämpfer detailliert prüfen',
      'Turmhydraulik Druck prüfen',
      'Feuerleitanlage kalibrieren',
    ],
    sections: ['A', 'B', 'C'],
    notes: 'MTU-Wartungskonzept Level 2. Umfangreiche Filterarbeiten und Inspektionen.',
  },
  {
    id: 'L3-1000H',
    level: 'L3' as const,
    name: '1000-Stunden Wartung (Ventile)',
    executor: 'mobile_repair_team',
    trigger: {
      type: 'operating_hours' as const,
      value: 1000,
    },
    duration: '2 Tage',
    tasks: [
      'Alle Aufgaben der 500h-Wartung',
      'Ventilspiel einstellen',
      'Einspritzpumpe Zeitpunkt prüfen',
      'Regler einstellen',
      'Kompressionstest alle Zylinder',
      'Turbolader Lagerspiel messen',
      'Kühlsystem Drucktest',
      'Getriebeöl wechseln (95 Liter)',
      'Getriebefilter austauschen',
      'Magnetstopfen prüfen',
      'Kette Verschleißmessung (bei >5% Längung: austauschen)',
      'Laufrollen detaillierte Inspektion',
      'Antriebsräder Zahnkranz messen',
      'Turmdrehkranz Lagerspiel messen',
      'Waffenstabilisierung kalibrieren',
      'Laserentfernungsmesser kalibrieren',
    ],
    sections: ['A', 'B', 'C'],
    notes:
      'MTU-Wartungskonzept Level 3. Entspricht NATO AJP-4 Level 3 (Field Depot). Benötigt Spezialwerkzeug.',
  },
  {
    id: 'L4-6000H',
    level: 'L4' as const,
    name: '6000-Stunden Wartung (Hauptüberholung)',
    executor: 'depot_manufacturer',
    trigger: {
      type: 'operating_hours' as const,
      value: 6000,
    },
    duration: '4 Wochen',
    tasks: [
      'Komplette Motordemontage',
      'Zylinderkopf überholen',
      'Kolben und Ringe ersetzen',
      'Haupt- und Pleuellager ersetzen',
      'Einspritzdüsen überholen',
      'Turbolader komplett überholen',
      'Brennraum inspizieren',
      'Nockenwelle inspizieren',
      'Getriebe komplett zerlegen',
      'Kupplungspakete ersetzen',
      'Getriebe Zahnräder inspizieren',
      'Lagerung messen und bei Bedarf ersetzen',
      'Komplette Kette ersetzen',
      'Laufrollen ersetzen',
      'Antriebsräder bei Bedarf ersetzen',
      'Turmdrehkranz komplett überholen',
      'Hauptwaffe zur Herstellerwartung',
      'Feuerleitanlage Komplett-Check',
      'Alle Hydrauliksysteme revidieren',
      'Komplette Fahrzeug-Diagnostik',
    ],
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    notes:
      'MTU-Wartungskonzept Level 4. Entspricht NATO AJP-4 Level 4 (Base Depot). Nur Hersteller oder autorisierte Depots.',
  },
  {
    id: 'L1-PRE-DEPLOYMENT',
    level: 'L1' as const,
    name: 'Einsatzvorbereitung',
    executor: 'crew',
    trigger: {
      type: 'event' as const,
      value: 'before_deployment',
    },
    duration: '2 Stunden',
    tasks: [
      'Komplette L1-Wöchentliche Wartung',
      'Zusätzliche Munition laden und sichern',
      'Ersatzteile-Set komplettieren',
      'Verbandskasten erneuern',
      'Wassertanks auffüllen',
      'Notrationen verladen',
      'Abschleppseile prüfen',
      'Kommunikationssysteme testen',
      'Verschlüsselungsgeräte laden',
      'GPS kalibrieren',
      'Kampfführungssystem aktualisieren',
      'NBC-Schutzmasken für alle Besatzungsmitglieder',
      'Feuerlöschanlage Volltest',
      'Alle Sicherheitssysteme testen',
    ],
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    notes: 'Vor jedem Einsatz durchzuführen. Vollständige Einsatzbereitschaft herstellen.',
  },
  {
    id: 'L1-POST-DEPLOYMENT',
    level: 'L1' as const,
    name: 'Einsatznachbereitung',
    executor: 'crew',
    trigger: {
      type: 'event' as const,
      value: 'after_deployment',
    },
    duration: '3 Stunden',
    tasks: [
      'Fahrzeug außen reinigen',
      'Kampfraum reinigen',
      'Waffen reinigen und konservieren',
      'Munition sichern und zählen',
      'Hülsen entsorgen',
      'Alle Systeme auf Beschädigungen prüfen',
      'Kettenverschleiß messen',
      'Motorölstand prüfen und nachfüllen',
      'Kraftstoff auffüllen',
      'Alle Flüssigkeiten prüfen',
      'Schäden dokumentieren',
      'Mängelliste erstellen',
      'Ersatzteile-Verbrauch melden',
      'Betriebsstunden dokumentieren',
    ],
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    notes: 'Nach jedem Einsatz. Fahrzeug wieder in Bereitschaft versetzen und Schäden erfassen.',
  },
  {
    id: 'L2-ANNUAL',
    level: 'L2' as const,
    name: 'Jährliche Inspektion',
    executor: 'unit_technician',
    trigger: {
      type: 'calendar' as const,
      value: 365,
      unit: 'days',
    },
    duration: '1 Tag',
    tasks: [
      'Komplette Fahrzeugdokumentation prüfen',
      'Alle TÜV-relevanten Prüfungen',
      'Feuerlöschanlage TÜV',
      'Druckbehälter prüfen',
      'Feuerlöscher erneuern',
      'Batterie Zustand testen (Kapazitätstest)',
      'Alle Dichtungen alterungsbedingt prüfen',
      'Gummiteile auf Risse prüfen',
      'Korrosionsschutz erneuern',
      'Lackschäden ausbessern',
      'Alle Schmierintervalle nachholen',
      'Betriebsstundenzähler kalibrieren',
    ],
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    notes: 'Unabhängig von Betriebsstunden. Zeitabhängige Wartung und gesetzliche Prüfungen.',
  },
];

const EXECUTOR_DESCRIPTIONS: Record<string, { de: string; en: string }> = {
  crew: { de: 'Besatzung', en: 'Crew' },
  unit_technician: { de: 'Technischer Dienst Einheit', en: 'Unit Technician' },
  mobile_repair_team: { de: 'Feldwerft / Instandsetzungstrupp', en: 'Mobile Repair Team' },
  depot_manufacturer: { de: 'HIL / Hersteller', en: 'Depot / Manufacturer' },
};

/**
 * Tool for querying maintenance intervals based on NATO AJP-4 and MTU concept.
 */
export const getMaintenanceIntervalTool = createTool({
  id: 'get-maintenance-interval',
  description: `Get maintenance interval information based on NATO AJP-4 and MTU maintenance concept.

This tool provides:
- Interval-specific tasks and checklists
- Duration estimates
- Responsible executor (crew, technician, depot)
- Trigger conditions (hours, calendar, events)
- Applicable maintenance sections

Maintenance levels:
- L1: Organizational (Crew) - Daily, weekly, pre/post deployment
- L2: Intermediate (Unit Technician) - 250h, 500h, annual
- L3: Field Depot (Mobile Repair Team) - 1000h
- L4: Base Depot (Manufacturer) - 6000h major overhaul

Use this tool when:
- Determining what maintenance is due based on operating hours
- Planning maintenance schedules
- Getting task lists for specific maintenance levels
- Understanding escalation paths for maintenance`,
  inputSchema: z.object({
    level: z
      .enum(['L1', 'L2', 'L3', 'L4'])
      .optional()
      .describe('Filter by maintenance level (L1-L4)'),
    operatingHours: z
      .number()
      .optional()
      .describe('Current operating hours to determine which maintenance intervals are due'),
    intervalId: z
      .string()
      .optional()
      .describe('Get a specific interval by ID (e.g., "L2-250H", "L1-DAILY", "L3-1000H")'),
    includeTasksInRange: z
      .boolean()
      .optional()
      .default(false)
      .describe('When using operatingHours, include all intervals up to that point'),
  }),
  outputSchema: z.object({
    intervals: z.array(
      z.object({
        id: z.string(),
        level: z.enum(['L1', 'L2', 'L3', 'L4']),
        name: z.string(),
        executor: z.string(),
        executorName: z.object({
          de: z.string(),
          en: z.string(),
        }),
        trigger: z.object({
          type: z.enum(['event', 'calendar', 'operating_hours']),
          value: z.union([z.string(), z.number()]),
          unit: z.string().optional(),
        }),
        duration: z.string(),
        tasks: z.array(z.string()),
        sections: z.array(z.string()),
        notes: z.string(),
        isDue: z.boolean().optional(),
        hoursUntilDue: z.number().optional(),
      }),
    ),
    summary: z.object({
      totalIntervals: z.number(),
      dueIntervals: z.number().optional(),
      nextDueInterval: z.string().optional(),
      hoursUntilNext: z.number().optional(),
    }),
  }),
  execute: async (inputData) => {
    const { level, operatingHours, intervalId, includeTasksInRange } = inputData;

    let filteredIntervals = [...MAINTENANCE_INTERVALS];

    if (intervalId) {
      filteredIntervals = filteredIntervals.filter((i) => i.id === intervalId);
    }

    if (level) {
      filteredIntervals = filteredIntervals.filter((i) => i.level === level);
    }

    const processedIntervals = filteredIntervals.map((interval) => {
      const executorName = EXECUTOR_DESCRIPTIONS[interval.executor] || {
        de: interval.executor,
        en: interval.executor,
      };

      const processed: {
        id: string;
        level: 'L1' | 'L2' | 'L3' | 'L4';
        name: string;
        executor: string;
        executorName: { de: string; en: string };
        trigger: { type: 'event' | 'calendar' | 'operating_hours'; value: string | number; unit?: string };
        duration: string;
        tasks: string[];
        sections: string[];
        notes: string;
        isDue?: boolean;
        hoursUntilDue?: number;
      } = {
        id: interval.id,
        level: interval.level,
        name: interval.name,
        executor: interval.executor,
        executorName,
        trigger: interval.trigger as { type: 'event' | 'calendar' | 'operating_hours'; value: string | number; unit?: string },
        duration: interval.duration,
        tasks: interval.tasks,
        sections: interval.sections,
        notes: interval.notes,
      };

      if (operatingHours !== undefined && interval.trigger.type === 'operating_hours') {
        const triggerHours = interval.trigger.value as number;
        const hoursUntilDue = triggerHours - (operatingHours % triggerHours);
        processed.isDue = hoursUntilDue <= 50;
        processed.hoursUntilDue = hoursUntilDue;
      }

      return processed;
    });

    let resultIntervals = processedIntervals;
    if (operatingHours !== undefined && includeTasksInRange) {
      resultIntervals = processedIntervals.filter((i) => {
        if (i.trigger.type === 'operating_hours') {
          return (i.trigger.value as number) <= operatingHours;
        }
        return true;
      });
    }

    const dueIntervals = resultIntervals.filter((i) => i.isDue).length;
    const hourBasedIntervals = resultIntervals
      .filter((i) => i.trigger.type === 'operating_hours' && i.hoursUntilDue !== undefined)
      .sort((a, b) => (a.hoursUntilDue || 0) - (b.hoursUntilDue || 0));

    const summary: {
      totalIntervals: number;
      dueIntervals?: number;
      nextDueInterval?: string;
      hoursUntilNext?: number;
    } = {
      totalIntervals: resultIntervals.length,
    };

    if (operatingHours !== undefined) {
      summary.dueIntervals = dueIntervals;
      if (hourBasedIntervals.length > 0) {
        summary.nextDueInterval = hourBasedIntervals[0].id;
        summary.hoursUntilNext = hourBasedIntervals[0].hoursUntilDue;
      }
    }

    return {
      intervals: resultIntervals,
      summary,
    };
  },
});
