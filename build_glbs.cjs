const fs = require('fs');
const path = require('path');

// Helper to create 3D primitives
class GeometryBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.indices = [];
    this.submeshes = []; // { materialIndex, indexOffset, indexCount }
  }

  addBox(cx, cy, cz, w, h, d, matIndex) {
    const startIdx = this.positions.length / 3;
    const startIndexOffset = this.indices.length;
    const hw = w / 2, hh = h / 2, hd = d / 2;

    const faces = [
      // Front
      { n: [0, 0, 1], v: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },
      // Back
      { n: [0, 0, -1], v: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] },
      // Top
      { n: [0, 1, 0], v: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },
      // Bottom
      { n: [0, -1, 0], v: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] },
      // Right
      { n: [1, 0, 0], v: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },
      // Left
      { n: [-1, 0, 0], v: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]] },
    ];

    let vCount = startIdx;
    for (const face of faces) {
      const fBase = vCount;
      for (const pt of face.v) {
        this.positions.push(cx + pt[0], cy + pt[1], cz + pt[2]);
        this.normals.push(face.n[0], face.n[1], face.n[2]);
        vCount++;
      }
      this.indices.push(fBase, fBase + 1, fBase + 2, fBase, fBase + 2, fBase + 3);
    }

    this.submeshes.push({
      materialIndex: matIndex,
      indexOffset: startIndexOffset,
      indexCount: this.indices.length - startIndexOffset
    });
  }

  addCylinder(cx, cy, cz, rTop, rBottom, height, segments = 16, matIndex = 0) {
    const startIdx = this.positions.length / 3;
    const startIndexOffset = this.indices.length;
    const halfH = height / 2;

    // Side vertices
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Bottom vertex
      this.positions.push(cx + cos * rBottom, cy - halfH, cz + sin * rBottom);
      this.normals.push(cos, 0, sin);

      // Top vertex
      this.positions.push(cx + cos * rTop, cy + halfH, cz + sin * rTop);
      this.normals.push(cos, 0, sin);
    }

    for (let i = 0; i < segments; i++) {
      const b1 = startIdx + i * 2;
      const t1 = startIdx + i * 2 + 1;
      const b2 = startIdx + (i + 1) * 2;
      const t2 = startIdx + (i + 1) * 2 + 1;
      this.indices.push(b1, b2, t1);
      this.indices.push(t1, b2, t2);
    }

    // Top cap
    const topCapCenterIdx = this.positions.length / 3;
    this.positions.push(cx, cy + halfH, cz);
    this.normals.push(0, 1, 0);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      this.positions.push(cx + Math.cos(theta) * rTop, cy + halfH, cz + Math.sin(theta) * rTop);
      this.normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
      this.indices.push(topCapCenterIdx, topCapCenterIdx + 1 + i, topCapCenterIdx + 2 + i);
    }

    // Bottom cap
    const botCapCenterIdx = this.positions.length / 3;
    this.positions.push(cx, cy - halfH, cz);
    this.normals.push(0, -1, 0);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      this.positions.push(cx + Math.cos(theta) * rBottom, cy - halfH, cz + Math.sin(theta) * rBottom);
      this.normals.push(0, -1, 0);
    }
    for (let i = 0; i < segments; i++) {
      this.indices.push(botCapCenterIdx, botCapCenterIdx + 2 + i, botCapCenterIdx + 1 + i);
    }

    this.submeshes.push({
      materialIndex: matIndex,
      indexOffset: startIndexOffset,
      indexCount: this.indices.length - startIndexOffset
    });
  }

  addSphere(cx, cy, cz, radius, latSeg = 12, lonSeg = 16, matIndex = 0) {
    const startIdx = this.positions.length / 3;
    const startIndexOffset = this.indices.length;

    for (let lat = 0; lat <= latSeg; lat++) {
      const theta = (lat * Math.PI) / latSeg;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonSeg; lon++) {
        const phi = (lon * 2 * Math.PI) / lonSeg;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const nx = cosPhi * sinTheta;
        const ny = cosTheta;
        const nz = sinPhi * sinTheta;

        this.positions.push(cx + nx * radius, cy + ny * radius, cz + nz * radius);
        this.normals.push(nx, ny, nz);
      }
    }

    for (let lat = 0; lat < latSeg; lat++) {
      for (let lon = 0; lon < lonSeg; lon++) {
        const first = startIdx + lat * (lonSeg + 1) + lon;
        const second = first + lonSeg + 1;
        this.indices.push(first, second, first + 1);
        this.indices.push(second, second + 1, first + 1);
      }
    }

    this.submeshes.push({
      materialIndex: matIndex,
      indexOffset: startIndexOffset,
      indexCount: this.indices.length - startIndexOffset
    });
  }

  addGearRing(cx, cy, cz, rIn, rOut, height, teeth = 8, matIndex = 0) {
    this.addCylinder(cx, cy, cz, rOut, rOut, height, 16, matIndex);
    const toothH = height * 0.9;
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const tx = cx + Math.cos(angle) * (rOut + 0.03);
      const tz = cz + Math.sin(angle) * (rOut + 0.03);
      this.addBox(tx, cy, tz, 0.04, toothH, 0.04, matIndex);
    }
  }

  buildGLB(materials) {
    // Convert arrays to typed binary buffers
    const posTyped = new Float32Array(this.positions);
    const normTyped = new Float32Array(this.normals);
    const indTyped = new Uint32Array(this.indices);

    // Compute min / max for positions (required by glTF spec)
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < this.positions.length; i += 3) {
      const x = this.positions[i], y = this.positions[i + 1], z = this.positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    // Align buffers to 4-byte boundaries
    const posBuffer = Buffer.from(posTyped.buffer);
    const normBuffer = Buffer.from(normTyped.buffer);
    const indBuffer = Buffer.from(indTyped.buffer);

    const posOffset = 0;
    const posLen = posBuffer.length;

    const normOffset = posOffset + posLen;
    const normLen = normBuffer.length;

    const indOffset = normOffset + normLen;
    const indLen = indBuffer.length;

    const totalBinLength = indOffset + indLen;
    const binBuffer = Buffer.concat([posBuffer, normBuffer, indBuffer], totalBinLength);

    // Group submeshes by material to create primitives
    const primitives = [];
    const accessors = [
      // 0: POSITION
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: this.positions.length / 3,
        type: "VEC3",
        max: [maxX, maxY, maxZ],
        min: [minX, minY, minZ]
      },
      // 1: NORMAL
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: this.normals.length / 3,
        type: "VEC3"
      }
    ];

    const bufferViews = [
      // 0: POSITIONS
      {
        buffer: 0,
        byteOffset: posOffset,
        byteLength: posLen,
        target: 34962 // ARRAY_BUFFER
      },
      // 1: NORMALS
      {
        buffer: 0,
        byteOffset: normOffset,
        byteLength: normLen,
        target: 34962 // ARRAY_BUFFER
      },
      // 2: INDICES
      {
        buffer: 0,
        byteOffset: indOffset,
        byteLength: indLen,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      }
    ];

    // Create submesh primitives
    this.submeshes.forEach((sm) => {
      const accessorIndex = accessors.length;
      accessors.push({
        bufferView: 2,
        byteOffset: sm.indexOffset * 4, // Uint32 is 4 bytes
        componentType: 5125, // UNSIGNED_INT
        count: sm.indexCount,
        type: "SCALAR"
      });

      primitives.push({
        attributes: {
          POSITION: 0,
          NORMAL: 1
        },
        indices: accessorIndex,
        material: sm.materialIndex
      });
    });

    const gltf = {
      asset: {
        generator: "SAV AI Steampunk Engine v2.0",
        version: "2.0"
      },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: "SteampunkModel" }],
      meshes: [{ name: "ModelMesh", primitives: primitives }],
      materials: materials,
      accessors: accessors,
      bufferViews: bufferViews,
      buffers: [{ byteLength: totalBinLength }]
    };

    let jsonString = JSON.stringify(gltf);
    // Pad JSON string with spaces to align to 4-byte boundary
    while (Buffer.byteLength(jsonString, 'utf8') % 4 !== 0) {
      jsonString += ' ';
    }
    const jsonBuffer = Buffer.from(jsonString, 'utf8');

    // Binary Chunk (padded to 4-byte boundary with zeros)
    let binPadded = binBuffer;
    const binRemainder = binBuffer.length % 4;
    if (binRemainder !== 0) {
      const pad = 4 - binRemainder;
      binPadded = Buffer.concat([binBuffer, Buffer.alloc(pad, 0)]);
    }

    const totalGLBLength = 12 + 8 + jsonBuffer.length + 8 + binPadded.length;

    // GLB Header
    const header = Buffer.alloc(12);
    header.write('glTF', 0, 4, 'ascii');
    header.writeUInt32LE(2, 4); // Version 2
    header.writeUInt32LE(totalGLBLength, 8); // Total length

    // JSON Chunk Header
    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
    jsonHeader.write('JSON', 4, 4, 'ascii');

    // BIN Chunk Header
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binPadded.length, 0);
    binHeader.write('BIN\0', 4, 4, 'ascii');

    return Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binPadded]);
  }
}

// Materials palette
const materials = [
  // 0: Antique Brass (golden brass)
  {
    name: "AntiqueBrass",
    pbrMetallicRoughness: {
      baseColorFactor: [0.82, 0.65, 0.28, 1.0],
      metallicFactor: 0.88,
      roughnessFactor: 0.32
    }
  },
  // 1: Burnished Copper
  {
    name: "BurnishedCopper",
    pbrMetallicRoughness: {
      baseColorFactor: [0.78, 0.42, 0.22, 1.0],
      metallicFactor: 0.85,
      roughnessFactor: 0.38
    }
  },
  // 2: Dark Graphite Chassis
  {
    name: "DarkGraphite",
    pbrMetallicRoughness: {
      baseColorFactor: [0.12, 0.13, 0.16, 1.0],
      metallicFactor: 0.75,
      roughnessFactor: 0.45
    }
  },
  // 3: Glowing SAV AI Lime/Yellow Core
  {
    name: "GlowingLimeCore",
    pbrMetallicRoughness: {
      baseColorFactor: [0.85, 0.98, 0.2, 1.0],
      metallicFactor: 0.1,
      roughnessFactor: 0.15
    },
    emissiveFactor: [0.85, 0.98, 0.2]
  },
  // 4: Glowing Cyan Optic Lens
  {
    name: "CyanOptics",
    pbrMetallicRoughness: {
      baseColorFactor: [0.2, 0.9, 0.98, 1.0],
      metallicFactor: 0.1,
      roughnessFactor: 0.1
    },
    emissiveFactor: [0.2, 0.9, 0.98]
  },
  // 5: Polished Gold Trim
  {
    name: "PolishedGold",
    pbrMetallicRoughness: {
      baseColorFactor: [0.95, 0.78, 0.28, 1.0],
      metallicFactor: 0.95,
      roughnessFactor: 0.2
    }
  }
];

// 1. Model 5: FULL ROBOT (Steampunk Mech)
function buildFullRobot() {
  const g = new GeometryBuilder();

  // Torso / Chassis
  g.addBox(0, 0.1, 0, 0.55, 0.65, 0.38, 2); // Dark graphite main chest
  g.addBox(0, 0.1, 0.19, 0.42, 0.5, 0.05, 0); // Brass chest plate
  g.addCylinder(0, 0.12, 0.22, 0.12, 0.12, 0.04, 20, 3); // Glowing reactor core
  g.addGearRing(0, 0.12, 0.21, 0.12, 0.16, 0.03, 10, 5); // Golden gear rim around reactor

  // Hydraulic conduits across chest
  g.addCylinder(-0.16, 0.1, 0.19, 0.02, 0.02, 0.45, 12, 1);
  g.addCylinder(0.16, 0.1, 0.19, 0.02, 0.02, 0.45, 12, 1);

  // Head & Neck
  g.addCylinder(0, 0.48, 0, 0.1, 0.1, 0.12, 16, 0); // Brass neck
  g.addBox(0, 0.65, 0, 0.36, 0.32, 0.32, 2); // Dark helmet chassis
  g.addBox(0, 0.72, 0.14, 0.38, 0.14, 0.12, 0); // Visor cowl
  // Dual glowing ocular lenses
  g.addCylinder(-0.08, 0.65, 0.18, 0.045, 0.045, 0.06, 16, 4); // Left cyan lens
  g.addCylinder(0.08, 0.65, 0.18, 0.045, 0.045, 0.06, 16, 4); // Right cyan lens
  g.addCylinder(-0.08, 0.65, 0.17, 0.055, 0.055, 0.04, 16, 5); // Gold lens rim
  g.addCylinder(0.08, 0.65, 0.17, 0.055, 0.055, 0.04, 16, 5); // Gold lens rim

  // Ears / Antennae
  g.addCylinder(-0.2, 0.68, 0, 0.03, 0.03, 0.14, 12, 1);
  g.addCylinder(0.2, 0.68, 0, 0.03, 0.03, 0.14, 12, 1);
  g.addSphere(-0.2, 0.76, 0, 0.03, 10, 10, 3);
  g.addSphere(0.2, 0.76, 0, 0.03, 10, 10, 3);

  // Shoulders & Armor
  g.addSphere(-0.36, 0.36, 0, 0.14, 14, 14, 0); // Left brass shoulder
  g.addSphere(0.36, 0.36, 0, 0.14, 14, 14, 0); // Right brass shoulder
  g.addBox(-0.36, 0.44, 0, 0.22, 0.06, 0.22, 5); // Left gold pauldron trim
  g.addBox(0.36, 0.44, 0, 0.22, 0.06, 0.22, 5); // Right gold pauldron trim

  // Arms (Upper & Forearms)
  g.addCylinder(-0.36, 0.16, 0, 0.06, 0.05, 0.28, 14, 2);
  g.addCylinder(0.36, 0.16, 0, 0.06, 0.05, 0.28, 14, 2);
  g.addSphere(-0.36, 0.01, 0, 0.07, 12, 12, 1); // Elbow joint
  g.addSphere(0.36, 0.01, 0, 0.07, 12, 12, 1); // Elbow joint
  g.addCylinder(-0.36, -0.16, 0.05, 0.065, 0.055, 0.26, 14, 0); // Forearm
  g.addCylinder(0.36, -0.16, 0.05, 0.065, 0.055, 0.26, 14, 0); // Forearm
  g.addBox(-0.36, -0.32, 0.08, 0.09, 0.1, 0.1, 2); // Hand
  g.addBox(0.36, -0.32, 0.08, 0.09, 0.1, 0.1, 2); // Hand

  // Waist & Pelvis
  g.addCylinder(0, -0.28, 0, 0.16, 0.14, 0.14, 16, 1); // Copper waist joint
  g.addBox(0, -0.4, 0, 0.42, 0.15, 0.32, 2); // Pelvis armor
  g.addBox(0, -0.4, 0.16, 0.28, 0.12, 0.03, 5); // Golden buckle

  // Legs & Boots
  // Left Leg
  g.addCylinder(-0.16, -0.6, 0, 0.08, 0.07, 0.26, 14, 0); // Thigh
  g.addSphere(-0.16, -0.74, 0, 0.08, 12, 12, 1); // Knee
  g.addCylinder(-0.16, -0.92, 0, 0.075, 0.07, 0.28, 14, 2); // Shin
  g.addBox(-0.16, -1.1, 0.05, 0.15, 0.1, 0.28, 0); // Boot

  // Right Leg
  g.addCylinder(0.16, -0.6, 0, 0.08, 0.07, 0.26, 14, 0); // Thigh
  g.addSphere(0.16, -0.74, 0, 0.08, 12, 12, 1); // Knee
  g.addCylinder(0.16, -0.92, 0, 0.075, 0.07, 0.28, 14, 2); // Shin
  g.addBox(0.16, -1.1, 0.05, 0.15, 0.1, 0.28, 0); // Boot

  // Back Exhaust / Steam Boilers
  g.addCylinder(-0.14, 0.18, -0.24, 0.07, 0.07, 0.42, 14, 1);
  g.addCylinder(0.14, 0.18, -0.24, 0.07, 0.07, 0.42, 14, 1);
  g.addSphere(-0.14, 0.4, -0.24, 0.07, 10, 10, 0);
  g.addSphere(0.14, 0.4, -0.24, 0.07, 10, 10, 0);

  return g.buildGLB(materials);
}

// 2. Model 6: STEAMPUNK HEAD
function buildSteampunkHead() {
  const g = new GeometryBuilder();

  // Base stand & collar
  g.addCylinder(0, -0.4, 0, 0.28, 0.35, 0.15, 24, 0); // Brass pedestal
  g.addGearRing(0, -0.32, 0, 0.25, 0.32, 0.05, 14, 5); // Gold gear trim
  g.addCylinder(0, -0.22, 0, 0.14, 0.14, 0.16, 18, 1); // Copper neck

  // Main Cranium
  g.addSphere(0, 0.08, 0, 0.35, 20, 24, 2); // Dark graphite skull
  g.addBox(0, -0.05, 0.12, 0.4, 0.3, 0.3, 0); // Brass jaw / cheek plates
  g.addBox(0, -0.16, 0.18, 0.22, 0.1, 0.12, 5); // Golden chin grille

  // Steampunk Goggles / Ocular Rig
  g.addBox(0, 0.1, 0.24, 0.52, 0.16, 0.12, 0); // Goggle leather/brass strap
  // Left large monocle lens
  g.addCylinder(-0.12, 0.1, 0.32, 0.09, 0.09, 0.08, 20, 5); // Gold casing
  g.addCylinder(-0.12, 0.1, 0.36, 0.075, 0.075, 0.03, 20, 4); // Glowing cyan lens
  g.addGearRing(-0.12, 0.1, 0.31, 0.09, 0.12, 0.03, 10, 1); // Copper gear rim
  // Right zoom lens
  g.addCylinder(0.12, 0.1, 0.32, 0.07, 0.07, 0.12, 18, 0); // Brass tube
  g.addCylinder(0.12, 0.1, 0.38, 0.055, 0.055, 0.03, 18, 3); // Glowing SAV AI core lens

  // Top vacuum tubes / brain cortex
  g.addCylinder(0, 0.44, 0, 0.12, 0.12, 0.18, 16, 3); // Glowing brain core
  g.addCylinder(-0.12, 0.42, -0.06, 0.04, 0.04, 0.16, 12, 4); // Cyan vacuum tube
  g.addCylinder(0.12, 0.42, -0.06, 0.04, 0.04, 0.16, 12, 4); // Cyan vacuum tube

  // Side exhaust & auditory gears
  g.addGearRing(-0.35, 0.04, 0, 0.08, 0.13, 0.05, 8, 5);
  g.addGearRing(0.35, 0.04, 0, 0.08, 0.13, 0.05, 8, 5);

  return g.buildGLB(materials);
}

// 3. Model 7: ROBOT ARMOR / CHASSIS
function buildRobotArmor() {
  const g = new GeometryBuilder();

  // Torso Main Heavy Armor
  g.addBox(0, 0, 0, 0.7, 0.75, 0.45, 2); // Dark graphite main chassis
  g.addBox(0, 0.06, 0.23, 0.56, 0.58, 0.08, 0); // Heavy brass breastplate
  g.addBox(0, -0.22, 0.24, 0.44, 0.16, 0.06, 5); // Lower gold abdominal plating

  // Massive Central Reactor Core
  g.addCylinder(0, 0.08, 0.28, 0.16, 0.16, 0.05, 24, 3); // Glowing SAV lime energy core
  g.addGearRing(0, 0.08, 0.27, 0.16, 0.22, 0.04, 12, 5); // Gold gear housing
  g.addCylinder(0, 0.08, 0.31, 0.06, 0.06, 0.03, 16, 4); // Cyan focus crystal

  // Dual Heavy Shoulder Pauldrons
  g.addSphere(-0.46, 0.32, 0, 0.22, 16, 16, 0); // Left brass pauldron
  g.addSphere(0.46, 0.32, 0, 0.22, 16, 16, 0); // Right brass pauldron
  g.addBox(-0.46, 0.44, 0, 0.3, 0.08, 0.3, 5); // Left gold pauldron crest
  g.addBox(0.46, 0.44, 0, 0.3, 0.08, 0.3, 5); // Right gold pauldron crest

  // Quad Steam Exhaust Smokestacks on back
  g.addCylinder(-0.22, 0.4, -0.25, 0.06, 0.06, 0.45, 14, 1);
  g.addCylinder(-0.08, 0.46, -0.25, 0.05, 0.05, 0.55, 14, 1);
  g.addCylinder(0.08, 0.46, -0.25, 0.05, 0.05, 0.55, 14, 1);
  g.addCylinder(0.22, 0.4, -0.25, 0.06, 0.06, 0.45, 14, 1);

  // Pressure gauges on left chest
  g.addCylinder(-0.2, 0.22, 0.28, 0.05, 0.05, 0.04, 14, 5);
  g.addCylinder(-0.2, 0.22, 0.30, 0.04, 0.04, 0.01, 14, 3);

  // Hydraulic conduits running down ribs
  g.addCylinder(-0.28, -0.05, 0.22, 0.03, 0.03, 0.45, 12, 1);
  g.addCylinder(0.28, -0.05, 0.22, 0.03, 0.03, 0.45, 12, 1);

  return g.buildGLB(materials);
}

// 4. Model 8: MINI ROBOT / DRONE COMPANION
function buildMiniRobot() {
  const g = new GeometryBuilder();

  // Floating Spherical Drone Body
  g.addSphere(0, 0, 0, 0.32, 20, 24, 0); // Brass sphere core
  g.addGearRing(0, 0, 0, 0.32, 0.38, 0.08, 12, 5); // Golden equatorial gear ring
  g.addBox(0, 0, 0, 0.36, 0.26, 0.36, 2); // Dark graphite inner frame

  // Giant Expressive Optical Sensor (Eye)
  g.addCylinder(0, 0.04, 0.28, 0.14, 0.14, 0.08, 24, 5); // Golden eye bezel
  g.addSphere(0, 0.04, 0.32, 0.11, 16, 16, 4); // Glowing cyan eye lens
  g.addCylinder(0, 0.04, 0.42, 0.035, 0.035, 0.03, 14, 3); // SAV AI pupil

  // Top Whirlybird / Rotor blades
  g.addCylinder(0, 0.36, 0, 0.03, 0.03, 0.12, 12, 1); // Copper rotor shaft
  g.addBox(0, 0.42, 0, 0.58, 0.02, 0.08, 5); // Main gold rotor blade
  g.addBox(0, 0.42, 0, 0.08, 0.02, 0.58, 5); // Cross gold rotor blade

  // Side Wings / Thruster pods
  g.addSphere(-0.36, 0, 0, 0.1, 14, 14, 1);
  g.addSphere(0.36, 0, 0, 0.1, 14, 14, 1);
  g.addCylinder(-0.4, 0, 0, 0.06, 0.04, 0.16, 12, 3); // Left thruster glow
  g.addCylinder(0.4, 0, 0, 0.06, 0.04, 0.16, 12, 3); // Right thruster glow

  // Antenna
  g.addCylinder(0.18, 0.32, -0.12, 0.015, 0.015, 0.22, 8, 1);
  g.addSphere(0.18, 0.44, -0.12, 0.03, 8, 8, 3);

  return g.buildGLB(materials);
}

// Generate and write all 4 models
const outDir = path.join(__dirname, 'backend', 'data', 'storage');
fs.mkdirSync(outDir, { recursive: true });

const models = [
  { id: 5, name: 'robot-full-opt.glb', fn: buildFullRobot },
  { id: 6, name: 'steampunk-head-opt.glb', fn: buildSteampunkHead },
  { id: 7, name: 'robot-armor-opt.glb', fn: buildRobotArmor },
  { id: 8, name: 'mini-robot-opt.glb', fn: buildMiniRobot }
];

for (const m of models) {
  const glbBuffer = m.fn();
  const dest = path.join(outDir, `${m.id}.glb`);
  fs.writeFileSync(dest, glbBuffer);
  console.log(`Generated ${m.name} -> ${dest} (Size: ${glbBuffer.length} bytes)`);
}
