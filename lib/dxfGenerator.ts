// ============================================================
// Blueprint AI — DXF File Generator
// Uses raw DXF text format (compatible with AutoCAD / DraftSight)
// ============================================================

import { FloorPlan, Room, Wall } from '@/types/plan';

const SCALE = 1000; // Convert meters → millimeters in DXF

function toMM(meters: number): number {
  return parseFloat((meters * SCALE).toFixed(2));
}

// ============================================================
// DXF builder (minimal DXF R12 format)
// ============================================================

class DXFWriter {
  private lines: string[] = [];

  header(): void {
    this.lines.push(
      '0', 'SECTION',
      '2', 'HEADER',
      '9', '$ACADVER',
      '1', 'AC1009',
      '9', '$INSUNITS',
      '70', '4', // Millimeters
      '0', 'ENDSEC',
    );
  }

  tablesSection(layers: { name: string; color: number }[]): void {
    this.lines.push('0', 'SECTION', '2', 'TABLES');
    this.lines.push('0', 'TABLE', '2', 'LAYER', '70', String(layers.length));

    for (const layer of layers) {
      this.lines.push(
        '0', 'LAYER',
        '2', layer.name,
        '70', '0',
        '62', String(layer.color),
        '6', 'CONTINUOUS',
      );
    }

    this.lines.push('0', 'ENDTAB', '0', 'ENDSEC');
  }

  entitiesStart(): void {
    this.lines.push('0', 'SECTION', '2', 'ENTITIES');
  }

  entitiesEnd(): void {
    this.lines.push('0', 'ENDSEC');
  }

  eof(): void {
    this.lines.push('0', 'EOF');
  }

  line(x1: number, y1: number, x2: number, y2: number, layer: string): void {
    this.lines.push(
      '0', 'LINE',
      '8', layer,
      '10', String(toMM(x1)),
      '20', String(toMM(y1)),
      '30', '0.0',
      '11', String(toMM(x2)),
      '21', String(toMM(y2)),
      '31', '0.0',
    );
  }

  text(x: number, y: number, height: number, text: string, layer: string): void {
    this.lines.push(
      '0', 'TEXT',
      '8', layer,
      '10', String(toMM(x)),
      '20', String(toMM(y)),
      '30', '0.0',
      '40', String(toMM(height)),
      '1', text,
      '72', '1', // Horizontal center
      '11', String(toMM(x)),
      '21', String(toMM(y)),
      '31', '0.0',
    );
  }

  dimension(
    x1: number, y1: number,
    x2: number, y2: number,
    dimX: number, dimY: number,
    layer: string
  ): void {
    // Extension line 1
    this.line(x1, y1, dimX, dimY, layer);
    // Extension line 2
    this.line(x2, y2, dimX + (x2 - x1), dimY, layer);
    // Dimension line
    this.line(dimX, dimY, dimX + (x2 - x1), dimY, layer);
    // Measurement text
    const measurement = Math.abs(x2 - x1).toFixed(2) + 'm';
    this.text(dimX + (x2 - x1) / 2, dimY + 0.2, 0.25, measurement, layer);
  }

  toString(): string {
    return this.lines.join('\n');
  }
}

// ============================================================
// Generate DXF from floor plan
// ============================================================

export function generateDXF(plan: FloorPlan, projectName?: string): string {
  const writer = new DXFWriter();
  const today = new Date().toLocaleDateString('en-AU');
  const title = projectName || plan.name || 'Floor Plan';

  // Layers
  const layers = [
    { name: 'WALLS-EXT', color: 7 },  // White
    { name: 'WALLS-INT', color: 8 },  // Gray
    { name: 'DIMENSIONS', color: 4 }, // Cyan
    { name: 'TEXT-LABELS', color: 2 }, // Yellow
    { name: 'TITLE-BLOCK', color: 7 }, // White
    { name: 'ROOM-FILL', color: 3 },  // Green (for room outlines)
  ];

  writer.header();
  writer.tablesSection(layers);
  writer.entitiesStart();

  // --- Exterior walls ---
  for (const wall of plan.walls.filter((w) => w.type === 'exterior')) {
    const offset = wall.thickness / 2;

    // Draw double lines for wall thickness
    if (wall.x1 === wall.x2) {
      // Vertical wall
      writer.line(wall.x1 - offset, wall.y1, wall.x2 - offset, wall.y2, 'WALLS-EXT');
      writer.line(wall.x1 + offset, wall.y1, wall.x2 + offset, wall.y2, 'WALLS-EXT');
    } else {
      // Horizontal wall
      writer.line(wall.x1, wall.y1 - offset, wall.x2, wall.y2 - offset, 'WALLS-EXT');
      writer.line(wall.x1, wall.y1 + offset, wall.x2, wall.y2 + offset, 'WALLS-EXT');
    }
  }

  // --- Interior walls ---
  for (const wall of plan.walls.filter((w) => w.type === 'interior')) {
    writer.line(wall.x1, wall.y1, wall.x2, wall.y2, 'WALLS-INT');
  }

  // --- Room outlines and labels ---
  for (const room of plan.rooms) {
    const { x, y, width, height, label } = room;

    // Room rectangle
    writer.line(x, y, x + width, y, 'ROOM-FILL');
    writer.line(x + width, y, x + width, y + height, 'ROOM-FILL');
    writer.line(x + width, y + height, x, y + height, 'ROOM-FILL');
    writer.line(x, y + height, x, y, 'ROOM-FILL');

    // Room label (centered)
    writer.text(x + width / 2, y + height / 2 + 0.15, 0.3, label, 'TEXT-LABELS');
    // Dimensions
    writer.text(
      x + width / 2,
      y + height / 2 - 0.15,
      0.2,
      `${width.toFixed(1)}×${height.toFixed(1)}m`,
      'TEXT-LABELS'
    );

    // Dimension lines
    writer.dimension(x, y, x + width, y, x, y - 0.8, 'DIMENSIONS');
    writer.dimension(x, y, x, y + height, x - 0.8, y, 'DIMENSIONS');
  }

  // --- Title block ---
  const tbX = 0;
  const tbY = -(plan.depth * 0.15 + 1);
  const tbW = plan.width;
  const tbH = plan.depth * 0.15;

  // Border
  writer.line(tbX, tbY, tbX + tbW, tbY, 'TITLE-BLOCK');
  writer.line(tbX + tbW, tbY, tbX + tbW, tbY + tbH, 'TITLE-BLOCK');
  writer.line(tbX + tbW, tbY + tbH, tbX, tbY + tbH, 'TITLE-BLOCK');
  writer.line(tbX, tbY + tbH, tbX, tbY, 'TITLE-BLOCK');

  // Title block text
  writer.text(tbX + tbW / 2, tbY + tbH * 0.75, 0.4, title, 'TITLE-BLOCK');
  writer.text(tbX + tbW / 2, tbY + tbH * 0.5, 0.25, `Date: ${today}  |  Scale: 1:100`, 'TITLE-BLOCK');
  writer.text(
    tbX + tbW / 2,
    tbY + tbH * 0.25,
    0.2,
    'Generated by Blueprint AI — Concept Only, Not for Construction',
    'TITLE-BLOCK'
  );

  writer.entitiesEnd();
  writer.eof();

  return writer.toString();
}
