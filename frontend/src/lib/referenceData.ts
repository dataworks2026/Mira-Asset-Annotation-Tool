export interface DamageType {
  code: string;
  label: string;
}

export interface SeverityLevel {
  level: number;
  label: string;
  color: string;
  fillColor: string;
  strokeColor: string;
}

export interface ComponentCode {
  code: string;
  label: string;
}

export const DAMAGE_TYPES: DamageType[] = [
  { code: "CR", label: "Cracking" },
  { code: "SP", label: "Spalling" },
  { code: "CO", label: "Corrosion" },
  { code: "LO", label: "Loss of Section" },
  { code: "DE", label: "Delamination" },
  { code: "BG", label: "Bulging" },
  { code: "CF", label: "Collision/Fire" },
  { code: "RS", label: "Rust Staining" },
];

export const SEVERITY_LEVELS: SeverityLevel[] = [
  {
    level: 1,
    label: "Good",
    color: "text-green-700",
    fillColor: "rgba(34, 197, 94, 0.15)",
    strokeColor: "rgba(34, 197, 94, 0.8)",
  },
  {
    level: 2,
    label: "Fair",
    color: "text-yellow-700",
    fillColor: "rgba(234, 179, 8, 0.15)",
    strokeColor: "rgba(234, 179, 8, 0.8)",
  },
  {
    level: 3,
    label: "Poor",
    color: "text-orange-700",
    fillColor: "rgba(249, 115, 22, 0.15)",
    strokeColor: "rgba(249, 115, 22, 0.8)",
  },
  {
    level: 4,
    label: "Severe",
    color: "text-red-700",
    fillColor: "rgba(239, 68, 68, 0.15)",
    strokeColor: "rgba(239, 68, 68, 0.8)",
  },
];

export const COMPONENT_CODES: ComponentCode[] = [
  { code: "DT", label: "Deck Top" },
  { code: "DU", label: "Deck Underside" },
  { code: "CP", label: "Cap" },
  { code: "PT", label: "Pile Top" },
  { code: "PS", label: "Pile Submerged" },
  { code: "SZ", label: "Splash Zone" },
  { code: "FD", label: "Fender" },
  { code: "BH", label: "Bulkhead" },
  { code: "SS", label: "Superstructure" },
  { code: "AR", label: "Abutment/Railing" },
  { code: "AP", label: "Approach" },
];

export function getSeverityByLevel(level: number): SeverityLevel | undefined {
  return SEVERITY_LEVELS.find((s) => s.level === level);
}

export function getDamageTypeByCode(code: string): DamageType | undefined {
  return DAMAGE_TYPES.find((d) => d.code === code);
}

export function getComponentByCode(code: string): ComponentCode | undefined {
  return COMPONENT_CODES.find((c) => c.code === code);
}
