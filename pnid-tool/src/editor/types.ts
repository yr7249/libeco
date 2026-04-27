// =============================================================
// 에디터 데이터 모델
// =============================================================

export type ID = string;

export interface Point { x: number; y: number }

/** 5종 선 — 색이 아니라 패턴(stroke-dasharray) 으로 구분 */
export type LineKind = 'process' | 'signal' | 'electric' | 'heat' | 'vacuum';

/** 노드 종류 */
export type NodeKind =
  // 자유 도형
  | 'rect' | 'ellipse' | 'capsule' | 'polygon' | 'text' | 'line'
  // 심볼 (symbols/index.ts 의 id 와 1:1)
  | string;

/** 8개의 표준 정렬 앵커 + 비율 앵커도 허용 */
export type AnchorName = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type Anchor = AnchorName | Point;   // Point 는 노드 로컬 (-w/2..w/2, -h/2..h/2)

export interface NodeBase {
  id: ID;
  kind: NodeKind;
  x: number;     // 중심 좌표 (월드)
  y: number;
  w: number;
  h: number;
  rot: number;   // 도(deg), 시계방향
  flipX?: boolean;
  flipY?: boolean;
  tag?: string;     // 예: PV1, MV3
  rating?: string;  // 예: 5500 psi, 0–400 psi
  /** 도형별 추가 파라미터 (polygon points, text content 등) */
  props?: Record<string, unknown>;
  locked?: boolean;
}

export interface EdgeEnd {
  nodeId?: ID;        // 비어있으면 자유 좌표 끝점
  anchor?: Anchor;    // nodeId 와 함께 사용
  point?: Point;      // 자유 끝점 (월드 좌표)
}

export interface Edge {
  id: ID;
  kind: LineKind;
  from: EdgeEnd;
  to:   EdgeEnd;
  /** 사용자가 손본 중간점들 (월드 좌표) — 비어있으면 자동 직각 라우팅 */
  waypoints: Point[];
  arrow?: 'none' | 'end' | 'start' | 'both';
  label?: string;
}

export interface DiagramMeta {
  version: 1;
  gridSize: number;     // 픽셀
  snap: boolean;
  paper: { w: number; h: number };  // 시트 크기 (월드)
}

export interface Diagram {
  nodes: Record<ID, NodeBase>;
  edges: Record<ID, Edge>;
  meta: DiagramMeta;
}

export const emptyDiagram = (): Diagram => ({
  nodes: {},
  edges: {},
  meta: { version: 1, gridSize: 10, snap: true, paper: { w: 1600, h: 1000 } },
});

// 랜덤 ID
export const uid = (): ID =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ── 심볼 에디터에서 만드는 정식 심볼 정의 ──────────────────────
export const SYM_EDITOR_W = 200; // 논리 좌표계 너비 (중심 0, 범위 ±100)
export const SYM_EDITOR_H = 120; // 논리 좌표계 높이 (중심 0, 범위 ±60)

/** 에디터에서 그린 도형 (논리 좌표) */
export interface SymbolShape {
  id: string;
  type: 'rect' | 'ellipse' | 'line' | 'text';
  // rect: top-left corner + size
  x?: number; y?: number; w?: number; h?: number;
  // ellipse: center + radii
  cx?: number; cy?: number; rx?: number; ry?: number;
  // line
  x1?: number; y1?: number; x2?: number; y2?: number;
  // text
  content?: string; fontSize?: number;
  // tx/ty shared with x/y for text position
}

/** 심볼의 커스텀 앵커 (파이프 연결점) */
export interface SymbolAnchor {
  id: string;
  name: string;
  x: number; // 논리 좌표
  y: number;
}

/** localStorage에 저장되는 심볼 정의 */
export interface StoredCustomSymbolDef {
  id: string;
  name: string;
  tag: string;
  shapes: SymbolShape[];
  anchors: SymbolAnchor[];
}

// 커스텀 심볼 템플릿 (선택 → "심볼로 저장" 으로 생성)
export interface CustomSymbolTemplate {
  id: string;
  name: string;
  nodes: NodeBase[];
  edges: Edge[];
  /** 배치 기준점 — 템플릿 내 노드들의 바운딩박스 중심 */
  cx: number;
  cy: number;
  /** 바운딩박스 크기 (미리보기용) */
  bw: number;
  bh: number;
}

// 선 패턴 (dasharray) 정의
export const LINE_DASH: Record<LineKind, string | undefined> = {
  process:  undefined,
  signal:   '4 2',
  electric: '6 2 1 2',
  heat:     undefined,    // 이중선으로 표현 (Edge.tsx 에서 처리)
  vacuum:   '1 3',
};
export const LINE_WIDTH: Record<LineKind, number> = {
  process: 1.4, signal: 0.8, electric: 0.9, heat: 1.2, vacuum: 0.8,
};
