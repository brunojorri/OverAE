(() => {
  // src/code.ts
  figma.showUI(__html__, { width: 240, height: 202, title: "OverAE" });
  function firstSolidPaint(paints) {
    if (!paints) return void 0;
    return paints.find((paint) => paint.type === "SOLID" && paint.visible !== false);
  }
  function solidColor(node) {
    const fills = "fills" in node && Array.isArray(node.fills) ? node.fills : void 0;
    const backgrounds = "backgrounds" in node && Array.isArray(node.backgrounds) ? node.backgrounds : void 0;
    const fill = firstSolidPaint(fills) || firstSolidPaint(backgrounds);
    if (!fill || fill.type !== "SOLID") return void 0;
    return { ...fill.color, a: fill.opacity === void 0 ? 1 : fill.opacity };
  }
  function frameBackgroundColor(frame) {
    const color = solidColor(frame);
    if (color) return color;
    const legacy = frame;
    return legacy.backgroundColor ? { ...legacy.backgroundColor, a: 1 } : void 0;
  }
  function solidStroke(node) {
    if (!("strokes" in node) || !Array.isArray(node.strokes)) return void 0;
    const paint = node.strokes.find((item) => item.type === "SOLID" && item.visible !== false);
    if (!paint || paint.type !== "SOLID") return void 0;
    const sideWeights = "strokeTopWeight" in node && "strokeRightWeight" in node && "strokeBottomWeight" in node && "strokeLeftWeight" in node ? { top: node.strokeTopWeight, right: node.strokeRightWeight, bottom: node.strokeBottomWeight, left: node.strokeLeftWeight } : void 0;
    const hasIndividualSides = !!sideWeights && !(sideWeights.top === sideWeights.right && sideWeights.right === sideWeights.bottom && sideWeights.bottom === sideWeights.left);
    const width = "strokeWeight" in node && typeof node.strokeWeight === "number" ? node.strokeWeight : sideWeights ? Math.max(sideWeights.top, sideWeights.right, sideWeights.bottom, sideWeights.left) : 1;
    const cap = "strokeCap" in node && typeof node.strokeCap === "string" ? node.strokeCap : void 0;
    const join = "strokeJoin" in node && typeof node.strokeJoin === "string" ? node.strokeJoin : void 0;
    const dashes = "dashPattern" in node && Array.isArray(node.dashPattern) ? [...node.dashPattern] : void 0;
    const align = "strokeAlign" in node && typeof node.strokeAlign === "string" ? node.strokeAlign : void 0;
    return { color: { ...paint.color, a: paint.opacity === void 0 ? 1 : paint.opacity }, width, cap, join, dashes, align, sides: hasIndividualSides ? sideWeights : void 0 };
  }
  function imageFill(node) {
    if (!("fills" in node) || !Array.isArray(node.fills)) return void 0;
    return node.fills.find((paint) => paint.type === "IMAGE" && paint.visible !== false && !!paint.imageHash);
  }
  function linearGradientFill(node) {
    if (!("fills" in node) || !Array.isArray(node.fills)) return void 0;
    return node.fills.find((paint) => paint.type === "GRADIENT_LINEAR" && paint.visible !== false);
  }
  function effectivePaintBlendMode(node) {
    if (!("fills" in node) || !Array.isArray(node.fills)) return void 0;
    const paint = node.fills.find((item) => item.visible !== false && item.blendMode && item.blendMode !== "NORMAL");
    return paint && "blendMode" in paint ? paint.blendMode : void 0;
  }
  function blurEffect(node) {
    if (!("effects" in node) || !Array.isArray(node.effects)) return void 0;
    const effect = node.effects.find(
      (item) => item.visible !== false && (item.type === "LAYER_BLUR" || item.type === "BACKGROUND_BLUR")
    );
    if (!effect || effect.type !== "LAYER_BLUR" && effect.type !== "BACKGROUND_BLUR") return void 0;
    return { type: effect.type, radius: effect.radius };
  }
  function bytesToBase64(bytes) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      result += alphabet[a >> 2] + alphabet[(a & 3) << 4 | b >> 4] + (i + 1 < bytes.length ? alphabet[(b & 15) << 2 | c >> 6] : "=") + (i + 2 < bytes.length ? alphabet[c & 63] : "=");
    }
    return result;
  }
  function imageExtension(bytes) {
    if (bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "png";
    if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
    if (bytes.length >= 3 && bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) return "gif";
    if (bytes.length >= 12 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) return "webp";
    return "png";
  }
  function imageSizeFromBytes(bytes) {
    const extension = imageExtension(bytes);
    if (extension === "png" && bytes.length >= 24) {
      return {
        width: (bytes[16] << 24 | bytes[17] << 16 | bytes[18] << 8 | bytes[19]) >>> 0,
        height: (bytes[20] << 24 | bytes[21] << 16 | bytes[22] << 8 | bytes[23]) >>> 0
      };
    }
    if (extension === "gif" && bytes.length >= 10) {
      return { width: bytes[6] | bytes[7] << 8, height: bytes[8] | bytes[9] << 8 };
    }
    if (extension === "jpg") {
      let offset = 2;
      while (offset + 8 < bytes.length) {
        if (bytes[offset] !== 255) {
          offset++;
          continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 216 || marker === 217) {
          offset += 2;
          continue;
        }
        if (offset + 3 >= bytes.length) break;
        const length = bytes[offset + 2] << 8 | bytes[offset + 3];
        if (length < 2 || offset + length + 2 > bytes.length) break;
        if (marker >= 192 && marker <= 195 || marker >= 197 && marker <= 199 || marker >= 201 && marker <= 203 || marker >= 205 && marker <= 207) {
          return { height: bytes[offset + 5] << 8 | bytes[offset + 6], width: bytes[offset + 7] << 8 | bytes[offset + 8] };
        }
        offset += length + 2;
      }
    }
    return void 0;
  }
  function multiplyMatrices(parent, child) {
    const a = parent[0][0], c = parent[0][1], tx = parent[0][2];
    const b = parent[1][0], d = parent[1][1], ty = parent[1][2];
    return [
      [a * child[0][0] + c * child[1][0], a * child[0][1] + c * child[1][1], a * child[0][2] + c * child[1][2] + tx],
      [b * child[0][0] + d * child[1][0], b * child[0][1] + d * child[1][1], b * child[0][2] + d * child[1][2] + ty]
    ];
  }
  function imagePlacement(node, frame, paint, originalWidth, originalHeight) {
    if (!("width" in node) || !("height" in node)) return void 0;
    const nodeWidth = node.width, nodeHeight = node.height;
    let local;
    if (paint.scaleMode === "CROP" && paint.imageTransform) {
      const matrix2 = paint.imageTransform;
      local = [
        [nodeWidth * matrix2[0][0] / originalWidth, nodeWidth * matrix2[0][1] / originalHeight, nodeWidth * matrix2[0][2]],
        [nodeHeight * matrix2[1][0] / originalWidth, nodeHeight * matrix2[1][1] / originalHeight, nodeHeight * matrix2[1][2]]
      ];
    } else {
      const radians = (paint.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(radians), sin = Math.sin(radians);
      const rotatedWidth = Math.abs(cos) * originalWidth + Math.abs(sin) * originalHeight;
      const rotatedHeight = Math.abs(sin) * originalWidth + Math.abs(cos) * originalHeight;
      let scale = paint.scaleMode === "FIT" ? Math.min(nodeWidth / rotatedWidth, nodeHeight / rotatedHeight) : Math.max(nodeWidth / rotatedWidth, nodeHeight / rotatedHeight);
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
    if (!frameBounds) return void 0;
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
  function boundsRelativeToFrame(node, frame) {
    const nodeBounds = node.absoluteBoundingBox;
    const frameBounds = frame.absoluteBoundingBox;
    if (!nodeBounds || !frameBounds) throw new Error(`N\xE3o foi poss\xEDvel ler os limites de \u201C${node.name}\u201D.`);
    const matrix = node.absoluteTransform;
    return {
      x: nodeBounds.x - frameBounds.x,
      y: nodeBounds.y - frameBounds.y,
      width: nodeBounds.width,
      height: nodeBounds.height,
      rotation: Math.atan2(matrix[1][0], matrix[0][0]) * 180 / Math.PI
    };
  }
  function clippedBoundsRelativeToFrame(node, frame) {
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
  function renderBoundsRelativeToFrame(node, frame) {
    const bounds = node.absoluteRenderBounds;
    const frameBounds = frame.absoluteBoundingBox;
    if (!bounds || !frameBounds) return void 0;
    return {
      x: bounds.x - frameBounds.x,
      y: bounds.y - frameBounds.y,
      width: bounds.width,
      height: bounds.height
    };
  }
  function vectorGeometryRelativeToFrame(node, frame) {
    if (!("width" in node) || !("height" in node)) return void 0;
    const frameBounds = frame.absoluteBoundingBox;
    if (!frameBounds) return void 0;
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
  function imageMaskGeometry(node, frame) {
    if (node.type !== "ELLIPSE" && node.type !== "RECTANGLE" && !("vectorPaths" in node && node.vectorPaths.length > 0)) return void 0;
    const geometry = vectorGeometryRelativeToFrame(node, frame);
    if (!geometry) return void 0;
    const width = geometry.localWidth * Math.abs(geometry.scaleX);
    const height = geometry.localHeight * Math.abs(geometry.scaleY);
    const cornerRadius = node.type === "RECTANGLE" && typeof node.cornerRadius === "number" ? node.cornerRadius * Math.min(Math.abs(geometry.scaleX), Math.abs(geometry.scaleY)) : void 0;
    return {
      kind: node.type === "ELLIPSE" ? "ellipse" : node.type === "RECTANGLE" ? "rectangle" : "vector",
      x: geometry.centerX - width / 2,
      y: geometry.centerY - height / 2,
      width,
      height,
      rotation: Math.atan2(node.absoluteTransform[1][0], node.absoluteTransform[0][0]) * 180 / Math.PI,
      cornerRadius,
      paths: "vectorPaths" in node ? node.vectorPaths.map((path) => ({ data: path.data, windingRule: path.windingRule })) : void 0,
      vectorGeometry: geometry
    };
  }
  function hasContainerAppearance(node) {
    return !!solidColor(node) || !!solidStroke(node);
  }
  function shouldExportContainerAppearance(node) {
    return (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") && hasContainerAppearance(node);
  }
  function countLeaves(node) {
    if (node.isMask) return 0;
    if ("children" in node) {
      return (shouldExportContainerAppearance(node) ? 1 : 0) + node.children.reduce((sum, child) => sum + countLeaves(child), 0);
    }
    return 1;
  }
  function inheritedState(node, frame) {
    let opacity = 1;
    let visible = true;
    let current = node.parent;
    while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
      if ("opacity" in current && typeof current.opacity === "number") opacity *= current.opacity;
      if ("visible" in current && current.visible === false) visible = false;
      if (current === frame) break;
      current = current.parent;
    }
    return { opacity, visible };
  }
  async function flatten(node, frame, output, onLeaf, inheritedOpacity = 1, inheritedVisible = true, inheritedMask) {
    const effectiveOpacity = inheritedOpacity * node.opacity;
    const effectiveVisible = inheritedVisible && node.visible;
    if ("children" in node) {
      if (shouldExportContainerAppearance(node)) {
        const relative2 = boundsRelativeToFrame(node, frame);
        const cornerRadius = "cornerRadius" in node && typeof node.cornerRadius === "number" ? node.cornerRadius : void 0;
        output.push({ id: `${node.id}:background`, name: `${node.name} \xB7 Background`, kind: "rectangle", x: relative2.x, y: relative2.y, width: relative2.width, height: relative2.height, rotation: relative2.rotation, opacity: effectiveOpacity, visible: effectiveVisible, blendMode: node.blendMode, color: solidColor(node), stroke: solidStroke(node), cornerRadius, blur: blurEffect(node) });
        onLeaf();
      }
      let activeMask = inheritedMask;
      for (const child of node.children) {
        if (child.isMask) {
          activeMask = child;
          continue;
        }
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
    const gradient = linearGradientFill(node);
    if (image && image.imageHash) {
      const figmaImage = figma.getImageByHash(image.imageHash);
      if (!figmaImage) throw new Error(`N\xE3o foi poss\xEDvel recuperar a imagem de \u201C${node.name}\u201D.`);
      const bytes = await figmaImage.getBytesAsync();
      let size;
      try {
        size = await figmaImage.getSizeAsync();
      } catch (_) {
        size = imageSizeFromBytes(bytes);
      }
      if (!size || !size.width || !size.height) {
        if (!("width" in node) || !("height" in node)) throw new Error(`N\xE3o foi poss\xEDvel determinar as dimens\xF5es da imagem de \u201C${node.name}\u201D.`);
        size = { width: node.width, height: node.height };
      }
      output.push({ ...base, kind: "image", imageData: bytesToBase64(bytes), imageExtension: imageExtension(bytes), imagePlacement: imagePlacement(node, frame, image, size.width, size.height), imageMask: imageMaskGeometry(inheritedMask || node, frame) });
    } else if (gradient && node.type === "RECTANGLE") {
      output.push({ ...base, kind: "gradient", gradient: { opacity: gradient.opacity === void 0 ? 1 : gradient.opacity, transform: gradient.gradientTransform, stops: gradient.gradientStops.map((stop) => ({ position: stop.position, color: stop.color })) } });
    } else if (gradient && "exportAsync" in node) {
      const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
      const clipped = clippedBoundsRelativeToFrame(node, frame);
      output.push({ ...base, ...clipped, kind: "image", imageData: bytesToBase64(bytes), imageExtension: "png" });
    } else if (node.type === "RECTANGLE") {
      const cornerRadius = typeof node.cornerRadius === "number" ? node.cornerRadius : void 0;
      output.push({ ...base, kind: "rectangle", color: solidColor(node), cornerRadius });
    } else if (node.type === "ELLIPSE") output.push({ ...base, kind: "ellipse", color: solidColor(node) });
    else if (node.type === "TEXT") {
      const font = node.fontName === figma.mixed ? void 0 : node.fontName;
      const fontWeight = node.fontWeight === figma.mixed ? void 0 : node.fontWeight;
      const letterSpacing = node.letterSpacing === figma.mixed ? void 0 : node.letterSpacing;
      const lineHeight = node.lineHeight === figma.mixed ? void 0 : node.lineHeight;
      const textCase = node.textCase === figma.mixed ? void 0 : node.textCase;
      const paragraphSpacing = node.paragraphSpacing === figma.mixed ? void 0 : node.paragraphSpacing;
      const paragraphIndent = node.paragraphIndent === figma.mixed ? void 0 : node.paragraphIndent;
      output.push({ ...base, kind: "text", text: node.characters, fontSize: node.fontSize === figma.mixed ? 16 : node.fontSize, fontFamily: font == null ? void 0 : font.family, fontStyle: font == null ? void 0 : font.style, fontWeight, letterSpacing, lineHeight, textAlignHorizontal: node.textAlignHorizontal, textAlignVertical: node.textAlignVertical, textAutoResize: node.textAutoResize, textCase, paragraphSpacing, paragraphIndent, color: solidColor(node), renderBounds: renderBoundsRelativeToFrame(node, frame) });
    } else if ("vectorPaths" in node && node.vectorPaths.length > 0) output.push({ ...base, kind: "vector", color: solidColor(node), paths: node.vectorPaths.map((path) => ({ data: path.data, windingRule: path.windingRule })), vectorGeometry: vectorGeometryRelativeToFrame(node, frame) });
    else output.push({ ...base, kind: "unsupported", unsupportedType: node.type });
    onLeaf();
  }
  function outermostFrame(node) {
    let current = node;
    let frame = null;
    while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
      if (current.type === "FRAME") frame = current;
      current = current.parent;
    }
    return frame;
  }
  figma.ui.onmessage = async (message) => {
    if (message.type === "open-instagram") {
      figma.openExternal("https://www.instagram.com/brunojorri_work/");
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
    const frame = appendMode ? outermostFrame(selected) : selected.type === "FRAME" ? selected : null;
    if (!frame) {
      figma.ui.postMessage({ type: "error", message: appendMode ? "A layer precisa estar dentro de um frame." : "Selecione exatamente um frame no Figma." });
      return;
    }
    const layers = [];
    try {
      const roots = appendMode ? [selected] : frame.children;
      const total = roots.reduce((sum, child) => sum + countLeaves(child), 0);
      let processed = 0;
      figma.ui.postMessage({ type: "progress", value: 8, message: appendMode ? "Preparando a layer\u2026" : "Preparando o frame\u2026" });
      const onLeaf = () => {
        processed++;
        figma.ui.postMessage({ type: "progress", value: 8 + Math.round(processed * 67 / Math.max(1, total)), message: `Exportando layers: ${processed}/${total}` });
      };
      const backgroundColor = frameBackgroundColor(frame);
      if (!appendMode && backgroundColor) layers.push({ id: `${frame.id}:artboard-background`, name: `${frame.name} \xB7 Background`, kind: "rectangle", x: 0, y: 0, width: frame.width, height: frame.height, rotation: 0, opacity: 1, visible: true, color: backgroundColor });
      let activeRootMask;
      for (const root of roots) {
        if (root.isMask) {
          activeRootMask = root;
          continue;
        }
        const inherited = inheritedState(root, frame);
        await flatten(root, frame, layers, onLeaf, inherited.opacity, inherited.visible, activeRootMask);
      }
      figma.ui.postMessage({ type: "scene", scene: { version: 1, importMode: appendMode ? "append" : "create", exportId: Date.now().toString(36), frame: { id: frame.id, name: frame.name, width: frame.width, height: frame.height, color: backgroundColor, backgroundLayerIncluded: !appendMode && !!backgroundColor }, layers } });
    } catch (error) {
      figma.ui.postMessage({ type: "error", message: `Falha ao exportar: ${error instanceof Error ? error.message : String(error)}` });
    }
  };
})();
