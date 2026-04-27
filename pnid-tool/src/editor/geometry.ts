import type { AnchorName, EdgeEnd, NodeBase, Point } from './types';
import { SYM_EDITOR_W, SYM_EDITOR_H } from './types';
import { getCustomAnchors } from './customSymbolRegistry';

/** 노드 로컬 (-w/2..w/2, -h/2..h/2) → 월드 좌표 */
export function localToWorld(n: NodeBase, p: Point): Point {
  const sx = n.flipX ? -1 : 1;
  const sy = n.flipY ? -1 : 1;
  const r  = (n.rot * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  const lx = p.x * sx;
  const ly = p.y * sy;
  return { x: n.x + lx * cos - ly * sin, y: n.y + lx * sin + ly * cos };
}

/** 8방향 앵커의 노드 로컬 좌표 (커스텀 심볼 앵커도 지원) */
export function anchorLocal(n: NodeBase, a: AnchorName | string): Point {
  const w2 = n.w / 2, h2 = n.h / 2;
  switch (a) {
    case 'n':  return { x: 0,    y: -h2 };
    case 's':  return { x: 0,    y:  h2 };
    case 'e':  return { x:  w2,  y: 0 };
    case 'w':  return { x: -w2,  y: 0 };
    case 'ne': return { x:  w2,  y: -h2 };
    case 'nw': return { x: -w2,  y: -h2 };
    case 'se': return { x:  w2,  y:  h2 };
    case 'sw': return { x: -w2,  y:  h2 };
    default: {
      // 커스텀 심볼 앵커 조회
      const customAnchors = getCustomAnchors(n.kind);
      const found = customAnchors.find((ca) => ca.name === a);
      if (found) {
        return {
          x: found.x * (n.w / SYM_EDITOR_W),
          y: found.y * (n.h / SYM_EDITOR_H),
        };
      }
      return { x: 0, y: 0 };
    }
  }
}

/** 노드의 모든 앵커 이름 반환 (기본 8방향 + 커스텀) */
export function getNodeAnchorNames(n: NodeBase): string[] {
  const standard: AnchorName[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const customAnchors = getCustomAnchors(n.kind);
  if (customAnchors.length > 0) {
    return customAnchors.map((a) => a.name);
  }
  return standard;
}

/** 모든 표준 앵커 (월드 좌표) */
export function nodeAnchors(n: NodeBase): { name: AnchorName; pt: Point }[] {
  const names: AnchorName[] = ['n','s','e','w','ne','nw','se','sw'];
  return names.map((name) => ({ name, pt: localToWorld(n, anchorLocal(n, name)) }));
}

/** Edge 끝점 → 월드 좌표 */
export function edgeEndPoint(end: EdgeEnd, nodes: Record<string, NodeBase>): Point {
  if (end.nodeId && nodes[end.nodeId]) {
    const n = nodes[end.nodeId];
    if (typeof end.anchor === 'string') return localToWorld(n, anchorLocal(n, end.anchor));
    if (end.anchor && typeof end.anchor === 'object')
      return localToWorld(n, end.anchor);
    return { x: n.x, y: n.y };
  }
  return end.point ?? { x: 0, y: 0 };
}

/** 두 점 사이 직각 라우팅 (사용자 waypoint 가 비어있을 때) */
export function orthogonalRoute(a: Point, b: Point, prefer: 'h' | 'v' = 'h'): Point[] {
  if (a.x === b.x || a.y === b.y) return [a, b];
  const mid = prefer === 'h'
    ? { x: (a.x + b.x) / 2, y: a.y }
    : { x: a.x, y: (a.y + b.y) / 2 };
  const mid2 = prefer === 'h'
    ? { x: mid.x, y: b.y }
    : { x: b.x, y: mid.y };
  return [a, mid, mid2, b];
}

/** 점이 노드 AABB 안에 있는지 (회전 무시, 선택용 hit-test 보조) */
export function pointInNode(p: Point, n: NodeBase): boolean {
  const w2 = n.w / 2, h2 = n.h / 2;
  return Math.abs(p.x - n.x) <= w2 && Math.abs(p.y - n.y) <= h2;
}

/** 그리드 스냅 */
export const snap = (v: number, g: number) => Math.round(v / g) * g;
