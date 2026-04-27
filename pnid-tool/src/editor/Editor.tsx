import { useCallback, useEffect, useRef, useState } from 'react';
import type { Diagram, ID, LineKind, CustomSymbolTemplate } from './types';
import { emptyDiagram, uid } from './types';
import { useHistory } from './hooks/useHistory';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { Palette } from './Palette';
import { Inspector } from './Inspector';
import { AuthDialog } from './AuthDialog';
import { OpenDialog } from './OpenDialog';
import { useSession, signOut } from '../lib/auth';
import { hasSupabase } from '../lib/supabase';
import { createDocument, updateDocument, DocRow } from '../lib/documents';
import { exportPNG, exportSVG } from './export';
import { loadCustomSymbols, saveCustomSymbols } from './customSymbols';

const LS_KEY = 'pnid-tool:last';

interface Persisted { id?: string; title: string; diagram: Diagram }

function loadLocal(): Persisted | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return null;
    return JSON.parse(s) as Persisted;
  } catch { return null; }
}
function saveLocal(p: Persisted) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function Editor() {
  const initial = loadLocal();
  const hist = useHistory<Diagram>(initial?.diagram ?? emptyDiagram());
  const [title, setTitle] = useState(initial?.title ?? 'Untitled');
  const [docId, setDocId] = useState<string | undefined>(initial?.id);
  const [selection, setSelection] = useState<Set<ID>>(new Set());
  const [armed, setArmed] = useState<string | null>(null);
  const [armedCustom, setArmedCustom] = useState<CustomSymbolTemplate | null>(null);
  const [customSymbols, setCustomSymbols] = useState<CustomSymbolTemplate[]>(loadCustomSymbols);
  const [lineKind, setLineKind] = useState<LineKind>('process');
  const [showAuth, setShowAuth] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { session } = useSession();

  // 자동 로컬 저장
  useEffect(() => {
    saveLocal({ id: docId, title, diagram: hist.state });
  }, [hist.state, title, docId]);

  // 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); hist.undo(); return; }
      if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); hist.redo(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); doDelete(); return; }
      if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); doDuplicate(); return; }
      if (e.key === 'Escape') { setArmed(null); setArmedCustom(null); setSelection(new Set()); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onCanvasChange = useCallback((next: Diagram, commit: boolean) => {
    if (commit) hist.set(next); else hist.replace(next);
  }, [hist]);

  const doDelete = () => {
    if (selection.size === 0) return;
    const nodes = { ...hist.state.nodes };
    const edges = { ...hist.state.edges };
    selection.forEach((id) => { delete nodes[id]; delete edges[id]; });
    // 사라진 노드를 참조하는 엣지도 정리
    for (const e of Object.values(edges)) {
      if ((e.from.nodeId && !nodes[e.from.nodeId]) || (e.to.nodeId && !nodes[e.to.nodeId])) {
        delete edges[e.id];
      }
    }
    hist.set({ ...hist.state, nodes, edges });
    setSelection(new Set());
  };

  const doDuplicate = () => {
    if (selection.size === 0) return;
    const nodes = { ...hist.state.nodes };
    const newIds = new Set<ID>();
    selection.forEach((id) => {
      const n = nodes[id];
      if (!n) return;
      const newId = Math.random().toString(36).slice(2, 10);
      nodes[newId] = { ...n, id: newId, x: n.x + 20, y: n.y + 20 };
      newIds.add(newId);
    });
    hist.set({ ...hist.state, nodes });
    setSelection(newIds);
  };

  const doSaveSymbol = () => {
    if (selection.size === 0) return;
    const name = prompt('심볼 이름을 입력하세요:');
    if (!name?.trim()) return;

    const selNodes = [...selection]
      .map((id) => hist.state.nodes[id])
      .filter(Boolean);
    const selEdges = Object.values(hist.state.edges).filter(
      (e) => e.from.nodeId && selection.has(e.from.nodeId) &&
             e.to.nodeId && selection.has(e.to.nodeId)
    );

    if (selNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selNodes.forEach((n) => {
      minX = Math.min(minX, n.x - n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      maxY = Math.max(maxY, n.y + n.h / 2);
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const tpl: CustomSymbolTemplate = {
      id: uid(),
      name: name.trim(),
      nodes: selNodes,
      edges: selEdges,
      cx,
      cy,
      bw: maxX - minX,
      bh: maxY - minY,
    };

    const next = [...customSymbols, tpl];
    setCustomSymbols(next);
    saveCustomSymbols(next);
  };

  const doDeleteCustomSymbol = (id: string) => {
    const next = customSymbols.filter((c) => c.id !== id);
    setCustomSymbols(next);
    saveCustomSymbols(next);
    if (armedCustom?.id === id) setArmedCustom(null);
  };

  const doNew = () => {
    if (!confirm('현재 작업을 비우고 새로 시작할까요?')) return;
    hist.reset(emptyDiagram());
    setTitle('Untitled'); setDocId(undefined);
    setSelection(new Set()); setArmed(null); setArmedCustom(null);
  };

  const doSave = async () => {
    if (!hasSupabase) { alert('Supabase 환경변수(.env)가 설정되지 않았습니다.\n로컬 자동저장은 동작합니다.'); return; }
    if (!session) { setShowAuth(true); return; }
    setSaving(true);
    try {
      if (docId) {
        await updateDocument(docId, { title, data: hist.state });
      } else {
        const row = await createDocument(title, hist.state);
        setDocId(row.id);
      }
    } catch (e) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const onOpenPick = (row: DocRow) => {
    setShowOpen(false);
    setDocId(row.id);
    setTitle(row.title);
    hist.reset(row.data);
    setSelection(new Set());
  };

  // 내보내기에 쓸 SVG 참조
  const wrapRef = useRef<HTMLDivElement>(null);
  const findSvg = () => wrapRef.current?.querySelector('svg.pnid-canvas') as SVGSVGElement | null;

  return (
    <div className="pnid-app">
      <Toolbar
        title={title} onTitleChange={setTitle}
        lineKind={lineKind} onLineKind={setLineKind}
        onUndo={hist.undo} onRedo={hist.redo}
        canUndo={hist.canUndo} canRedo={hist.canRedo}
        onNew={doNew}
        onOpen={() => session ? setShowOpen(true) : setShowAuth(true)}
        onSave={doSave}
        saving={saving}
        onExportSVG={() => { const s = findSvg(); if (s) exportSVG(s, hist.state.meta.paper.w, hist.state.meta.paper.h, title); }}
        onExportPNG={() => { const s = findSvg(); if (s) exportPNG(s, hist.state.meta.paper.w, hist.state.meta.paper.h, title); }}
        onDelete={doDelete}
        onDuplicate={doDuplicate}
        onSaveSymbol={doSaveSymbol}
        canSaveSymbol={selection.size > 0}
        authLabel={session ? (session.user.email ?? '로그인됨') + ' • 로그아웃' : '로그인'}
        onAuthClick={() => session ? signOut() : setShowAuth(true)}
      />

      <div className="pnid-body">
        <Palette
          armedSymbol={armed}
          onArm={(id) => { setArmed(id); setArmedCustom(null); }}
          customSymbols={customSymbols}
          armedCustomId={armedCustom?.id ?? null}
          onArmCustom={(tpl) => { setArmedCustom(tpl); setArmed(null); }}
          onDeleteCustom={doDeleteCustomSymbol}
        />
        <div className="pnid-canvas-wrap" ref={wrapRef}>
          <Canvas
            diagram={hist.state}
            selection={selection}
            onSelect={setSelection}
            onChange={onCanvasChange}
            armedSymbol={armed}
            armedCustom={armedCustom}
            onPlaced={() => { setArmed(null); setArmedCustom(null); }}
            lineKind={lineKind}
          />
          {(armed || armedCustom) && (
            <div className="pnid-mode-hint">
              {armedCustom ? `「${armedCustom.name}」 배치 모드` : '배치 모드'}: 캔버스를 클릭하세요 · ESC 로 취소
            </div>
          )}
        </div>
        <Inspector
          diagram={hist.state}
          selection={selection}
          onChange={(next) => hist.set(next)}
          onDelete={doDelete}
        />
      </div>

      {showAuth && <AuthDialog onClose={() => setShowAuth(false)} />}
      {showOpen && <OpenDialog onClose={() => setShowOpen(false)} onPick={onOpenPick} />}
    </div>
  );
}
