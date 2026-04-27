import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as RPE, WheelEvent as RWE } from 'react';
import type { Diagram, ID, LineKind, NodeBase, AnchorName, Point, CustomSymbolTemplate } from './types';
import { uid } from './types';
import { snap as snapV, anchorLocal, localToWorld } from './geometry';
import { SYMBOL_MAP } from '../symbols';
import { NodeView } from './render/Node';
import { EdgeView } from './render/Edge';
import { Markers } from './render/markers';

export interface CanvasProps {
  diagram: Diagram;
  selection: Set<ID>;
  onSelect: (ids: Set<ID>) => void;
  onChange: (next: Diagram, commit: boolean) => void;
  /** 팔레트에서 고른 심볼 id (있으면 클릭 시 배치 후 자동 해제) */
  armedSymbol: string | null;
  /** 팔레트에서 고른 커스텀 심볼 템플릿 */
  armedCustom: CustomSymbolTemplate | null;
  onPlaced: () => void;
  /** 새로 생기는 엣지의 종류 */
  lineKind: LineKind;
}

interface Viewport { tx: number; ty: number; scale: number }

type Interaction =
  | { kind: 'idle' }
  | { kind: 'pan';     startClient: Point; startVp: Viewport }
  | { kind: 'move';    startWorld: Point; orig: Record<ID, Point> }
  | { kind: 'connect'; from: { nodeId: ID; anchor: AnchorName }; current: Point }
  | { kind: 'box';     startWorld: Point; current: Point };

export function Canvas({
  diagram, selection, onSelect, onChange,
  armedSymbol, armedCustom, onPlaced, lineKind,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vp, setVp] = useState<Viewport>({ tx: 0, ty: 0, scale: 1 });
  const [hoverNode, setHoverNode] = useState<ID | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ nodeId: ID; anchor: AnchorName } | null>(null);
  const [interaction, setInteraction] = useState<Interaction>({ kind: 'idle' });

  // 화면 → 월드 변환
  const clientToWorld = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (clientX - rect.left - vp.tx) / vp.scale;
    const y = (clientY - rect.top  - vp.ty) / vp.scale;
    return { x, y };
  };

  // 월드 좌표 스냅
  const sn = (p: Point): Point => diagram.meta.snap
    ? { x: snapV(p.x, diagram.meta.gridSize), y: snapV(p.y, diagram.meta.gridSize) }
    : p;

  // ───────── wheel zoom ─────────
  const onWheel = (e: RWE<SVGSVGElement>) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const next = Math.max(0.2, Math.min(4, vp.scale * factor));
    const rect = svgRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // 커서 위치 기준 줌
    const tx = cx - ((cx - vp.tx) * next) / vp.scale;
    const ty = cy - ((cy - vp.ty) * next) / vp.scale;
    setVp({ tx, ty, scale: next });
  };

  // ───────── 빈 영역 down ─────────
  const onSurfaceDown = (e: RPE<SVGRectElement>) => {
    if (e.button === 1 || e.altKey) {
      // 팬
      setInteraction({ kind: 'pan', startClient: { x: e.clientX, y: e.clientY }, startVp: vp });
      return;
    }
    if (armedCustom) {
      // 커스텀 심볼 배치 — 템플릿 노드/엣지를 클릭 위치 기준으로 오프셋
      const p = sn(clientToWorld(e.clientX, e.clientY));
      const dx = p.x - armedCustom.cx;
      const dy = p.y - armedCustom.cy;
      // 구 ID → 신 ID 매핑
      const idMap: Record<string, string> = {};
      armedCustom.nodes.forEach((n) => { idMap[n.id] = uid(); });
      const newNodes = { ...diagram.nodes };
      armedCustom.nodes.forEach((n) => {
        newNodes[idMap[n.id]] = { ...n, id: idMap[n.id], x: n.x + dx, y: n.y + dy };
      });
      const newEdges = { ...diagram.edges };
      armedCustom.edges.forEach((ed) => {
        const newId = uid();
        newEdges[newId] = {
          ...ed,
          id: newId,
          from: {
            ...ed.from,
            nodeId: ed.from.nodeId ? (idMap[ed.from.nodeId] ?? ed.from.nodeId) : undefined,
          },
          to: {
            ...ed.to,
            nodeId: ed.to.nodeId ? (idMap[ed.to.nodeId] ?? ed.to.nodeId) : undefined,
          },
        };
      });
      onChange({ ...diagram, nodes: newNodes, edges: newEdges }, true);
      onSelect(new Set(Object.values(idMap)));
      onPlaced();
      return;
    }
    if (armedSymbol) {
      // 배치
      const p = sn(clientToWorld(e.clientX, e.clientY));
      const def = SYMBOL_MAP[armedSymbol];
      const id = uid();
      const node: NodeBase = {
        id, kind: armedSymbol, x: p.x, y: p.y,
        w: def?.w ?? 80, h: def?.h ?? 60, rot: 0,
        tag: def?.tag ? `${def.tag}` : undefined,
      };
      onChange({ ...diagram, nodes: { ...diagram.nodes, [id]: node } }, true);
      onSelect(new Set([id]));
      onPlaced();
      return;
    }
    onSelect(new Set());
    setInteraction({
      kind: 'box',
      startWorld: clientToWorld(e.clientX, e.clientY),
      current:    clientToWorld(e.clientX, e.clientY),
    });
  };

  // ───────── 노드 down ─────────
  const onNodeDown = (e: RPE<SVGGElement>, id: ID) => {
    e.stopPropagation();
    if (!selection.has(id)) {
      const next = e.shiftKey ? new Set(selection).add(id) : new Set([id]);
      onSelect(next);
    }
    const startWorld = clientToWorld(e.clientX, e.clientY);
    const orig: Record<ID, Point> = {};
    const ids = e.shiftKey ? new Set(selection).add(id) : (selection.has(id) ? selection : new Set([id]));
    ids.forEach((sid) => {
      const n = diagram.nodes[sid];
      if (n) orig[sid] = { x: n.x, y: n.y };
    });
    setInteraction({ kind: 'move', startWorld, orig });
  };

  // ───────── 앵커 down → 연결 시작 ─────────
  const onAnchorDown = (e: RPE<SVGCircleElement>, nodeId: ID, anchor: AnchorName) => {
    e.stopPropagation();
    const w = clientToWorld(e.clientX, e.clientY);
    setInteraction({ kind: 'connect', from: { nodeId, anchor }, current: w });
  };

  // ───────── 전역 move/up ─────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (interaction.kind === 'idle') return;
      if (interaction.kind === 'pan') {
        const dx = e.clientX - interaction.startClient.x;
        const dy = e.clientY - interaction.startClient.y;
        setVp({ ...interaction.startVp, tx: interaction.startVp.tx + dx, ty: interaction.startVp.ty + dy });
        return;
      }
      const w = clientToWorld(e.clientX, e.clientY);
      if (interaction.kind === 'move') {
        const dx = w.x - interaction.startWorld.x;
        const dy = w.y - interaction.startWorld.y;
        const nodes = { ...diagram.nodes };
        for (const sid of Object.keys(interaction.orig)) {
          const o = interaction.orig[sid];
          const np = sn({ x: o.x + dx, y: o.y + dy });
          nodes[sid] = { ...nodes[sid], x: np.x, y: np.y };
        }
        onChange({ ...diagram, nodes }, false);
        return;
      }
      if (interaction.kind === 'connect') {
        setInteraction({ ...interaction, current: w });
        return;
      }
      if (interaction.kind === 'box') {
        setInteraction({ ...interaction, current: w });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (interaction.kind === 'move') {
        // 최종 commit 한 번
        onChange(diagram, true);
        setInteraction({ kind: 'idle' });
        return;
      }
      if (interaction.kind === 'connect') {
        const w = clientToWorld(e.clientX, e.clientY);
        const fromN = diagram.nodes[interaction.from.nodeId];
        const startW = fromN ? localToWorld(fromN, anchorLocal(fromN, interaction.from.anchor)) : w;
        const dragLen = Math.hypot(w.x - startW.x, w.y - startW.y);
        if (dragLen < 4) { setInteraction({ kind: 'idle' }); return; }

        const target = pickAnchor(e.clientX, e.clientY);
        if (target && target.nodeId === interaction.from.nodeId) {
          setInteraction({ kind: 'idle' }); return;
        }
        const id = uid();
        const newEdge = {
          id, kind: lineKind,
          from: { nodeId: interaction.from.nodeId, anchor: interaction.from.anchor },
          to: target
            ? { nodeId: target.nodeId, anchor: target.anchor }
            : { point: sn(w) },
          waypoints: [],
        };
        onChange({ ...diagram, edges: { ...diagram.edges, [id]: newEdge } }, true);
        onSelect(new Set([id]));
        setInteraction({ kind: 'idle' });
        return;
      }
      if (interaction.kind === 'box') {
        // 박스 안에 있는 노드 선택
        const a = interaction.startWorld, b = interaction.current;
        const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
        const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
        const inside = new Set<ID>();
        for (const n of Object.values(diagram.nodes)) {
          if (n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2) inside.add(n.id);
        }
        if (inside.size > 0) onSelect(inside);
        setInteraction({ kind: 'idle' });
        return;
      }
      setInteraction({ kind: 'idle' });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [interaction, diagram, vp, lineKind, onChange, onSelect]);

  // 가장 가까운 앵커를 찾아 반환 (12px 이내)
  const pickAnchor = (clientX: number, clientY: number)
      : { nodeId: ID; anchor: AnchorName } | null => {
    const w = clientToWorld(clientX, clientY);
    const RADIUS = 14 / vp.scale;
    let best: { nodeId: ID; anchor: AnchorName; d: number } | null = null;
    const names: AnchorName[] = ['n','s','e','w','ne','nw','se','sw'];
    for (const n of Object.values(diagram.nodes)) {
      for (const name of names) {
        const ap = localToWorld(n, anchorLocal(n, name));
        const d = Math.hypot(ap.x - w.x, ap.y - w.y);
        if (d <= RADIUS && (!best || d < best.d)) best = { nodeId: n.id, anchor: name, d };
      }
    }
    return best ? { nodeId: best.nodeId, anchor: best.anchor } : null;
  };

  // 진행중인 연결선의 임시 미리보기
  const preview = useMemo(() => {
    if (interaction.kind !== 'connect') return null;
    const fromN = diagram.nodes[interaction.from.nodeId];
    if (!fromN) return null;
    const a = localToWorld(fromN, anchorLocal(fromN, interaction.from.anchor));
    return { a, b: interaction.current };
  }, [interaction, diagram.nodes]);

  // 그리드 패턴 크기
  const g = diagram.meta.gridSize;
  const paper = diagram.meta.paper;

  return (
    <svg
      ref={svgRef}
      className="pnid-canvas"
      onWheel={onWheel}
      style={{ width: '100%', height: '100%', display: 'block', background: '#fff', userSelect: 'none', touchAction: 'none' }}
    >
      <Markers />
      <defs>
        <pattern id="grid-dot" width={g} height={g} patternUnits="userSpaceOnUse">
          <circle cx={0.5} cy={0.5} r={0.5} fill="#d4d4d4" />
        </pattern>
      </defs>

      <g transform={`translate(${vp.tx} ${vp.ty}) scale(${vp.scale})`}>
        {/* 종이 */}
        <rect x={0} y={0} width={paper.w} height={paper.h}
              fill="#fff" stroke="#bbb" strokeWidth={1 / vp.scale} />
        <rect x={0} y={0} width={paper.w} height={paper.h} fill="url(#grid-dot)" />

        {/* 빈 영역 hit */}
        <rect x={-10000} y={-10000} width={20000} height={20000}
              fill="transparent"
              onPointerDown={onSurfaceDown}
              style={{ cursor: (armedSymbol || armedCustom) ? 'crosshair' : 'default' }} />

        {/* edges */}
        {Object.values(diagram.edges).map((ed) => (
          <EdgeView
            key={ed.id}
            edge={ed}
            nodes={diagram.nodes}
            selected={selection.has(ed.id)}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(e.shiftKey ? new Set(selection).add(ed.id) : new Set([ed.id]));
            }}
          />
        ))}

        {/* 진행중 미리보기 */}
        {preview && (
          <line
            x1={preview.a.x} y1={preview.a.y} x2={preview.b.x} y2={preview.b.y}
            stroke="#0066cc" strokeWidth={1} strokeDasharray="4 2" pointerEvents="none"
          />
        )}

        {/* nodes */}
        {Object.values(diagram.nodes).map((n) => (
          <NodeView
            key={n.id}
            node={n}
            selected={selection.has(n.id)}
            hovered={hoverNode === n.id}
            showAnchors={selection.has(n.id) || hoverNode === n.id}
            onPointerDown={(e) => onNodeDown(e, n.id)}
            onAnchorDown={(e, a) => onAnchorDown(e, n.id, a)}
            onAnchorEnter={(a) => setHoverAnchor({ nodeId: n.id, anchor: a })}
            onAnchorLeave={() => setHoverAnchor(null)}
            onMouseEnter={() => setHoverNode(n.id)}
            onMouseLeave={() => setHoverNode((cur) => (cur === n.id ? null : cur))}
          />
        ))}

        {/* 박스 선택 */}
        {interaction.kind === 'box' && (() => {
          const a = interaction.startWorld, b = interaction.current;
          const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
          const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
          return <rect x={x} y={y} width={w} height={h}
                       fill="#0066cc11" stroke="#0066cc" strokeWidth={0.6 / vp.scale}
                       pointerEvents="none" />;
        })()}

        {/* 호버 앵커 강조 */}
        {hoverAnchor && (() => {
          const n = diagram.nodes[hoverAnchor.nodeId];
          if (!n) return null;
          const p = localToWorld(n, anchorLocal(n, hoverAnchor.anchor));
          return <circle cx={p.x} cy={p.y} r={6} fill="none" stroke="#0066cc" strokeWidth={1.2} pointerEvents="none" />;
        })()}
      </g>
    </svg>
  );
}
