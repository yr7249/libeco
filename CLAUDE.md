# LLNL POC 프로젝트 컨텍스트

> **AI 에이전트(Cursor AI)에게 — 필독**
> 이 파일은 프로젝트의 영구 기억 저장소입니다.
> 작업을 완료할 때마다 반드시 아래 "작업 히스토리" 테이블을 업데이트하세요.
> 새로운 패턴, 연동 정보, 주의사항이 생기면 해당 섹션에 즉시 추가하세요.
> GitHub에도 함께 push해서 기억이 유실되지 않도록 하세요.

## 아키텍처
- **순수 HTML 정적 파일** — 빌드 도구 없음, 외부 번들러 없음
- **GitHub** 에 올려서 공유 (GitHub Pages 방식)
- **Supabase** — 데이터 저장소 + 인증 + RLS 권한 관리
- **단일 파일 원칙** — 각 페이지는 HTML 1개, 외부 JS/CSS 파일 없음

## 페이지 구조
| 파일 | 역할 |
|------|------|
| `index.html` | 홈페이지 (로그인 필요) |
| `login.html` | 로그인 페이지 |
| `purchase.html` | 구매리스트 |
| `equipment.html` | 장비 목록 |
| `incoming.html` | 입고 현황 |
| `diagram.html` | 다이어그램 |
| `pid-editor.html` | P&ID 에디터 (구버전 · 단일 HTML) |
| `share.html` | 기타 공유사항 |
| `pnid-tool/` | **신규 P&ID-tool** (React+Vite+TS, 별도 SPA — 아래 예외 규정 참고) |

## 예외: `pnid-tool/`
- 이 서브 프로젝트는 **단일 HTML 원칙의 예외**.
- 사유: 풍부한 작도 UX(스마트 앵커, 직각 라우팅, 다중 선택, 실시간 동시편집 예정)와 협업 기능을
  단일 HTML 한 파일로 유지하는 것이 비효율적이라 판단.
- 스택: React 18 + Vite + TypeScript + SVG + `@supabase/supabase-js`.
- 빌드 결과(`pnid-tool/dist/`)는 GitHub Pages(예: `https://<user>.github.io/pnid-tool/`)에 배포.
- 기존 페이지들(`pid-editor.html` 포함)은 **계속 단일 HTML 원칙 유지**.
- DB 스키마: `pnid-tool/supabase/schema.sql` 참조 (`pnid_documents`, `pnid_collaborators`, RLS 포함).

## 인증 & 권한
- 홈(index.html)은 **로그인 필수**
- 개별 콘텐츠 페이지는 **권한 있는 사람만** 접근 가능
- 권한 레벨: `admin` / 일반 사용자
- Supabase **RLS(Row Level Security)** 로 DB 접근 제어

## Supabase 연동 방식
- `supa_token` — localStorage에 저장된 사용자 JWT 토큰
- `sb_publishable_...` — anon/publishable 키 (프론트 노출 안전)
- REST API + Realtime WebSocket 직접 호출 (SDK 미사용)

## 수정 요청 시 규칙
1. HTML 파일만 수정하면 되는 경우 → 그냥 수정
2. **Supabase 테이블 컬럼 추가/변경이 필요한 경우** → 반드시 SQL 알려주기
3. RLS 정책 변경이 필요한 경우 → SQL + 적용 위치(Supabase 대시보드 > SQL Editor) 안내
4. 새 테이블 생성이 필요한 경우 → CREATE TABLE + RLS 정책 SQL 함께 제공

## SQL 추가 필요 시 형식
```sql
-- Supabase 대시보드 > SQL Editor 에서 실행
ALTER TABLE 테이블명 ADD COLUMN 컬럼명 타입 DEFAULT 기본값;
```

---

## GitHub 연동 정보
- **레포**: https://github.com/yr7249/libeco
- **브랜치**: `main`
- **로컬 경로**: `F:\4. python\LLNL_POC`
- **git 계정**: `yr7249` / `yr7249@gmail.com`
- **push 방식**: `git push origin master:main` (로컬 브랜치명 master → 원격 main)
- **주의**: 로컬은 git init으로 초기화한 상태 — `git reset origin/main` 으로 원격 상태 동기화 후 원하는 파일만 add/commit/push

## Supabase 연동 정보
- **URL**: `https://ikfjpzdzrgsmhaobqnai.supabase.co`
- **인증**: localStorage `supa_token` (JWT)
- **Storage 버킷**: `diagram_gallery/` 경로에 이미지 저장
- **설정값 저장**: `settings` 테이블 (key-value 방식)
- **SDK 미사용** — 순수 fetch REST API 직접 호출

## 작업 히스토리 (최근순)
| 날짜 | 파일 | 작업 내용 |
|------|------|-----------|
| 2026-04-27 | `pnid-tool/src/editor/*` | 커스텀 심볼 저장/재사용 기능 추가 — 선택 항목을 "심볼저장" 버튼으로 저장, localStorage에 보관, Palette "사용자 심볼" 섹션에서 재배치 가능. 신규 파일: `customSymbols.ts`. 수정: `types.ts`(CustomSymbolTemplate), `Canvas.tsx`(armedCustom), `Palette.tsx`, `Toolbar.tsx`, `Editor.tsx`, `global.css` |
| 2026-04-24 | `purchase.html` | Tab키로 단가→소계(자동계산) 건너뛰고 상태로 바로 이동하도록 수정 (`getNextCell`, `moveFocus`에 contentEditable 건너뛰기 로직 추가) |
| 2026-04-24 | `diagram.html` | 클립보드 붙여넣기(Ctrl+V) 이미지 업로드 기능 추가 — Canvas API로 JPEG 변환 후 Supabase Storage 업로드, `uploadImageBlob()` 공통 함수 추출 |

## 코드 패턴 / 주요 규칙
- `purchase.html` 컬럼 순서: `no → code → equipment → product → supplier → total_qty → purchase_qty → unit_price → subtotal(읽기전용) → status → remark`
- `incoming.html`, `equipment.html`은 읽기전용 셀 없음 → Tab 이슈 해당 없음
- admin 여부: `window._isAdmin`, 로그인 여부: `window._dgmUserOk`
