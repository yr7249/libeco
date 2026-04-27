import type { LineKind } from './types';

const LINE_LABELS: { kind: LineKind; label: string; hint: string }[] = [
  { kind: 'process',  label: '공정',  hint: '실선' },
  { kind: 'signal',   label: '계장',  hint: '점선' },
  { kind: 'electric', label: '전기',  hint: '점-쇄선' },
  { kind: 'heat',     label: '가열',  hint: '이중선' },
  { kind: 'vacuum',   label: '진공',  hint: '도트' },
];

interface Props {
  title: string;
  onTitleChange: (t: string) => void;
  lineKind: LineKind;
  onLineKind: (k: LineKind) => void;
  onUndo: () => void; onRedo: () => void;
  canUndo: boolean; canRedo: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  saving: boolean;
  onExportSVG: () => void;
  onExportPNG: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSaveSymbol: () => void;
  canSaveSymbol: boolean;
  onCreateSymbol: () => void;
  authLabel: string;
  onAuthClick: () => void;
}

export function Toolbar(p: Props) {
  return (
    <header className="pnid-toolbar">
      <div className="tg">
        <strong className="brand">P&amp;ID-tool</strong>
        <input
          className="title"
          value={p.title}
          onChange={(e) => p.onTitleChange(e.target.value)}
          placeholder="문서 제목"
        />
      </div>

      <div className="tg">
        <button onClick={p.onNew}>새로</button>
        <button onClick={p.onOpen}>열기</button>
        <button onClick={p.onSave} disabled={p.saving}>{p.saving ? '저장중…' : '저장'}</button>
        <span className="sep" />
        <button onClick={p.onExportSVG}>SVG</button>
        <button onClick={p.onExportPNG}>PNG</button>
      </div>

      <div className="tg">
        <button onClick={p.onUndo} disabled={!p.canUndo} title="Ctrl+Z">↶</button>
        <button onClick={p.onRedo} disabled={!p.canRedo} title="Ctrl+Y">↷</button>
        <button onClick={p.onDuplicate} title="Ctrl+D">복제</button>
        <button onClick={p.onDelete} title="Del">삭제</button>
        <span className="sep" />
        <button
          onClick={p.onSaveSymbol}
          disabled={!p.canSaveSymbol}
          title="선택 항목을 사용자 심볼로 저장"
          className="pill"
        >
          심볼저장
        </button>
        <button
          onClick={p.onCreateSymbol}
          title="심볼 에디터에서 직접 그리기"
          className="pill"
          style={{ background: '#0a66c2', color: '#fff', borderColor: '#0a66c2' }}
        >
          심볼 만들기
        </button>
      </div>

      <div className="tg lines">
        <span className="lbl">선:</span>
        {LINE_LABELS.map((l) => (
          <button
            key={l.kind}
            className={`pill ${p.lineKind === l.kind ? 'on' : ''}`}
            title={l.hint}
            onClick={() => p.onLineKind(l.kind)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="tg right">
        <button onClick={p.onAuthClick}>{p.authLabel}</button>
      </div>
    </header>
  );
}
