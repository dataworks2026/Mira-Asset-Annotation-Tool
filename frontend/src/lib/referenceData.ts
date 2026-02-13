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

export interface AssetTypeOption {
  value: string;
  label: string;
}

// ============================================================================
// INDUSTRY CATEGORIES
// ============================================================================

export type IndustryCategory = "coastal" | "railway" | "wind";

export const INDUSTRY_CATEGORIES: { value: IndustryCategory; label: string }[] = [
  { value: "coastal", label: "Coastal" },
  { value: "railway", label: "Railway" },
  { value: "wind", label: "Wind" },
];

// ============================================================================
// ASSET TYPES BY INDUSTRY CATEGORY
// ============================================================================

export const ASSET_TYPES_BY_CATEGORY: Record<IndustryCategory, AssetTypeOption[]> = {
  coastal: [
    { value: "pier", label: "Pier" },
    { value: "bulkhead", label: "Bulkhead" },
    { value: "seawall", label: "Seawall" },
    { value: "wharf", label: "Wharf" },
    { value: "dock", label: "Dock" },
    { value: "bridge", label: "Bridge" },
    { value: "retaining_wall", label: "Retaining Wall" },
    { value: "other", label: "Other" },
  ],
  railway: [
    { value: "track", label: "Track" },
    { value: "bridge", label: "Bridge" },
    { value: "tunnel", label: "Tunnel" },
    { value: "station", label: "Station" },
    { value: "signal", label: "Signal Equipment" },
    { value: "other", label: "Other" },
  ],
  wind: [
    { value: "turbine", label: "Turbine" },
    { value: "foundation", label: "Foundation" },
    { value: "blade", label: "Blade" },
    { value: "nacelle", label: "Nacelle" },
    { value: "tower", label: "Tower" },
    { value: "other", label: "Other" },
  ],
};

export function getAssetTypesForCategory(category: IndustryCategory | undefined): AssetTypeOption[] {
  if (!category) return ASSET_TYPES_BY_CATEGORY.coastal;
  return ASSET_TYPES_BY_CATEGORY[category] || ASSET_TYPES_BY_CATEGORY.coastal;
}

// ============================================================================
// DAMAGE TYPES BY INDUSTRY CATEGORY
// ============================================================================

export const DAMAGE_TYPES_BY_CATEGORY: Record<IndustryCategory, DamageType[]> = {
  coastal: [
    { code: "CR", label: "Cracking" },
    { code: "SP", label: "Spalling" },
    { code: "CO", label: "Corrosion" },
    { code: "LO", label: "Loss of Section" },
    { code: "DE", label: "Decay" },
    { code: "BG", label: "Biological Growth" },
    { code: "CF", label: "Coating Failure" },
    { code: "ER", label: "Erosion" },
    { code: "SC", label: "Scour" },
    { code: "MG", label: "Marine Growth" },
    { code: "RS", label: "Rust Staining" },
  ],
  railway: [
    { code: "CR", label: "Cracking" },
    { code: "CO", label: "Corrosion" },
    { code: "WR", label: "Wear" },
    { code: "DF", label: "Deformation" },
    { code: "BK", label: "Broken Component" },
    { code: "MS", label: "Missing Component" },
    { code: "LO", label: "Loose Fastener" },
    { code: "AL", label: "Alignment Issue" },
  ],
  wind: [
    { code: "CR", label: "Cracking" },
    { code: "ER", label: "Erosion" },
    { code: "LT", label: "Lightning Damage" },
    { code: "IC", label: "Ice Damage" },
    { code: "CO", label: "Corrosion" },
    { code: "DL", label: "Delamination" },
    { code: "IM", label: "Impact Damage" },
    { code: "OL", label: "Oil Leak" },
  ],
};

// Default damage types (coastal)
export const DAMAGE_TYPES: DamageType[] = DAMAGE_TYPES_BY_CATEGORY.coastal;

export function getDamageTypesForCategory(category: IndustryCategory | undefined): DamageType[] {
  if (!category) return DAMAGE_TYPES_BY_CATEGORY.coastal;
  return DAMAGE_TYPES_BY_CATEGORY[category] || DAMAGE_TYPES_BY_CATEGORY.coastal;
}

// ============================================================================
// SEVERITY LEVELS (same across all categories)
// ============================================================================

export const SEVERITY_LEVELS: SeverityLevel[] = [
  {
    level: 1,
    label: "Minor",
    color: "text-green-700",
    fillColor: "rgba(34, 197, 94, 0.15)",
    strokeColor: "rgba(34, 197, 94, 0.8)",
  },
  {
    level: 2,
    label: "Moderate",
    color: "text-yellow-700",
    fillColor: "rgba(234, 179, 8, 0.15)",
    strokeColor: "rgba(234, 179, 8, 0.8)",
  },
  {
    level: 3,
    label: "Advanced",
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

// ============================================================================
// COMPONENT CODES BY ASSET TYPE (Coastal industry)
// ============================================================================

// Default component codes (used as fallback)
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

// Component codes by asset type (primarily for Coastal)
export const COMPONENT_CODES_BY_ASSET_TYPE: Record<string, ComponentCode[]> = {
  // Coastal asset types
  pier: [
    { code: "DT", label: "Deck Top" },
    { code: "DU", label: "Deck Underside" },
    { code: "CP", label: "Cap" },
    { code: "PT", label: "Pile Top" },
    { code: "PS", label: "Pile Submerged" },
    { code: "SZ", label: "Splash Zone" },
    { code: "FD", label: "Fender" },
    { code: "CL", label: "Cleat" },
    { code: "UT", label: "Utility Connection" },
  ],
  bridge: [
    { code: "DT", label: "Deck Top" },
    { code: "DU", label: "Deck Underside" },
    { code: "SS", label: "Superstructure" },
    { code: "AB", label: "Abutment" },
    { code: "RL", label: "Railing" },
    { code: "BR", label: "Bearing" },
    { code: "GD", label: "Girder" },
    { code: "CR", label: "Cross Beam" },
    { code: "JT", label: "Joint" },
    { code: "AP", label: "Approach" },
  ],
  seawall: [
    { code: "FC", label: "Face" },
    { code: "CP", label: "Cap" },
    { code: "SZ", label: "Splash Zone" },
    { code: "TO", label: "Toe" },
    { code: "WP", label: "Weep Hole" },
    { code: "TB", label: "Tie Back" },
    { code: "JT", label: "Joint" },
  ],
  bulkhead: [
    { code: "BH", label: "Bulkhead Face" },
    { code: "CP", label: "Cap" },
    { code: "TB", label: "Tie Back" },
    { code: "WL", label: "Wale" },
    { code: "SZ", label: "Splash Zone" },
    { code: "WP", label: "Weep Hole" },
    { code: "AN", label: "Anchor" },
  ],
  wharf: [
    { code: "DT", label: "Deck Top" },
    { code: "DU", label: "Deck Underside" },
    { code: "CP", label: "Cap" },
    { code: "PT", label: "Pile Top" },
    { code: "PS", label: "Pile Submerged" },
    { code: "SZ", label: "Splash Zone" },
    { code: "FD", label: "Fender" },
    { code: "BL", label: "Bollard" },
    { code: "CR", label: "Crane Rail" },
  ],
  dock: [
    { code: "DT", label: "Deck Top" },
    { code: "DU", label: "Deck Underside" },
    { code: "FL", label: "Float" },
    { code: "GW", label: "Gangway" },
    { code: "CL", label: "Cleat" },
    { code: "FD", label: "Fender" },
    { code: "UT", label: "Utility Connection" },
  ],
  retaining_wall: [
    { code: "FC", label: "Face" },
    { code: "CP", label: "Cap" },
    { code: "TO", label: "Toe" },
    { code: "WP", label: "Weep Hole" },
    { code: "TB", label: "Tie Back" },
    { code: "JT", label: "Joint" },
    { code: "DR", label: "Drain" },
  ],
  // Railway asset types (placeholder - to be expanded)
  track: [
    { code: "RL", label: "Rail" },
    { code: "TI", label: "Tie/Sleeper" },
    { code: "BL", label: "Ballast" },
    { code: "FS", label: "Fastener" },
    { code: "JT", label: "Joint" },
  ],
  tunnel: [
    { code: "LN", label: "Lining" },
    { code: "PT", label: "Portal" },
    { code: "DR", label: "Drainage" },
    { code: "VT", label: "Ventilation" },
  ],
  // Wind asset types (placeholder - to be expanded)
  turbine: [
    { code: "BL", label: "Blade" },
    { code: "HB", label: "Hub" },
    { code: "NC", label: "Nacelle" },
    { code: "TW", label: "Tower" },
    { code: "FN", label: "Foundation" },
  ],
  blade: [
    { code: "LE", label: "Leading Edge" },
    { code: "TE", label: "Trailing Edge" },
    { code: "RT", label: "Root" },
    { code: "TP", label: "Tip" },
    { code: "SR", label: "Surface" },
  ],
  other: COMPONENT_CODES, // fallback to default
};

export function getComponentsForAssetType(assetType: string | undefined): ComponentCode[] {
  if (!assetType) return COMPONENT_CODES;
  return COMPONENT_CODES_BY_ASSET_TYPE[assetType] || COMPONENT_CODES;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSeverityByLevel(level: number): SeverityLevel | undefined {
  return SEVERITY_LEVELS.find((s) => s.level === level);
}

export function getDamageTypeByCode(code: string): DamageType | undefined {
  return DAMAGE_TYPES.find((d) => d.code === code);
}

export function getComponentByCode(code: string): ComponentCode | undefined {
  return COMPONENT_CODES.find((c) => c.code === code);
}

// ============================================================================
// SPATIAL AWARENESS - Elevation Zones
// ============================================================================

export interface ElevationOption {
  value: string;
  label: string;
}

export const ELEVATION_ZONES: ElevationOption[] = [
  { value: "above_water", label: "Above Water" },
  { value: "splash_zone", label: "Splash Zone" },
  { value: "tidal_zone", label: "Tidal Zone" },
  { value: "submerged", label: "Submerged" },
  { value: "buried", label: "Buried" },
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

// ============================================================================
// SPATIAL AWARENESS - Side/Face Orientation
// ============================================================================

export interface SideFaceOption {
  value: string;
  label: string;
}

export const SIDE_FACE_OPTIONS: SideFaceOption[] = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "seaward", label: "Seaward" },
  { value: "landward", label: "Landward" },
  { value: "upstream", label: "Upstream" },
  { value: "downstream", label: "Downstream" },
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "interior", label: "Interior" },
  { value: "exterior", label: "Exterior" },
];

// ============================================================================
// STRUCTURAL SEGMENTS - Component-level tracking for annotations
// ============================================================================

export interface StructuralSegment {
  code: string;
  name: string;
  category?: string;  // Optional grouping
}

export const STRUCTURAL_SEGMENTS: StructuralSegment[] = [
  // Deck Components
  { code: "DT", name: "Deck – Topside", category: "Deck" },
  { code: "DU", name: "Deck – Underside", category: "Deck" },

  // Pile Components
  { code: "CP", name: "Pile Caps / Concrete Caps", category: "Piles" },
  { code: "PT", name: "Timber Piles", category: "Piles" },
  { code: "PS", name: "Steel Piles", category: "Piles" },

  // Water Interface
  { code: "SZ", name: "Splash Zone", category: "Water Interface" },

  // Protection Systems
  { code: "FD", name: "Fender System", category: "Protection" },
  { code: "BH", name: "Bulkhead / Seawall", category: "Protection" },

  // Structural Elements
  { code: "SS", name: "Steel Superstructure / Framing", category: "Structure" },
  { code: "AR", name: "Anchors / Tie Rods", category: "Structure" },
  { code: "AP", name: "Appurtenances & Fixtures", category: "Other" },
  { code: "BP", name: "Barge Pier (barge platform)", category: "Other" },
];

export function getStructuralSegmentByCode(code: string): StructuralSegment | undefined {
  return STRUCTURAL_SEGMENTS.find((s) => s.code === code);
}

export function formatStructuralSegments(codes: string[]): string {
  if (!codes || codes.length === 0) return "";
  if (codes.length === 1) return codes[0];
  return codes.join(" & ");
}
