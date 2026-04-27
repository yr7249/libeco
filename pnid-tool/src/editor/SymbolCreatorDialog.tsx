/**
 * 심볼 에디터 다이얼로그
 * - 논리 좌표계: 중심 (0,0), 범위 ±EDITOR_W/2 × ±EDITOR_H/2
 * - 도형: rect / ellipse / line / text
 * - 앵커: 이름 붙은 연결점 (파이프가 붙는 위치)
 */
import { useRef, useState } from 'react';
import type { PointerEvent as RPE } from 'react';
import type { StoredCustomSymbolDef, SymbolShape, SymbolAnchor } from './types';
import { SYM_EDITOR_W, SYM_EDITOR_H } from './types';
import { uid } from './types';

const SCALE = 2;
const DW = SYM_EDITOR_W * SCALE; // 400
const DH = SYM_EDITOR_H * SCALE; // 240
const GRID = 10; // 논리 단위

type Tool = 'select' | 'rect' | 'ellipse' | 'line' | 'text' | 'anchor';

interface DragState {
  startX: number; startY: number;
  curX: number;   curY: number;
}

interface Props {
  initial?: StoredCustomSymbolDef;
  onSave: (def: StoredCustomSymbolDef) => void;
  onClose: () => void;
}

// ── 좌표 변환 ─────────────────────────────────────────────────────
function toDisplay(lx: number, ly: number): { x: number; y: number } {
  return { x: lx * SCALE + DW / 2, y: ly * SCALE + DH / 2 };
}
function snapL(v: number) { return Math.round(v / GRID) * GRID; }

function clientToLogical(e: PointerEvent | MouseEvent, el: SVGSVGElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const lx = snapL((e.clientX - rect.left - DW / 2) / SCALE);
  const ly = snapL((e.clientY - rect.top  - DH / 2) / SCALE);
  return { x: lx, y: ly };
}

// ── 미리보기 렌더링 ───────────────────────────────────────────────
function renderShapePreview(s: SymbolShape, display = false) {
  const d = display;
  const sc = SCALE;
  const S = '#111';
  const style = { fill: '#fff', stroke: S, strokeWidth: 1 };
  switch (s.type) {
    case 'rect': {
      const x = (s.x ?? 0) * (d ? sc : 1) + (d ? DW / 2 : 0);
      const y = (s.y ?? 0) * (d ? sc : 1) + (d ? DH / 2 : 0);
      return <rect key={s.id} x={x} y={y} width={(s.w ?? 10) * (d ? sc : 1)} height={(s.h ?? 10) * (d ? sc : 1)} style={style} />;
    }
    case 'ellipse': {
      const cx = (s.cx ?? 0) * (d ? sc : 1) + (d ? DW / 2 : 0);
      const cy = (s.cy ?? 0) * (d ? sc : 1) + (d ? DH / 2 : 0);
      return <ellipse key={s.id} cx={cx} cy={cy} rx={(s.rx ?? 5) * (d ? sc : 1)} ry={(s.ry ?? 5) * (d ? sc : 1)} style={style} />;
    }
    case 'line': {
      const x1 = (s.x1 ?? 0) * (d ? sc : 1) + (d ? DW / 2 : 0);
      const y1 = (s.y1 ?? 0) * (d ? sc : 1) + (d ? DH / 2 : 0);
      const x2 = (s.x2 ?? 10) * (d ? sc : 1) + (d ? DW / 2 : 0);
      const y2 = (s.y2 ?? 0) * (d ? sc : 1) + (d ? DH / 2 : 0);
      return <line key={s.id} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: S, strokeWidth: 1 }} />;
    }
    case 'text': {
      const x = (s.x ?? 0) * (d ? sc : 1) + (d ? DW / 2 : 0);
      const y = (s.y ?? 0) * (d ? sc : 1) + (d ? DH / 2 : 0);
      return (
        <text key={s.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize={(s.fontSize ?? 12) * (d ? sc : 1)} fill={S}>
          {s.content ?? ''}
        </text>
      );
    }
    default: return null;
  }
}

function renderDrag(tool: Tool, drag: DragState): JSX.Element | null {
  const { startX: sx, startY: sy, curX: cx, curY: cy } = drag;
  const style = { fill: '#e8f0fe', stroke: '#0066cc', strokeWidth: 1, strokeDasharray: '4 2' };
  switch (tool) {
    case 'rect': {
      const x = Math.min(sx, cx), y = Math.min(sy, cy);
      const w = Math.abs(cx - sx), h = Math.abs(cy - sy);
      return <rect x={x * SCALE + DW / 2} y={y * SCALE + DH / 2} width={w * SCALE} height={h * SCALE} style={style} />;
    }
    case 'ellipse': {
      const ecx = (sx + cx) / 2, ecy = (sy + cy) / 2;
      const erx = Math.abs(cx - sx) / 2, ery = Math.abs(cy - sy) / 2;
      return <ellipse cx={ecx * SCALE + DW / 2} cy={ecy * SCALE + DH / 2} rx={erx * SCALE} ry={ery * SCALE} style={style} />;
    }
    case 'line':
      return <line x1={sx * SCALE + DW / 2} y1={sy * SCALE + DH / 2}
                   x2={cx * SCALE + DW / 2} y2={cy * SCALE + DH / 2}
                   style={{ stroke: '#0066cc', strokeWidth: 1.5, strokeDasharray: '4 2' }} />;
    default: return null;
  }
}

// ── 그리드 라인 ───────────────────────────────────────────────────
function GridLines() {
  const lines: JSX.Element[] = [];
  const hw = SYM_EDITOR_W / 2, hh = SYM_EDITOR_H / 2;
  for (let x = -hw; x <= hw; x += GRID) {
    const dx = x * SCALE + DW / 2;
    lines.push(
      <line key={`v${x}`} x1={dx} y1={0} x2={dx} y2={DH}
            stroke={x === 0 ? '#aaa' : '#e0e0e0'} strokeWidth={x === 0 ? 1 : 0.5} />
    );
  }
  for (let y = -hh; y <= hh; y += GRID) {
    const dy = y * SCALE + DH / 2;
    lines.push(
      <line key={`h${y}`} x1={0} y1={dy} x2={DW} y2={dy}
            stroke={y === 0 ? '#aaa' : '#e0e0e0'} strokeWidth={y === 0 ? 1 : 0.5} />
    );
  }
  return <>{lines}</>;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function SymbolCreatorDialog({ initial, onSave, onClose }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const [name, setName] = useState(initial?.name ?? '새 심볼');
  const [tag, setTag]   = useState(initial?.tag ?? '');
  const [tool, setTool] = useState<Tool>('rect');
  const [shapes, setShapes]   = useState<SymbolShape[]>(initial?.shapes ?? []);
  const [anchors, setAnchors] = useState<SymbolAnchor[]>(
    initial?.anchors ?? [
      { id: uid(), name: 'w', x: -SYM_EDITOR_W / 2, y: 0 },
      { id: uid(), name: 'e', x:  SYM_EDITOR_W / 2, y: 0 },
    ]
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // ── 포인터 이벤트 ───────────────────────────────────────────────
  const onSvgDown = (e: RPE<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const p = clientToLogical(e.nativeEvent, svgRef.current);

    if (tool === 'anchor') {
      const anchorName = prompt('앵커 이름 입력\n(예: inlet, outlet, vent, n, s, e, w)');
      if (!anchorName?.trim()) return;
      setAnchors((prev) => [...prev, { id: uid(), name: anchorName.trim(), x: p.x, y: p.y }]);
      return;
    }
    if (tool === 'text') {
      const content = prompt('텍스트 내용 입력:');
      if (!content?.trim()) return;
      const shape: SymbolShape = { id: uid(), type: 'text', x: p.x, y: p.y, content: content.trim(), fontSize: 12 };
      setShapes((prev) => [...prev, shape]);
      return;
    }
    if (tool === 'select') return;

    setDrag({ startX: p.x, startY: p.y, curX: p.x, curY: p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSvgMove = (e: RPE<SVGSVGElement>) => {
    if (!drag || !svgRef.current) return;
    const p = clientToLogical(e.nativeEvent, svgRef.current);
    setDrag((d) => d ? { ...d, curX: p.x, curY: p.y } : null);
  };

  const onSvgUp = () => {
    if (!drag) return;
    const { startX: sx, startY: sy, curX: cx, curY: cy } = drag;
    const minDist = 4;
    if (Math.hypot(cx - sx, cy - sy) < minDist) { setDrag(null); return; }

    let shape: SymbolShape | null = null;
    switch (tool) {
      case 'rect':
        shape = {
          id: uid(), type: 'rect',
          x: Math.min(sx, cx), y: Math.min(sy, cy),
          w: Math.abs(cx - sx), h: Math.abs(cy - sy),
        };
        break;
      case 'ellipse':
        shape = {
          id: uid(), type: 'ellipse',
          cx: (sx + cx) / 2, cy: (sy + cy) / 2,
          rx: Math.abs(cx - sx) / 2, ry: Math.abs(cy - sy) / 2,
        };
        break;
      case 'line':
        shape = { id: uid(), type: 'line', x1: sx, y1: sy, x2: cx, y2: cy };
        break;
    }
    if (shape) setShapes((prev) => [...prev, shape!]);
    setDrag(null);
  };

  // ── 삭제 ────────────────────────────────────────────────────────
  const deleteSelected = () => {
    if (!selected) return;
    setShapes((p) => p.filter((s) => s.id !== selected));
    setAnchors((p) => p.filter((a) => a.id !== selected));
    setSelected(null);
  };

  // ── 저장 ────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim()) { alert('심볼 이름을 입력하세요'); return; }
    const def: StoredCustomSymbolDef = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      tag: tag.trim(),
      shapes,
      anchors,
    };
    onSave(def);
  };

  const TOOLS: { id: Tool; label: string; hint: string }[] = [
    { id: 'select', label: '선택', hint: '도형 선택/삭제' },
    { id: 'rect',   label: '사각', hint: '드래그로 사각형 그리기' },
    { id: 'ellipse',label: '원',   hint: '드래그로 타원 그리기' },
    { id: 'line',   label: '선',   hint: '드래그로 선 그리기' },
    { id: 'text',   label: '텍스트',hint: '클릭 후 텍스트 입력' },
    { id: 'anchor', label: '앵커', hint: '클릭으로 연결점 배치' },
  ];

  return (
    <div className="ph-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sc-dialog">
        {/* 헤더 */}
        <div className="sc-header">
          <strong>심볼 만들기</strong>
          <div className="sc-meta">
            <label>이름<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>태그<input value={tag} style={{ width: 60 }} onChange={(e) => setTag(e.target.value)} placeholder="예: V" /></label>
          </div>
          <button className="sc-close" onClick={onClose}>✕</button>
        </div>

        {/* 도구바 */}
        <div className="sc-tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`sc-tool ${tool === t.id ? 'on' : ''}`}
              title={t.hint}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
          {selected && (
            <button className="sc-tool danger" onClick={deleteSelected} title="선택 삭제">
              삭제
            </button>
          )}
          <span className="sc-hint">
            {tool === 'select' ? '도형/앵커를 클릭해 선택, Delete로 삭제'
              : tool === 'anchor' ? '클릭 → 이름 입력 → 연결점 추가'
              : tool === 'text' ? '클릭 → 텍스트 입력'
              : '드래그로 그리기 · 격자 스냅 10px'}
          </span>
        </div>

        {/* 본문 */}
        <div className="sc-body">
          {/* SVG 에디터 */}
          <svg
            ref={svgRef}
            className="sc-canvas"
            width={DW}
            height={DH}
            onPointerDown={onSvgDown}
            onPointerMove={onSvgMove}
            onPointerUp={onSvgUp}
            style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          >
            {/* 배경 + 그리드 */}
            <rect width={DW} height={DH} fill="#fafafa" />
            <GridLines />
            {/* 심볼 영역 표시 (흰 박스) */}
            <rect
              x={DW / 2 - SYM_EDITOR_W / 2 * SCALE}
              y={DH / 2 - SYM_EDITOR_H / 2 * SCALE}
              width={SYM_EDITOR_W * SCALE}
              height={SYM_EDITOR_H * SCALE}
              fill="#fff"
              stroke="#ccc"
              strokeWidth={1}
            />

            {/* 도형들 */}
            {shapes.map((s) => (
              <g
                key={s.id}
                onClick={tool === 'select' ? () => setSelected(s.id === selected ? null : s.id) : undefined}
                style={{ cursor: tool === 'select' ? 'pointer' : undefined }}
              >
                {renderShapePreview(s, true)}
                {selected === s.id && (() => {
                  // 선택 하이라이트 오버레이
                  return <rect
                    key="sel"
                    x={(s.x ?? s.cx ?? s.x1 ?? 0) * SCALE + DW / 2 - 3}
                    y={(s.y ?? s.cy ?? s.y1 ?? 0) * SCALE + DH / 2 - 3}
                    width={6} height={6}
                    fill="#0066cc" opacity={0.5} pointerEvents="none"
                  />;
                })()}
              </g>
            ))}

            {/* 드래그 미리보기 */}
            {drag && renderDrag(tool, drag)}

            {/* 앵커들 */}
            {anchors.map((a) => {
              const dp = toDisplay(a.x, a.y);
              const isSel = selected === a.id;
              return (
                <g
                  key={a.id}
                  onClick={tool === 'select' ? () => setSelected(a.id === selected ? null : a.id) : undefined}
                  style={{ cursor: tool === 'select' ? 'pointer' : undefined }}
                >
                  <circle cx={dp.x} cy={dp.y} r={6}
                    fill={isSel ? '#0066cc' : '#e8f0fe'}
                    stroke="#0066cc" strokeWidth={1.5} />
                  <text x={dp.x} y={dp.y - 9} textAnchor="middle"
                    fontSize={9} fill="#0066cc" fontWeight={600}>
                    {a.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* 앵커 목록 패널 */}
          <div className="sc-anchor-panel">
            <div className="sc-anchor-title">앵커 (연결점)</div>
            <ul className="sc-anchor-list">
              {anchors.map((a) => (
                <li key={a.id} className={selected === a.id ? 'sel' : ''}>
                  <button
                    className="sc-anchor-name"
                    onClick={() => setSelected(a.id === selected ? null : a.id)}
                  >
                    ● {a.name}
                  </button>
                  <span className="sc-anchor-pos">
                    ({Math.round(a.x)}, {Math.round(a.y)})
                  </span>
                  <button
                    className="sc-anchor-del"
                    onClick={() => setAnchors((p) => p.filter((x) => x.id !== a.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="sc-anchor-tip">
              "앵커" 도구 선택 후<br />캔버스 클릭으로 추가
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="sc-footer ph-actions">
          <button className="primary" onClick={handleSave}>저장</button>
          <button onClick={onClose}>취소</button>
          {shapes.length > 0 && (
            <button
              style={{ marginLeft: 'auto', color: '#b42318', border: '1px solid #b42318' }}
              onClick={() => { if (confirm('도형을 모두 지울까요?')) { setShapes([]); setSelected(null); } }}
            >
              전체 지우기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
