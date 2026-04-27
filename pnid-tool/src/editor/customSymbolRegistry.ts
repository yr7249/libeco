/**
 * 심볼 에디터로 만든 정식 커스텀 심볼 레지스트리.
 * localStorage ↔ 런타임 SymbolDef 변환을 담당.
 */
import type { ReactNode } from 'react';
import React from 'react';
import type { NodeBase, SymbolShape, SymbolAnchor, StoredCustomSymbolDef } from './types';
import { SYM_EDITOR_W, SYM_EDITOR_H } from './types';
import type { SymbolDef } from '../symbols';

const LS_KEY = 'pnid-tool:symbol-defs';

// ── 런타임 레지스트리 ────────────────────────────────────────────
const registry = new Map<string, { raw: StoredCustomSymbolDef; def: SymbolDef }>();

export function getRegistryDef(id: string): SymbolDef | undefined {
  return registry.get(id)?.def;
}

export function getAllRegistryDefs(): SymbolDef[] {
  return [...registry.values()].map((v) => v.def);
}

export function getCustomAnchors(symbolId: string): SymbolAnchor[] {
  return registry.get(symbolId)?.raw.anchors ?? [];
}

// ── localStorage CRUD ────────────────────────────────────────────
export function loadStoredDefs(): StoredCustomSymbolDef[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveStoredDefs(list: StoredCustomSymbolDef[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// ── 초기화 (앱 시작 시 1회 호출) ────────────────────────────────
export function initRegistry(defs: StoredCustomSymbolDef[]): void {
  registry.clear();
  for (const raw of defs) {
    registry.set(raw.id, { raw, def: makeSymbolDef(raw) });
  }
}

export function addToRegistry(raw: StoredCustomSymbolDef): void {
  registry.set(raw.id, { raw, def: makeSymbolDef(raw) });
}

export function removeFromRegistry(id: string): void {
  registry.delete(id);
}

// ── StoredCustomSymbolDef → SymbolDef 변환 ────────────────────────
function makeSymbolDef(raw: StoredCustomSymbolDef): SymbolDef {
  return {
    id: raw.id,
    label: raw.name,
    category: '사용자',
    w: SYM_EDITOR_W,
    h: SYM_EDITOR_H,
    tag: raw.tag,
    extraAnchors: raw.anchors.map((a) => ({ name: a.name, pt: { x: a.x, y: a.y } })),
    render: (node: NodeBase) => renderShapes(raw.shapes, node),
  };
}

function renderShapes(shapes: SymbolShape[], node: NodeBase): ReactNode {
  const scaleX = node.w / SYM_EDITOR_W;
  const scaleY = node.h / SYM_EDITOR_H;
  const S = '#111';

  return shapes.map((shape) => {
    switch (shape.type) {
      case 'rect': {
        const x = (shape.x ?? 0) * scaleX;
        const y = (shape.y ?? 0) * scaleY;
        const w = (shape.w ?? 10) * scaleX;
        const h = (shape.h ?? 10) * scaleY;
        return React.createElement('rect', {
          key: shape.id,
          x, y, width: w, height: h,
          style: { fill: '#fff', stroke: S, strokeWidth: 1 },
        });
      }
      case 'ellipse': {
        const cx = (shape.cx ?? 0) * scaleX;
        const cy = (shape.cy ?? 0) * scaleY;
        const rx = (shape.rx ?? 5) * scaleX;
        const ry = (shape.ry ?? 5) * scaleY;
        return React.createElement('ellipse', {
          key: shape.id,
          cx, cy, rx, ry,
          style: { fill: '#fff', stroke: S, strokeWidth: 1 },
        });
      }
      case 'line': {
        const x1 = (shape.x1 ?? 0) * scaleX;
        const y1 = (shape.y1 ?? 0) * scaleY;
        const x2 = (shape.x2 ?? 10) * scaleX;
        const y2 = (shape.y2 ?? 0) * scaleY;
        return React.createElement('line', {
          key: shape.id,
          x1, y1, x2, y2,
          style: { stroke: S, strokeWidth: 1 },
        });
      }
      case 'text': {
        const x = (shape.x ?? 0) * scaleX;
        const y = (shape.y ?? 0) * scaleY;
        const fs = (shape.fontSize ?? 12) * Math.min(scaleX, scaleY);
        return React.createElement('text', {
          key: shape.id,
          x, y,
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          fontSize: fs,
          fill: S,
        }, shape.content ?? '');
      }
      default:
        return null;
    }
  });
}
