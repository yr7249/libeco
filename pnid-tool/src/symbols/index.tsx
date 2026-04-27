// =============================================================
// 심볼 레지스트리 — 모두 흑백 (stroke #111, fill #fff)
// 각 심볼은 (-w/2, -h/2) ~ (w/2, h/2) 로컬 좌표에 그립니다.
// =============================================================
import type { ReactNode } from 'react';
import type { AnchorName, NodeBase, Point } from '../editor/types';

export interface SymbolDef {
  id: string;
  label: string;
  category: '용기' | '열교환' | '회전기계' | '전장' | '밸브' | '계측' | '기타' | '도형' | '사용자';
  w: number; h: number;
  tag: string;             // 기본 태그 prefix (예: 'PV','MV','TC')
  /** true 면 NodeView 가 외부에 태그를 안 그림 (심볼 내부에서 직접 그릴 때) */
  internalTag?: boolean;
  /** 8 표준 앵커 외에 추가 앵커가 필요할 때 (옵션) */
  extraAnchors?: { name: AnchorName | string; pt: Point }[];
  render: (n: NodeBase) => ReactNode;
}

// 공통 stroke
const S = '#111';
const stroke = (w = 1.0): React.CSSProperties => ({
  fill: '#fff', stroke: S, strokeWidth: w,
});
const dashed = (w = 0.8): React.CSSProperties => ({
  fill: 'none', stroke: S, strokeWidth: w, strokeDasharray: '3 2',
});

// ───────────────── 용기 ─────────────────
const vesselCapsule: SymbolDef = {
  id: 'vessel-capsule', label: '이중진공 압력용기 (캡슐)', category: '용기',
  w: 220, h: 90, tag: 'PV',
  render: (n) => {
    const w = n.w, h = n.h, r = h / 2;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w} height={h} rx={r} ry={r} style={stroke(1.2)} />
        <rect x={-w/2 + 6} y={-h/2 + 6} width={w - 12} height={h - 12}
              rx={r - 6} ry={r - 6} style={dashed(0.8)} />
      </>
    );
  },
};
const tankRR: SymbolDef = {
  id: 'tank', label: '버퍼탱크 (둥근 사각)', category: '용기',
  w: 100, h: 140, tag: 'TK',
  render: (n) => <rect x={-n.w/2} y={-n.h/2} width={n.w} height={n.h} rx={10} ry={10} style={stroke(1.2)} />,
};
const vessel: SymbolDef = {
  id: 'vessel', label: '용기 (수직)', category: '용기',
  w: 80, h: 140, tag: 'V',
  render: (n) => {
    const w = n.w, h = n.h, r = w / 2;
    return (
      <>
        <rect x={-w/2} y={-h/2 + r} width={w} height={h - w} style={stroke(1.2)} />
        <path d={`M ${-w/2} ${-h/2 + r} A ${r} ${r} 0 0 1 ${w/2} ${-h/2 + r}`} style={stroke(1.2)} />
        <path d={`M ${-w/2} ${ h/2 - r} A ${r} ${r} 0 0 0 ${w/2} ${ h/2 - r}`} style={stroke(1.2)} />
      </>
    );
  },
};

// ───────────────── 열교환 ─────────────────
const hx: SymbolDef = {
  id: 'hx', label: '열교환기 (셸&튜브)', category: '열교환',
  w: 130, h: 60, tag: 'E',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w} height={h} rx={6} ry={6} style={stroke(1.2)} />
        <line x1={-w/2 + 8} y1={0} x2={w/2 - 8} y2={0} style={{ stroke: S, strokeWidth: 0.9 }} />
        <line x1={-w/2 + 8} y1={-h/4} x2={w/2 - 8} y2={-h/4} style={{ stroke: S, strokeWidth: 0.9 }} />
        <line x1={-w/2 + 8} y1={ h/4} x2={w/2 - 8} y2={ h/4} style={{ stroke: S, strokeWidth: 0.9 }} />
      </>
    );
  },
};
const hxZig: SymbolDef = {
  id: 'hx-zig', label: '인라인 HX (지그재그)', category: '열교환',
  w: 110, h: 28, tag: 'HX',
  render: (n) => {
    const w = n.w;
    const half = w * 0.35;
    let d = `M ${-w/2} 0 L ${-half} 0`;
    const steps = 6;
    const stepW = (half * 2) / steps;
    for (let i = 0; i < steps; i++) {
      const x0 = -half + i * stepW;
      const y0 = i % 2 === 0 ? -8 : 8;
      d += ` L ${x0 + stepW / 2} ${y0}`;
    }
    d += ` L ${half} 0 L ${w/2} 0`;
    return <path d={d} style={{ fill: 'none', stroke: S, strokeWidth: 1.0 }} />;
  },
};
const heaterCoil: SymbolDef = {
  id: 'heater', label: '히터 (코일)', category: '열교환',
  w: 100, h: 26, tag: 'HR',
  render: (n) => {
    const w = n.w;
    const steps = 8;
    const sw = w / steps;
    let d = `M ${-w/2} 0`;
    for (let i = 0; i < steps; i++) {
      const x0 = -w/2 + i * sw;
      d += ` L ${x0 + sw/2} ${i % 2 === 0 ? -10 : 10} L ${x0 + sw} 0`;
    }
    return (
      <>
        <path d={d} style={{ fill: 'none', stroke: S, strokeWidth: 1.0 }} />
        <line x1={-w/2 - 4} y1={12} x2={w/2 + 4} y2={12} style={{ stroke: S, strokeWidth: 0.6 }} />
      </>
    );
  },
};

// ───────────────── 회전기계 / 전장 ─────────────────
const pump: SymbolDef = {
  id: 'pump', label: '펌프 (원심)', category: '회전기계',
  w: 60, h: 60, tag: 'P',
  render: (n) => {
    const r = Math.min(n.w, n.h) / 2;
    return (
      <>
        <circle r={r} style={stroke(1.2)} />
        <path d={`M 0 ${-r} L ${r} 0 L 0 ${r}`} style={stroke(1.0)} />
      </>
    );
  },
};
const compressor: SymbolDef = {
  id: 'compressor', label: '압축기', category: '회전기계',
  w: 70, h: 60, tag: 'C',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <path d={`M ${-w/2} ${-h/2} L ${w/2} ${-h/4} L ${w/2} ${h/4} L ${-w/2} ${h/2} Z`} style={stroke(1.2)} />
        <text x={0} y={4} textAnchor="middle" fontSize={10} fill={S}>C</text>
      </>
    );
  },
};
const fuelCell: SymbolDef = {
  id: 'fuel-cell', label: '연료전지 스택', category: '전장',
  w: 120, h: 70, tag: 'FC',
  render: (n) => {
    const w = n.w, h = n.h;
    const cells = 6;
    const sw = w / cells;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w} height={h} style={stroke(1.2)} />
        {Array.from({ length: cells - 1 }, (_, i) => (
          <line key={i} x1={-w/2 + (i+1) * sw} y1={-h/2} x2={-w/2 + (i+1) * sw} y2={h/2}
                style={{ stroke: S, strokeWidth: 0.6 }} />
        ))}
        <text x={0} y={-h/2 - 4} textAnchor="middle" fontSize={9} fill={S}>FC</text>
      </>
    );
  },
};
const battery: SymbolDef = {
  id: 'battery', label: '배터리', category: '전장',
  w: 90, h: 60, tag: 'BAT',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w} height={h} style={stroke(1.2)} />
        <line x1={-w/2 + w*0.25} y1={-h/2 + 6} x2={-w/2 + w*0.25} y2={h/2 - 6} style={{ stroke: S, strokeWidth: 1.0 }} />
        <line x1={-w/2 + w*0.5}  y1={-h/2 + 10} x2={-w/2 + w*0.5}  y2={h/2 - 10} style={{ stroke: S, strokeWidth: 0.6 }} />
        <line x1={-w/2 + w*0.75} y1={-h/2 + 6} x2={-w/2 + w*0.75} y2={h/2 - 6} style={{ stroke: S, strokeWidth: 1.0 }} />
        <text x={0} y={h/2 + 12} textAnchor="middle" fontSize={9} fill={S}>BAT</text>
      </>
    );
  },
};
const eAxle: SymbolDef = {
  id: 'e-axle', label: 'E-Axle (구동계)', category: '전장',
  w: 130, h: 60, tag: 'EAX',
  render: (n) => {
    const w = n.w, h = n.h;
    const r = h * 0.45;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w * 0.6} height={h} style={stroke(1.2)} />
        <text x={-w/2 + w*0.3} y={4} textAnchor="middle" fontSize={11} fill={S}>M</text>
        <line x1={-w/2 + w*0.6} y1={0} x2={w/2 - r*1.4} y2={0} style={{ stroke: S, strokeWidth: 1.0 }} />
        <circle cx={w/2 - r} cy={0} r={r} style={stroke(1.2)} />
        <text x={w/2 - r} y={4} textAnchor="middle" fontSize={9} fill={S}>GR</text>
      </>
    );
  },
};
const radiator: SymbolDef = {
  id: 'radiator', label: '라디에이터', category: '열교환',
  w: 110, h: 70, tag: 'RAD',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w} height={h} style={stroke(1.2)} />
        {Array.from({ length: 7 }, (_, i) => {
          const x = -w/2 + (i + 1) * (w / 8);
          return <line key={i} x1={x} y1={-h/2 + 4} x2={x} y2={h/2 - 4} style={{ stroke: S, strokeWidth: 0.6 }} />;
        })}
      </>
    );
  },
};

// ───────────────── 밸브 ─────────────────
const valve2: SymbolDef = {
  id: 'valve-2way', label: '2-way 밸브', category: '밸브',
  w: 50, h: 30, tag: 'V',
  render: (n) => {
    const w = n.w, h = n.h;
    return <path d={`M ${-w/2} ${-h/2} L ${w/2} ${h/2} L ${w/2} ${-h/2} L ${-w/2} ${h/2} Z`} style={stroke(1.2)} />;
  },
};
const valve3: SymbolDef = {
  id: 'valve-3way', label: '3-way 밸브', category: '밸브',
  w: 50, h: 50, tag: 'V',
  extraAnchors: [{ name: 'tee', pt: { x: 0, y: -25 } }],
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <path d={`M ${-w/2} ${0} L ${w/2} ${-h/4} L ${w/2} ${h/4} Z`} style={stroke(1.2)} />
        <path d={`M ${ w/2} ${0} L ${-w/2} ${-h/4} L ${-w/2} ${h/4} Z`} style={stroke(1.2)} />
        <path d={`M ${0} ${-h/2} L ${-h/4} ${0} L ${h/4} ${0} Z`} style={stroke(1.2)} />
      </>
    );
  },
};
const checkValve: SymbolDef = {
  id: 'check-valve', label: '체크밸브 (CV)', category: '밸브',
  w: 50, h: 30, tag: 'CV',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <path d={`M ${-w/2} ${-h/2} L ${w/2} ${h/2} L ${w/2} ${-h/2} L ${-w/2} ${h/2} Z`} style={stroke(1.2)} />
        <circle cx={0} cy={0} r={3} style={{ fill: S }} />
      </>
    );
  },
};
const psv: SymbolDef = {
  id: 'psv', label: 'PSV (안전밸브)', category: '밸브',
  w: 40, h: 60, tag: 'PSV',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <path d={`M ${-w/2} ${0} L ${w/2} ${-h/4} L ${w/2} ${h/4} Z`} style={stroke(1.2)} />
        <line x1={0} y1={-h/4} x2={0} y2={-h/2} style={{ stroke: S, strokeWidth: 1.0 }} />
        <line x1={-w/3} y1={-h/2} x2={w/3} y2={-h/2} style={{ stroke: S, strokeWidth: 1.0 }} />
      </>
    );
  },
};
const mv: SymbolDef = {
  id: 'mv', label: '수동밸브 MV', category: '밸브',
  w: 50, h: 40, tag: 'MV',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <path d={`M ${-w/2} ${-h/4} L ${w/2} ${h/4} L ${w/2} ${-h/4} L ${-w/2} ${h/4} Z`} style={stroke(1.2)} />
        <line x1={0} y1={0} x2={0} y2={-h/2} style={{ stroke: S, strokeWidth: 1.0 }} />
        <line x1={-w/4} y1={-h/2} x2={w/4} y2={-h/2} style={{ stroke: S, strokeWidth: 1.0 }} />
      </>
    );
  },
};
const controlValve: SymbolDef = {
  id: 'control-valve', label: '컨트롤밸브 (CV)', category: '밸브',
  w: 50, h: 50, tag: 'FCV',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <path d={`M ${-w/2} ${-h/4 + 6} L ${w/2} ${h/4 + 6} L ${w/2} ${-h/4 + 6} L ${-w/2} ${h/4 + 6} Z`} style={stroke(1.2)} />
        <line x1={0} y1={6} x2={0} y2={-h/2 + 6} style={{ stroke: S, strokeWidth: 1.0 }} />
        <rect x={-10} y={-h/2 - 4} width={20} height={10} style={stroke(1.0)} />
      </>
    );
  },
};

// ───────────────── 계측기기 ─────────────────
const inst = (id: string, tag: string, label: string, square = false): SymbolDef => ({
  id, label, category: '계측', w: 36, h: 36, tag, internalTag: true,
  render: (n) => {
    const r = Math.min(n.w, n.h) / 2;
    const t  = n.tag ?? tag;
    const m  = t.match(/^([A-Za-z]+)([0-9A-Za-z\-]*)$/);
    const top = m?.[1] ?? t;
    const bot = m?.[2] ?? '';
    return (
      <>
        {square
          ? <rect x={-r} y={-r} width={r*2} height={r*2} style={stroke(1.0)} />
          : <circle r={r} style={stroke(1.0)} />}
        <line x1={-r} y1={0} x2={r} y2={0} style={{ stroke: S, strokeWidth: 0.5 }} />
        <text x={0} y={-3} textAnchor="middle" fontSize={9} fill={S} fontWeight={600}>{top}</text>
        {bot && <text x={0} y={9} textAnchor="middle" fontSize={8} fill={S}>{bot}</text>}
      </>
    );
  },
});

const tc  = inst('tc',  'TC',  '온도센서 (TC)');
const pt  = inst('pt',  'PT',  '압력 트랜스미터 (PT)', true);
const pg  = inst('pg',  'PG',  '압력 게이지 (PG)');
const mfc = inst('mfc', 'MFC', '질량유량 제어기 (MFC)', true);
const mfm = inst('mfm', 'MFM', '질량유량계 (MFM)');
const ti  = inst('ti',  'TI',  '온도 지시기 (TI)');
const pi  = inst('pi',  'PI',  '압력 지시기 (PI)');
const fi  = inst('fi',  'FI',  '유량 지시기 (FI)');
const li  = inst('li',  'LI',  '레벨 지시기 (LI)');

// ───────────────── 기타 ─────────────────
const filter: SymbolDef = {
  id: 'filter', label: '필터', category: '기타',
  w: 60, h: 36, tag: 'F',
  render: (n) => {
    const w = n.w, h = n.h;
    return (
      <>
        <rect x={-w/2} y={-h/2} width={w} height={h} style={stroke(1.0)} />
        <text x={0} y={4} textAnchor="middle" fontSize={11} fill={S}>F</text>
      </>
    );
  },
};
const reducer: SymbolDef = {
  id: 'reducer', label: '리듀서', category: '기타',
  w: 50, h: 30, tag: 'R',
  render: (n) => {
    const w = n.w, h = n.h;
    return <path d={`M ${-w/2} ${-h/2} L ${w/2} ${-h/4} L ${w/2} ${h/4} L ${-w/2} ${h/2} Z`} style={stroke(1.0)} />;
  },
};
const flange: SymbolDef = {
  id: 'flange', label: '플랜지', category: '기타',
  w: 14, h: 30, tag: '',
  render: (n) => <rect x={-n.w/2} y={-n.h/2} width={n.w} height={n.h} style={stroke(1.0)} />,
};

// ───────────────── 도형 (Free) ─────────────────
const rectShape: SymbolDef = {
  id: 'rect', label: '사각형', category: '도형', w: 100, h: 60, tag: '',
  render: (n) => <rect x={-n.w/2} y={-n.h/2} width={n.w} height={n.h} style={stroke(1.0)} />,
};
const roundedRect: SymbolDef = {
  id: 'rrect', label: '둥근 사각형', category: '도형', w: 100, h: 60, tag: '',
  render: (n) => <rect x={-n.w/2} y={-n.h/2} width={n.w} height={n.h} rx={8} ry={8} style={stroke(1.0)} />,
};
const ellipseShape: SymbolDef = {
  id: 'ellipse', label: '타원', category: '도형', w: 100, h: 60, tag: '',
  render: (n) => <ellipse rx={n.w/2} ry={n.h/2} style={stroke(1.0)} />,
};
const capsuleShape: SymbolDef = {
  id: 'capsule', label: '캡슐', category: '도형', w: 120, h: 50, tag: '',
  render: (n) => <rect x={-n.w/2} y={-n.h/2} width={n.w} height={n.h} rx={n.h/2} ry={n.h/2} style={stroke(1.0)} />,
};
const textShape: SymbolDef = {
  id: 'text', label: '텍스트', category: '도형', w: 120, h: 24, tag: '',
  render: (n) => {
    const t = (n.props?.text as string) ?? '텍스트';
    const fs = (n.props?.fontSize as number) ?? 13;
    return <text x={0} y={fs/3} textAnchor="middle" fontSize={fs} fill={S}>{t}</text>;
  },
};

export const SYMBOLS: SymbolDef[] = [
  // 용기
  vesselCapsule, tankRR, vessel,
  // 열교환
  hx, hxZig, heaterCoil, radiator,
  // 회전기계
  pump, compressor,
  // 전장
  fuelCell, battery, eAxle,
  // 밸브
  valve2, valve3, checkValve, psv, mv, controlValve,
  // 계측
  tc, pt, pg, mfc, mfm, ti, pi, fi, li,
  // 기타
  filter, reducer, flange,
  // 도형
  rectShape, roundedRect, ellipseShape, capsuleShape, textShape,
];

export const SYMBOL_MAP: Record<string, SymbolDef> =
  Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));

export const SYMBOL_CATEGORIES: SymbolDef['category'][] =
  ['용기','열교환','회전기계','전장','밸브','계측','기타','도형'];
