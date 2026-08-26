figma.showUI(__html__, { width: 240, height: 202, title: "OverAE" });

type BridgeLayer = {
  id: string; name: string; kind: "rectangle" | "ellipse" | "text" | "vector" | "gradient" | "image" | "video" | "unsupported";
  x: number; y: number; width: number; height: number; rotation: number;
  opacity: number; visible: boolean; color?: { r: number; g: number; b: number; a: number };
  blendMode?: string; cornerRadius?: number; paths?: Array<{ data: string; windingRule: string }>;
  stroke?: { color: { r: number; g: number; b: number; a: number }; width: number; cap?: string; join?: string; dashes?: number[]; align?: string; sides?: { top: number; right: number; bottom: number; left: number } };
  text?: string; fontSize?: number; fontFamily?: string; fontStyle?: string; fontWeight?: number;
  letterSpacing?: { unit: string; value: number }; lineHeight?: { unit: string; value: number };
  textAlignHorizontal?: string; textAlignVertical?: string; textAutoResize?: string; textCase?: string;
  textSegments?: Array<{ start: number; end: number; fontFamily: string; fontStyle: string; fontWeight: number; fontSize: number; color?: { r: number; g: number; b: number; a: number } }>;
  paragraphSpacing?: number; paragraphIndent?: number; unsupportedType?: string;
  imageData?: string; imageExtension?: "png" | "jpg" | "gif" | "webp"; mediaPath?: string;
  imagePlacement?: { centerX: number; centerY: number; scaleX: number; scaleY: number; rotation: number; originalWidth: number; originalHeight: number; scaleMode: string };
  imageMask?: { kind: "ellipse" | "rectangle" | "vector"; x: number; y: number; width: number; height: number; rotation: number; cornerRadius?: number; paths?: Array<{ data: string; windingRule: string }>; vectorGeometry?: BridgeLayer["vectorGeometry"] };
  blur?: { type: "LAYER_BLUR" | "BACKGROUND_BLUR"; radius: number };
  renderBounds?: { x: number; y: number; width: number; height: number };
  vectorGeometry?: { localWidth: number; localHeight: number; scaleX: number; scaleY: number; centerX: number; centerY: number };
  gradient?: { opacity: number; transform: Transform; stops: Array<{ position: number; color: { r: number; g: number; b: number; a: number } }> };
};
type LinkedMedia = { path: string; width: number; height: number; fileName: string };
let linkedMedia: Record<string, LinkedMedia> = {};

async function restoreLinkedMedia(): Promise<void> {
  try {
    const stored = await figma.clientStorage.getAsync("overAE.videoLinks");
    if (stored && typeof stored === "object") linkedMedia = { ...stored, ...linkedMedia };
  } catch (_) {
    // Some Figma environments can temporarily deny clientStorage. The current
    // session remains usable and media can still be linked again if necessary.
  }
}

async function persistLinkedMedia(): Promise<boolean> {
  try {
    await figma.clientStorage.setAsync("overAE.videoLinks", linkedMedia);
    return true;
  } catch (_) {
    return false;
  }
}

function firstSolidPaint(paints: readonly Paint[] | undefined) {
  if (!paints) return undefined;
  return paints.find((paint) => paint.type === "SOLID" && paint.visible !== false);
}

function solidColor(node: SceneNode) {
  const fills = "fills" in node && Array.isArray(node.fills) ? node.fills : undefined;
  const backgrounds = "backgrounds" in node && Array.isArray(node.backgrounds) ? node.backgrounds : undefined;
  const fill = firstSolidPaint(fills) || firstSolidPaint(backgrounds);
  if (!fill || fill.type !== "SOLID") return undefined;
  return { ...fill.color, a: fill.opacity === undefined ? 1 : fill.opacity };
}

function frameBackgroundColor(frame: FrameNode) {
  const color = solidColor(frame);
  if (color) return color;
  const legacy = frame as FrameNode & { backgroundColor?: RGB };
  return legacy.backgroundColor ? { ...legacy.backgroundColor, a: 1 } : undefined;
}

function solidStroke(node: SceneNode): BridgeLayer["stroke"] {
  if (!("strokes" in node) || !Array.isArray(node.strokes)) return undefined;
  const paint = node.strokes.find((item) => item.type === "SOLID" && item.visible !== false);
  if (!paint || paint.type !== "SOLID") return undefined;
  const sideWeights = "strokeTopWeight" in node && "strokeRightWeight" in node && "strokeBottomWeight" in node && "strokeLeftWeight" in node
    ? { top: node.strokeTopWeight, right: node.strokeRightWeight, bottom: node.strokeBottomWeight, left: node.strokeLeftWeight }
    : undefined;
  const hasIndividualSides = !!sideWeights && !(sideWeights.top === sideWeights.right && sideWeights.right === sideWeights.bottom && sideWeights.bottom === sideWeights.left);
  const width = "strokeWeight" in node && typeof node.strokeWeight === "number" ? node.strokeWeight : sideWeights ? Math.max(sideWeights.top, sideWeights.right, sideWeights.bottom, sideWeights.left) : 1;
  const cap = "strokeCap" in node && typeof node.strokeCap === "string" ? node.strokeCap : undefined;
  const join = "strokeJoin" in node && typeof node.strokeJoin === "string" ? node.strokeJoin : undefined;
  const dashes = "dashPattern" in node && Array.isArray(node.dashPattern) ? [...node.dashPattern] : undefined;
  const align = "strokeAlign" in node && typeof node.strokeAlign === "string" ? node.strokeAlign : undefined;
  return { color: { ...paint.color, a: paint.opacity === undefined ? 1 : paint.opacity }, width, cap, join, dashes, align, sides: hasIndividualSides ? sideWeights : undefined };
}

function imageFill(node: SceneNode): ImagePaint | undefined {
  if (!("fills" in node) || !Array.isArray(node.fills)) return undefined;
  return node.fills.find((paint): paint is ImagePaint => paint.type === "IMAGE" && paint.visible !== false);
}
function videoFill(node: SceneNode): VideoPaint | undefined {
  if (!("fills" in node) || !Array.isArray(node.fills)) return undefined;
  return node.fills.find((paint): paint is VideoPaint => paint.type === "VIDEO" && paint.visible !== false);
}

function linearGradientFill(node: SceneNode) {
  if (!("fills" in node) || !Array.isArray(node.fills)) return undefined;
  return node.fills.find((paint) => paint.type === "GRADIENT_LINEAR" && paint.visible !== false);
}

function effectivePaintBlendMode(node: SceneNode) {
  if (!("fills" in node) || !Array.isArray(node.fills)) return undefined;
  const paint = node.fills.find((item) => item.visible !== false && item.blendMode && item.blendMode !== "NORMAL");
  return paint && "blendMode" in paint ? paint.blendMode : undefined;
}

function blurEffect(node: SceneNode): BridgeLayer["blur"] {
  if (!("effects" in node) || !Array.isArray(node.effects)) return undefined;
  const effect = node.effects.find((item) =>
    item.visible !== false && (item.type === "LAYER_BLUR" || item.type === "BACKGROUND_BLUR")
  );
  if (!effect || (effect.type !== "LAYER_BLUR" && effect.type !== "BACKGROUND_BLUR")) return undefined;
  return { type: effect.type, radius: effect.radius };
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] + (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : "=") + (i + 2 < bytes.length ? alphabet[c & 63] : "=");
  }
  return result;
}

function imageExtension(bytes: Uint8Array): BridgeLayer["imageExtension"] {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  return "png";
}

function imageSizeFromBytes(bytes: Uint8Array): { width: number; height: number } | undefined {
  const extension = imageExtension(bytes);
  if (extension === "png" && bytes.length >= 24) {
    return {
      width: ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0,
      height: ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0
    };
  }
  if (extension === "gif" && bytes.length >= 10) {
    return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
  }
  if (extension === "jpg") {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      if (offset + 3 >= bytes.length) break;
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
      }
      offset += length + 2;
    }
  }
  return undefined;
}

type Matrix = [[number, number, number], [number, number, number]];

function multiplyMatrices(parent: Transform, child: Matrix): Matrix {
  const a = parent[0][0], c = parent[0][1], tx = parent[0][2];
  const b = parent[1][0], d = parent[1][1], ty = parent[1][2];
  return [
    [a * child[0][0] + c * child[1][0], a * child[0][1] + c * child[1][1], a * child[0][2] + c * child[1][2] + tx],
    [b * child[0][0] + d * child[1][0], b * child[0][1] + d * child[1][1], b * child[0][2] + d * child[1][2] + ty]
  ];
}

function imagePlacement(node: SceneNode, frame: FrameNode, paint: ImagePaint | VideoPaint, originalWidth: number, originalHeight: number): BridgeLayer["imagePlacement"] {
  if (!("width" in node) || !("height" in node)) return undefined;
  const nodeWidth = node.width, nodeHeight = node.height;
  let local: Matrix;
  const cropTransform = paint.type === "IMAGE" ? paint.imageTransform : paint.videoTransform;
  if (paint.scaleMode === "CROP" && cropTransform) {
    const matrix = cropTransform;
    local = [
      [nodeWidth * matrix[0][0] / originalWidth, nodeWidth * matrix[0][1] / originalHeight, nodeWidth * matrix[0][2]],
      [nodeHeight * matrix[1][0] / originalWidth, nodeHeight * matrix[1][1] / originalHeight, nodeHeight * matrix[1][2]]
    ];
  } else {
    const radians = (paint.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    const rotatedWidth = Math.abs(cos) * originalWidth + Math.abs(sin) * originalHeight;
    const rotatedHeight = Math.abs(sin) * originalWidth + Math.abs(cos) * originalHeight;
    let scale = paint.scaleMode === "FIT"
      ? Math.min(nodeWidth / rotatedWidth, nodeHeight / rotatedHeight)
      : Math.max(nodeWidth / rotatedWidth, nodeHeight / rotatedHeight);
    if (paint.scaleMode === "TILE") scale = paint.scalingFactor || 1;
    const ma = cos * scale, mc = -sin * scale, mb = sin * scale, md = cos * scale;
    local = [
      [ma, mc, nodeWidth / 2 - ma * originalWidth / 2 - mc * originalHeight / 2],
      [mb, md, nodeHeight / 2 - mb * originalWidth / 2 - md * originalHeight / 2]
    ];
  }
  const matrix = multiplyMatrices(node.absoluteTransform, local);
  const a = matrix[0][0], c = matrix[0][1], tx = matrix[0][2];
  const b = matrix[1][0], d = matrix[1][1], ty = matrix[1][2];
  const scaleX = Math.sqrt(a * a + b * b) || 1;
  const scaleY = (a * d - b * c) / scaleX || 1;
  const frameBounds = frame.absoluteBoundingBox;
  if (!frameBounds) return undefined;
  return {
    centerX: a * originalWidth / 2 + c * originalHeight / 2 + tx - frameBounds.x,
    centerY: b * originalWidth / 2 + d * originalHeight / 2 + ty - frameBounds.y,
    scaleX,
    scaleY,
    rotation: Math.atan2(b, a) * 180 / Math.PI,
    originalWidth,
    originalHeight,
    scaleMode: paint.scaleMode
  };
}

function renderedImagePlacement(base: { x: number; y: number; width: number; height: number }, bytes: Uint8Array): BridgeLayer["imagePlacement"] {
  // node.exportAsync() already bakes the node rotation and crop into the PNG.
  // Place those pixels by their rendered bounds instead of rotating twice.
  const size = imageSizeFromBytes(bytes) || { width: base.width, height: base.height };
  const scale = Math.max(base.width / Math.max(1, size.width), base.height / Math.max(1, size.height));
  return { centerX: base.x + base.width / 2, centerY: base.y + base.height / 2, scaleX: scale, scaleY: scale, rotation: 0, originalWidth: size.width, originalHeight: size.height, scaleMode: "RENDERED_FALLBACK" };
}

async function exportNodeWithoutAncestorMasks(node: SceneNode): Promise<Uint8Array> {
  // exportAsync() honors masks/clipping from the node's ancestors. Export a
  // fresh rectangle containing only the image paints, then fall back to a
  // detached clone. A fresh node cannot inherit a sibling mask or frame clip.
  let isolated: RectangleNode | undefined;
  let clone: SceneNode | undefined;
  try {
    if (node.type === "RECTANGLE" && Array.isArray(node.fills) && node.fills.length) {
      isolated = figma.createRectangle();
      isolated.resize(Math.max(1, node.width), Math.max(1, node.height));
      isolated.fills = node.fills;
      isolated.strokes = [];
      isolated.effects = [];
      isolated.rotation = node.rotation;
      return await isolated.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
    }
    clone = node.clone();
    figma.currentPage.appendChild(clone);
    if ("isMask" in clone && clone.isMask) clone.isMask = false;
    return await clone.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
  } catch (_) {
    return await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
  } finally {
    if (isolated && !isolated.removed) isolated.remove();
    if (clone && !clone.removed) clone.remove();
  }
}

function boundsRelativeToFrame(node: SceneNode, frame: FrameNode) {
  const nodeBounds = node.absoluteBoundingBox;
  const frameBounds = frame.absoluteBoundingBox;
  if (!nodeBounds || !frameBounds) throw new Error(`Não foi possível ler os limites de “${node.name}”.`);
  const matrix = node.absoluteTransform;
  return {
    x: nodeBounds.x - frameBounds.x,
    y: nodeBounds.y - frameBounds.y,
    width: nodeBounds.width,
    height: nodeBounds.height,
    rotation: Math.atan2(matrix[1][0], matrix[0][0]) * 180 / Math.PI
  };
}

function clippedBoundsRelativeToFrame(node: SceneNode, frame: FrameNode) {
  const nodeBounds = node.absoluteBoundingBox;
  const frameBounds = frame.absoluteBoundingBox;
  if (!nodeBounds || !frameBounds) return boundsRelativeToFrame(node, frame);
  const left = Math.max(nodeBounds.x, frameBounds.x);
  const top = Math.max(nodeBounds.y, frameBounds.y);
  const right = Math.min(nodeBounds.x + nodeBounds.width, frameBounds.x + frameBounds.width);
  const bottom = Math.min(nodeBounds.y + nodeBounds.height, frameBounds.y + frameBounds.height);
  const matrix = node.absoluteTransform;
  return {
    x: left - frameBounds.x,
    y: top - frameBounds.y,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    rotation: Math.atan2(matrix[1][0], matrix[0][0]) * 180 / Math.PI
  };
}

function renderBoundsRelativeToFrame(node: SceneNode, frame: FrameNode): BridgeLayer["renderBounds"] {
  const bounds = node.absoluteRenderBounds;
  const frameBounds = frame.absoluteBoundingBox;
  if (!bounds || !frameBounds) return undefined;
  return {
    x: bounds.x - frameBounds.x,
    y: bounds.y - frameBounds.y,
    width: bounds.width,
    height: bounds.height
  };
}

function vectorGeometryRelativeToFrame(node: SceneNode, frame: FrameNode): BridgeLayer["vectorGeometry"] {
  if (!("width" in node) || !("height" in node)) return undefined;
  const frameBounds = frame.absoluteBoundingBox;
  if (!frameBounds) return undefined;
  const matrix = node.absoluteTransform;
  const a = matrix[0][0], c = matrix[0][1], tx = matrix[0][2];
  const b = matrix[1][0], d = matrix[1][1], ty = matrix[1][2];
  const scaleX = Math.sqrt(a * a + b * b) || 1;
  const scaleY = (a * d - b * c) / scaleX || 1;
  const localWidth = node.width, localHeight = node.height;
  return {
    localWidth,
    localHeight,
    scaleX,
    scaleY,
    centerX: a * localWidth / 2 + c * localHeight / 2 + tx - frameBounds.x,
    centerY: b * localWidth / 2 + d * localHeight / 2 + ty - frameBounds.y
  };
}

function imageMaskGeometry(node: SceneNode, frame: FrameNode): BridgeLayer["imageMask"] {
  const hasVectorPath = "vectorPaths" in node && node.vectorPaths.length > 0;
  const hasRectangularBounds = node.type === "RECTANGLE" || node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE";
  if (node.type !== "ELLIPSE" && !hasRectangularBounds && !hasVectorPath) return undefined;
  const geometry = vectorGeometryRelativeToFrame(node, frame);
  if (!geometry) return undefined;
  const width = geometry.localWidth * Math.abs(geometry.scaleX);
  const height = geometry.localHeight * Math.abs(geometry.scaleY);
  const cornerRadius = "cornerRadius" in node && typeof node.cornerRadius === "number"
    ? node.cornerRadius * Math.min(Math.abs(geometry.scaleX), Math.abs(geometry.scaleY))
    : undefined;
  return {
    kind: node.type === "ELLIPSE" ? "ellipse" : hasVectorPath ? "vector" : "rectangle",
    x: geometry.centerX - width / 2,
    y: geometry.centerY - height / 2,
    width,
    height,
    rotation: Math.atan2(node.absoluteTransform[1][0], node.absoluteTransform[0][0]) * 180 / Math.PI,
    cornerRadius,
    paths: "vectorPaths" in node ? node.vectorPaths.map((path) => ({ data: path.data, windingRule: path.windingRule })) : undefined,
    vectorGeometry: geometry
  };
}

function hasContainerAppearance(node: SceneNode) {
  return !!solidColor(node) || !!solidStroke(node);
}

function shouldExportContainerAppearance(node: SceneNode) {
  return (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") && hasContainerAppearance(node);
}

function countLeaves(node: SceneNode): number {
  if (node.isMask) return 0;
  if ("children" in node) {
    return (shouldExportContainerAppearance(node) ? 1 : 0) + node.children.reduce((sum, child) => sum + countLeaves(child), 0);
  }
  return 1;
}

function inheritedState(node: SceneNode, frame: FrameNode) {
  let opacity = 1;
  let visible = true;
  let current: BaseNode | null = node.parent;
  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if ("opacity" in current && typeof current.opacity === "number") opacity *= current.opacity;
    if ("visible" in current && current.visible === false) visible = false;
    if (current === frame) break;
    current = current.parent;
  }
  return { opacity, visible };
}

async function flatten(node: SceneNode, frame: FrameNode, output: BridgeLayer[], onLeaf: () => void, inheritedOpacity = 1, inheritedVisible = true, inheritedMask?: SceneNode) {
  const effectiveOpacity = inheritedOpacity * node.opacity;
  const effectiveVisible = inheritedVisible && node.visible;
  if ("children" in node) {
    if (shouldExportContainerAppearance(node)) {
      const relative = boundsRelativeToFrame(node, frame);
      const cornerRadius = "cornerRadius" in node && typeof node.cornerRadius === "number" ? node.cornerRadius : undefined;
      output.push({ id: `${node.id}:background`, name: `${node.name} · Background`, kind: "rectangle", x: relative.x, y: relative.y, width: relative.width, height: relative.height, rotation: relative.rotation, opacity: effectiveOpacity, visible: effectiveVisible, blendMode: node.blendMode, color: solidColor(node), stroke: solidStroke(node), cornerRadius, blur: blurEffect(node) });
      onLeaf();
    }
    // Figma also masks descendants implicitly when a nested frame/component
    // has Clip content enabled, even when no child is marked as `isMask`.
    let activeMask = "clipsContent" in node && node.clipsContent ? node : inheritedMask;
    for (const child of node.children) {
      if (child.isMask) { activeMask = child; continue; }
      await flatten(child, frame, output, onLeaf, effectiveOpacity, effectiveVisible, activeMask);
    }
    return;
  }
  const relative = boundsRelativeToFrame(node, frame);
  const x = relative.x;
  const y = relative.y;
  const rotation = relative.rotation;
  const base = { id: node.id, name: node.name, x, y, width: relative.width, height: relative.height, rotation, opacity: effectiveOpacity, visible: effectiveVisible, blendMode: effectivePaintBlendMode(node) || node.blendMode, stroke: solidStroke(node), blur: blurEffect(node) };
  const image = imageFill(node);
  const video = videoFill(node);
  const gradient = linearGradientFill(node);
  if (video) {
    const linked = linkedMedia[video.videoHash || node.id];
    if (!linked) throw new Error(`Vincule a mídia original de “${node.name}” antes de enviar.`);
    const inheritedMaskGeometry = inheritedMask ? imageMaskGeometry(inheritedMask, frame) : undefined;
    output.push({ ...base, kind: "video", mediaPath: linked.path, imagePlacement: imagePlacement(node, frame, video, linked.width, linked.height), imageMask: inheritedMaskGeometry || imageMaskGeometry(node, frame) });
  }
  else if (image && image.imageHash) {
    const figmaImage = figma.getImageByHash(image.imageHash);
    if (!figmaImage) throw new Error(`Não foi possível recuperar a imagem de “${node.name}”.`);
    const bytes = await figmaImage.getBytesAsync();
    let size: { width: number; height: number } | undefined;
    try { size = await figmaImage.getSizeAsync(); } catch (_) { size = imageSizeFromBytes(bytes); }
    if (!size || !size.width || !size.height) {
      if (!("width" in node) || !("height" in node)) throw new Error(`Não foi possível determinar as dimensões da imagem de “${node.name}”.`);
      size = { width: node.width, height: node.height };
    }
    const inheritedMaskGeometry = inheritedMask ? imageMaskGeometry(inheritedMask, frame) : undefined;
    output.push({ ...base, kind: "image", imageData: bytesToBase64(bytes), imageExtension: imageExtension(bytes), imagePlacement: imagePlacement(node, frame, image, size.width, size.height), imageMask: inheritedMaskGeometry || imageMaskGeometry(node, frame) });
  }
  else if (image && "exportAsync" in node) {
    // Some imported/library images are visible in Figma while their imageHash
    // is unavailable to plugins. Preserve the rendered pixels instead of
    // silently converting the node into an empty rectangle.
    const bytes = await exportNodeWithoutAncestorMasks(node);
    const inheritedMaskGeometry = inheritedMask ? imageMaskGeometry(inheritedMask, frame) : undefined;
    output.push({ ...base, rotation: 0, kind: "image", imageData: bytesToBase64(bytes), imageExtension: "png", imagePlacement: renderedImagePlacement(base, bytes), imageMask: inheritedMaskGeometry || imageMaskGeometry(node, frame) });
  }
  else if (gradient && node.type === "RECTANGLE") {
    output.push({ ...base, kind: "gradient", gradient: { opacity: gradient.opacity === undefined ? 1 : gradient.opacity, transform: gradient.gradientTransform, stops: gradient.gradientStops.map((stop) => ({ position: stop.position, color: stop.color })) } });
  }
  else if (gradient && node.type !== "TEXT" && "exportAsync" in node) {
    const bytes = await exportNodeWithoutAncestorMasks(node);
    const clipped = clippedBoundsRelativeToFrame(node, frame);
    output.push({ ...base, ...clipped, kind: "image", imageData: bytesToBase64(bytes), imageExtension: "png" });
  }
  else if (node.type === "RECTANGLE" && !solidColor(node) && !solidStroke(node) && "exportAsync" in node) {
    // A few library/imported photographs expose no readable ImagePaint even
    // though Figma renders pixels. Export their rendered rectangle so they do
    // not become invisible shape layers. An inherited explicit vector mask is
    // still preserved as the image's track matte.
    const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
    const inheritedMaskGeometry = inheritedMask ? imageMaskGeometry(inheritedMask, frame) : undefined;
    output.push({ ...base, rotation: 0, kind: "image", imageData: bytesToBase64(bytes), imageExtension: "png", imagePlacement: renderedImagePlacement(base, bytes), imageMask: inheritedMaskGeometry || imageMaskGeometry(node, frame) });
  }
  else if (node.type === "RECTANGLE") {
    const cornerRadius = typeof node.cornerRadius === "number" ? node.cornerRadius : undefined;
    output.push({ ...base, kind: "rectangle", color: solidColor(node), cornerRadius });
  }
  else if (node.type === "ELLIPSE") output.push({ ...base, kind: "ellipse", color: solidColor(node), });
  else if (node.type === "TEXT") {
    const font = node.fontName === figma.mixed ? undefined : node.fontName;
    const fontWeight = node.fontWeight === figma.mixed ? undefined : node.fontWeight;
    const letterSpacing = node.letterSpacing === figma.mixed ? undefined : node.letterSpacing;
    const lineHeight = node.lineHeight === figma.mixed ? undefined : node.lineHeight;
    const textCase = node.textCase === figma.mixed ? undefined : node.textCase;
    const paragraphSpacing = node.paragraphSpacing === figma.mixed ? undefined : node.paragraphSpacing;
    const paragraphIndent = node.paragraphIndent === figma.mixed ? undefined : node.paragraphIndent;
    const textSegments = node.getStyledTextSegments(["fontName", "fontWeight", "fontSize", "fills"]).map((segment) => {
      const segmentFill = firstSolidPaint(segment.fills);
      return { start: segment.start, end: segment.end, fontFamily: segment.fontName.family, fontStyle: segment.fontName.style, fontWeight: segment.fontWeight, fontSize: segment.fontSize, color: segmentFill && segmentFill.type === "SOLID" ? { ...segmentFill.color, a: segmentFill.opacity === undefined ? 1 : segmentFill.opacity } : undefined };
    });
    output.push({ ...base, kind: "text", text: node.characters, fontSize: node.fontSize === figma.mixed ? textSegments[0]?.fontSize || 16 : node.fontSize, fontFamily: font?.family || textSegments[0]?.fontFamily, fontStyle: font?.style || textSegments[0]?.fontStyle, fontWeight: fontWeight === undefined ? textSegments[0]?.fontWeight : fontWeight, textSegments, letterSpacing, lineHeight, textAlignHorizontal: node.textAlignHorizontal, textAlignVertical: node.textAlignVertical, textAutoResize: node.textAutoResize, textCase, paragraphSpacing, paragraphIndent, color: solidColor(node) || gradient?.gradientStops[0]?.color || textSegments[0]?.color, gradient: gradient ? { opacity: gradient.opacity === undefined ? 1 : gradient.opacity, transform: gradient.gradientTransform, stops: gradient.gradientStops.map((stop) => ({ position: stop.position, color: stop.color })) } : undefined, renderBounds: renderBoundsRelativeToFrame(node, frame) });
  }
  else if ("vectorPaths" in node && node.vectorPaths.length > 0) output.push({ ...base, kind: "vector", color: solidColor(node), paths: node.vectorPaths.map((path) => ({ data: path.data, windingRule: path.windingRule })), vectorGeometry: vectorGeometryRelativeToFrame(node, frame) });
  else output.push({ ...base, kind: "unsupported", unsupportedType: node.type });
  onLeaf();
}

function outermostFrame(node: SceneNode): FrameNode | null {
  let current: BaseNode | null = node;
  let frame: FrameNode | null = null;
  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (current.type === "FRAME") frame = current as FrameNode;
    current = current.parent;
  }
  return frame;
}

function firstUnlinkedVideo(nodes: readonly SceneNode[]): { node: SceneNode; paint: VideoPaint } | null {
  for (const node of nodes) {
    const paint = videoFill(node);
    if (paint && !linkedMedia[paint.videoHash || node.id]) return { node, paint };
    if ("children" in node) {
      const nested = firstUnlinkedVideo(node.children);
      if (nested) return nested;
    }
  }
  return null;
}

async function handleUiMessage(message: any) {
  if (message.type === "open-instagram") {
    figma.openExternal("https://www.instagram.com/brunojorri_work/");
    return;
  }
  if (message.type === "prepare-media-link") {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) { figma.ui.postMessage({ type: "error", message: "Selecione exatamente uma layer de vídeo." }); return; }
    const node = selection[0], paint = videoFill(node);
    if (!paint) { figma.ui.postMessage({ type: "error", message: "A layer selecionada não possui um fill de vídeo." }); return; }
    figma.ui.postMessage({ type: "media-link-target", nodeId: node.id, mediaKey: paint.videoHash || node.id, name: node.name, width: "width" in node ? node.width : 0, height: "height" in node ? node.height : 0 });
    return;
  }
  if (message.type === "media-linked") {
    linkedMedia[message.mediaKey] = { path: message.path, width: message.width, height: message.height, fileName: message.fileName };
    const persisted = await persistLinkedMedia();
    const resuming = message.resumeType === "export" || message.resumeType === "export-layer";
    figma.ui.postMessage({ type: "media-link-complete", name: message.name, persisted, resuming });
    if (resuming) await handleUiMessage({ type: message.resumeType });
    return;
  }
  if (message.type !== "export" && message.type !== "export-layer") return;
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({ type: "error", message: "Selecione exatamente um elemento no Figma." });
    return;
  }
  const selected = selection[0];
  const appendMode = message.type === "export-layer";
  const frame = appendMode ? outermostFrame(selected) : (selected.type === "FRAME" ? selected : null);
  if (!frame) {
    figma.ui.postMessage({ type: "error", message: appendMode ? "A layer precisa estar dentro de um frame." : "Selecione exatamente um frame no Figma." });
    return;
  }
  const layers: BridgeLayer[] = [];
  try {
    await restoreLinkedMedia();
    const roots: readonly SceneNode[] = appendMode ? [selected] : frame.children;
    const missingVideo = firstUnlinkedVideo(roots);
    if (missingVideo) {
      const node = missingVideo.node;
      figma.ui.postMessage({ type: "media-link-target", nodeId: node.id, mediaKey: missingVideo.paint.videoHash || node.id, name: node.name, width: "width" in node ? node.width : 0, height: "height" in node ? node.height : 0, resumeType: message.type });
      return;
    }
    const total = roots.reduce((sum, child) => sum + countLeaves(child), 0);
    let processed = 0;
    figma.ui.postMessage({ type: "progress", value: 8, message: appendMode ? "Preparando a layer…" : "Preparando o frame…" });
    const onLeaf = () => {
      processed++;
      figma.ui.postMessage({ type: "progress", value: 8 + Math.round(processed * 67 / Math.max(1, total)), message: `Exportando layers: ${processed}/${total}` });
    };
    const backgroundColor = frameBackgroundColor(frame);
    if (!appendMode && backgroundColor) layers.push({ id: `${frame.id}:artboard-background`, name: `${frame.name} · Background`, kind: "rectangle", x: 0, y: 0, width: frame.width, height: frame.height, rotation: 0, opacity: 1, visible: true, color: backgroundColor });
    let activeRootMask: SceneNode | undefined;
    for (const root of roots) {
      if (root.isMask) { activeRootMask = root; continue; }
      const inherited = inheritedState(root, frame);
      await flatten(root, frame, layers, onLeaf, inherited.opacity, inherited.visible, activeRootMask);
    }
    figma.ui.postMessage({ type: "scene", scene: { version: 1, importMode: appendMode ? "append" : "create", exportId: Date.now().toString(36), frame: { id: frame.id, name: frame.name, width: frame.width, height: frame.height, color: backgroundColor, backgroundLayerIncluded: !appendMode && !!backgroundColor }, layers } });
  } catch (error) {
    figma.ui.postMessage({ type: "error", message: `Falha ao exportar: ${error instanceof Error ? error.message : String(error)}` });
  }
}

figma.ui.onmessage = async (message) => {
  try {
    await handleUiMessage(message);
  } catch (error) {
    figma.ui.postMessage({ type: "error", message: `Falha no plugin: ${error instanceof Error ? error.message : String(error)}` });
  }
};
