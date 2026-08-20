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
| `share.html` | 기타 공유사항 |
| `expense.html` | 미국 출장 경비 (지금은 localStorage, Supabase 미연동) |

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
| 2026-08-20 | `expense.html` | 미국 출장 경비 페이지 추가. 기존 libeco 상단바/이동메뉴 양식. 데이터는 localStorage(`libeco_expense_data`). Supabase 테이블은 다음 작업. 홈 카드 및 각 페이지 이동 메뉴에 링크 추가. |
| 2026-05-18 | `fund.html` | 지급시기 저장 수정 — `scheduled_period`(TEXT) 컬럼 사용, 선택 즉시 flushSave, 연도 포함 표시 |
| 2026-05-18 | `fund.html` | 셀 키보드 UX — 선택 상태에서 타이핑 즉시 편집, Tab=오른쪽, Enter=아래 이동, 화살표 이동 |
| 2026-05-18 | `purchase.html` / `incoming.html` / `equipment.html` | 선택 상태 타이핑 즉시 편집 (구매리스트는 Tab/Enter 이동 기존 적용, 입고/장비 동일) |
| 2026-05-18 | `purchase.html` | 체크된 행 묶어서 자금집행으로 보내기 — `#send-to-fund-btn` (fixed bottom, 체크 시 표시, 인쇄 숨김), `updateSendToFundBtn()`, 클릭 시 `orders` + `payment_schedule` INSERT (code 콤마 묶음, order_name=첫째 장비명, vendor=첫째 업체, total_amount=subtotal 합계) |
| 2026-05-13 | `fund.html` | 상단 짤림 현상 수정 — `.pg-topbar` `position:sticky;top:0;z-index:100` 제거 → `flex-shrink:0` 적용, `thead{top:50px}` → `top:0` 변경 (구매리스트와 동일 방식) |
| 2026-05-06 | `pid-tool.html` | SE + P&ID 대규모 UX 개선: ① SE 드래그 smooth (raw 좌표, snap 제거) ② 스마트 가이드라인 — 드래그 중 8px 이내 엣지/중앙/정렬 감지 시 빨간 가이드 + 자동 스냅, Alt키 무시 (`_seSmartSnap`) ③ P&ID 동일 스마트 가이드 적용 (`_pidSmartSnap`, 12px 임계) ④ SE 포트 도형 엣지 자동 스냅 — 마우스 22px 이내 가장 가까운 엣지점에 달라붙음, Alt=자유 배치, 미리보기 표시 (`seNearestEdgePt`) ⑤ 정삼각형 Shift 드로잉 수정 (h=w×√3/2) ⑥ 우클릭 컨텍스트 메뉴 SE (`seShowCtxMenu`) / P&ID (`pid-ctx-menu`) 모두 구현 ⑦ P&ID 배관 그리기 중 Backspace = 마지막 지점 제거, 우클릭 = 전체 취소 |
| 2026-05-06 | `pid-tool.html` | SE(심볼에디터) 5종 개선: ① + 버튼 confirm 제거, 드래프트 모달 닫혀도 페이지 새로고침 전까지 유지 ② Ctrl+C/V/D 복붙·복제 (`se_clipboard`, `sePasteClipboard`, `seDuplicateSelected`) ③ 리사이즈 시 스냅 제거 — 매끄럽게 (Ctrl 누르면 스냅) ④ boolean merge 결과(path) 리사이즈 시 `sx`/`sy` 적용 — 단순 translate가 아닌 정확한 스케일링 (`getElementBBox`, `elToSVG`, `seApplyBBoxToEl` path 분기 모두 수정) ⑤ 다중선택 그룹 리사이즈 핸들 4개 추가 (`se_groupResize`, `seScaleElInBBox`) — 모든 요소 타입 비례 스케일 |
| 2026-05-04 | `pid-tool.html` | P&ID resize 핸들을 bbox 정확한 꼭짓점에 배치 (pad 제거), 스케일 계산을 X/Y ratio max 방식으로 교체 — 잡은 모서리가 마우스를 따라가고 반대 꼭짓점은 고정 |
| 2026-04-27 | `CLAUDE.md` | pnid-tool 관련 내용 전체 제거 (재설계 예정) |
| 2026-04-24 | `purchase.html` | Tab키로 단가→소계(자동계산) 건너뛰고 상태로 바로 이동하도록 수정 (`getNextCell`, `moveFocus`에 contentEditable 건너뛰기 로직 추가) |
| 2026-04-24 | `diagram.html` | 클립보드 붙여넣기(Ctrl+V) 이미지 업로드 기능 추가 — Canvas API로 JPEG 변환 후 Supabase Storage 업로드, `uploadImageBlob()` 공통 함수 추출 |

## P&ID Tool 전용 기억 파일
`PNID_TOOL.md` — P&ID Tool 아키텍처, 변수/함수 목록, 단축키, 동작 특성, 작업 히스토리 전체 기록.
pid-tool.html 관련 작업 시 반드시 먼저 읽을 것.

## AI 코딩 행동 지침

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

---

## 코드 패턴 / 주요 규칙
- `purchase.html` 컬럼 순서: `no → code → equipment → product → supplier → total_qty → purchase_qty → unit_price → subtotal(읽기전용) → status → remark`
- `incoming.html`, `equipment.html`은 읽기전용 셀 없음 → Tab 이슈 해당 없음
- admin 여부: `window._isAdmin`, 로그인 여부: `window._dgmUserOk`
