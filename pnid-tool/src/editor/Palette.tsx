import { useMemo, useState } from 'react';
import { SYMBOLS, SYMBOL_CATEGORIES, SymbolDef } from '../symbols';
import { SYMBOL_MAP } from '../symbols';
import type { CustomSymbolTemplate, NodeBase } from './types';

interface Props {
  armedSymbol: string | null;
  onArm: (id: string | null) => void;
  customSymbols: CustomSymbolTemplate[];
  armedCustomId: string | null;
  onArmCustom: (tpl: CustomSymbolTemplate | null) => void;
  onDeleteCustom: (id: string) => void;
  /** 심볼 에디터로 만든 정식 심볼 */
  registryDefs: SymbolDef[];
  onEditRegistryDef: (id: string) => void;
  onDeleteRegistryDef: (id: string) => void;
}

function MiniIcon({ def }: { def: SymbolDef }) {
  const W = 56, H = 40, pad = 4;
  const sx = (W - pad * 2) / def.w;
  const sy = (H - pad * 2) / def.h;
  const s = Math.min(sx, sy);
  return (
    <svg width={W} height={H} viewBox={`${-W/2} ${-H/2} ${W} ${H}`}>
      <g transform={`scale(${s})`}>
        {def.render({
          id: '_', kind: def.id, x: 0, y: 0, w: def.w, h: def.h, rot: 0,
        })}
      </g>
    </svg>
  );
}

function CustomMiniIcon({ tpl }: { tpl: CustomSymbolTemplate }) {
  const W = 56, H = 40, pad = 4;
  if (tpl.nodes.length === 0) {
    return <svg width={W} height={H}><rect width={W} height={H} fill="#f0f0f0" /></svg>;
  }
  const bw = tpl.bw || 1;
  const bh = tpl.bh || 1;
  const sx = (W - pad * 2) / bw;
  const sy = (H - pad * 2) / bh;
  const s = Math.min(sx, sy);
  const ox = W / 2 - tpl.cx * s;
  const oy = H / 2 - tpl.cy * s;

  return (
    <svg width={W} height={H}>
      <g transform={`translate(${ox} ${oy}) scale(${s})`}>
        {tpl.nodes.map((n: NodeBase) => {
          const def = SYMBOL_MAP[n.kind];
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y}) rotate(${n.rot})`}>
              {def ? def.render(n) : (
                <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h}
                      style={{ fill: '#fff', stroke: '#111', strokeWidth: 1 }} />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function Palette({ armedSymbol, onArm, customSymbols, armedCustomId, onArmCustom, onDeleteCustom, registryDefs, onEditRegistryDef, onDeleteRegistryDef }: Props) {
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return SYMBOLS.filter((s) =>
      !ql || s.label.toLowerCase().includes(ql) || s.id.toLowerCase().includes(ql) || s.tag.toLowerCase().includes(ql)
    );
  }, [q]);

  const filteredCustom = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return customSymbols.filter((c) => !ql || c.name.toLowerCase().includes(ql));
  }, [q, customSymbols]);

  return (
    <aside className="pnid-palette">
      <div className="ph-search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="심볼 검색"
        />
      </div>

      {/* 심볼 에디터로 만든 정식 심볼 */}
      {registryDefs.length > 0 && (
        <section className="ph-section">
          <h4>내 심볼</h4>
          <div className="ph-grid">
            {registryDefs
              .filter((d) => {
                const ql = q.trim().toLowerCase();
                return !ql || d.label.toLowerCase().includes(ql) || d.tag.toLowerCase().includes(ql);
              })
              .map((def) => (
                <div key={def.id} className="ph-item-custom-wrap">
                  <button
                    className={`ph-item ${armedSymbol === def.id ? 'armed' : ''}`}
                    title={`${def.label}\n클릭 → 캔버스 클릭으로 배치`}
                    onClick={() => onArm(armedSymbol === def.id ? null : def.id)}
                  >
                    <MiniIcon def={def} />
                    <span>{def.label}</span>
                  </button>
                  <div className="sc-reg-actions">
                    <button title="편집" onClick={() => onEditRegistryDef(def.id)}>✎</button>
                    <button title="삭제" onClick={() => onDeleteRegistryDef(def.id)}>✕</button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 사용자 심볼 섹션 (그룹 저장) */}
      {filteredCustom.length > 0 && (
        <section className="ph-section">
          <h4>사용자 심볼</h4>
          <div className="ph-grid">
            {filteredCustom.map((tpl) => (
              <div key={tpl.id} className="ph-item-custom-wrap">
                <button
                  className={`ph-item ${armedCustomId === tpl.id ? 'armed' : ''}`}
                  title={`${tpl.name}\n클릭 → 캔버스 클릭으로 배치`}
                  onClick={() => onArmCustom(armedCustomId === tpl.id ? null : tpl)}
                >
                  <CustomMiniIcon tpl={tpl} />
                  <span>{tpl.name}</span>
                </button>
                <button
                  className="ph-item-custom-del"
                  title="삭제"
                  onClick={(e) => { e.stopPropagation(); onDeleteCustom(tpl.id); }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {SYMBOL_CATEGORIES.map((cat) => {
        const list = items.filter((s) => s.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} className="ph-section">
            <h4>{cat}</h4>
            <div className="ph-grid">
              {list.map((def) => (
                <button
                  key={def.id}
                  className={`ph-item ${armedSymbol === def.id ? 'armed' : ''}`}
                  title={`${def.label}\n클릭 → 캔버스 클릭으로 배치`}
                  onClick={() => onArm(armedSymbol === def.id ? null : def.id)}
                >
                  <MiniIcon def={def} />
                  <span>{def.label}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
