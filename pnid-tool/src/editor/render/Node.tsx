import type { CSSProperties, PointerEvent } from 'react';
import type { NodeBase, AnchorName } from '../types';
import { SYMBOL_MAP } from '../../symbols';
import { getRegistryDef } from '../customSymbolRegistry';
import { anchorLocal, getNodeAnchorNames } from '../geometry';

interface Props {
  node: NodeBase;
  selected: boolean;
  hovered: boolean;
  showAnchors: boolean;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
  onAnchorDown: (e: PointerEvent<SVGCircleElement>, anchor: AnchorName) => void;
  onAnchorEnter: (anchor: AnchorName) => void;
  onAnchorLeave: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}


export function NodeView({
  node, selected, hovered, showAnchors,
  onPointerDown, onAnchorDown, onAnchorEnter, onAnchorLeave,
  onMouseEnter, onMouseLeave,
}: Props) {
  const def = SYMBOL_MAP[node.kind] ?? getRegistryDef(node.kind);
  const anchorNames = getNodeAnchorNames(node);
  const sx = node.flipX ? -1 : 1;
  const sy = node.flipY ? -1 : 1;
  const transform = `translate(${node.x} ${node.y}) rotate(${node.rot}) scale(${sx} ${sy})`;

  const ringStyle: CSSProperties = selected
    ? { fill: 'none', stroke: '#888', strokeWidth: 0.6, strokeDasharray: '3 2' }
    : hovered
      ? { fill: 'none', stroke: '#bbb', strokeWidth: 0.6 }
      : { display: 'none' };

  return (
    <g
      transform={transform}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: node.locked ? 'default' : 'move' }}
    >
      {/* 선택/호버 윤곽 */}
      <rect
        x={-node.w/2 - 4} y={-node.h/2 - 4}
        width={node.w + 8} height={node.h + 8}
        style={ringStyle}
      />

      {/* 심볼 본체 (없으면 빈 사각형) */}
      {def ? def.render(node) : (
        <rect x={-node.w/2} y={-node.h/2} width={node.w} height={node.h}
              style={{ fill: '#fff', stroke: '#111', strokeWidth: 1 }} />
      )}

      {/* 태그 라벨 (심볼이 직접 그리는 경우 생략) */}
      {node.tag && !def?.internalTag && (
        <text
          x={0} y={node.h/2 + 12}
          textAnchor="middle"
          fontSize={11}
          fill="#111"
          transform={`scale(${sx} ${sy})`}  /* 좌우 뒤집힘 보정 */
        >
          {node.tag}
        </text>
      )}
      {node.rating && (
        <text
          x={0} y={node.h/2 + 24}
          textAnchor="middle"
          fontSize={9}
          fill="#555"
          transform={`scale(${sx} ${sy})`}
        >
          {node.rating}
        </text>
      )}

      {/* 스마트 앵커 (호버/선택 시) */}
      {showAnchors && anchorNames.map((a) => {
        const p = anchorLocal(node, a as AnchorName);
        return (
          <circle
            key={a}
            cx={p.x} cy={p.y} r={4}
            fill="#fff"
            stroke="#0066cc"
            strokeWidth={1.2}
            style={{ cursor: 'crosshair' }}
            onPointerDown={(e) => onAnchorDown(e, a as AnchorName)}
            onMouseEnter={() => onAnchorEnter(a as AnchorName)}
            onMouseLeave={onAnchorLeave}
          />
        );
      })}
    </g>
  );
}
