# 영재원 과학교사 바이브코딩 연수 플랫폼

동부중등영재원 협력학교 과학 강사 4명 대상 기초 연수 진행 플랫폼.
원본 요구사항: `docs/PRD.md`

## 개발 워크플로 (오케스트레이션)

- **구현**: Claude Code
- **검토**: Codex (`codex exec` 또는 codex MCP 서버 `codex` — 사용자 전역 `~/.claude.json`에 등록)
- **루프**: 구현 → Codex 검토 → 수정 → 커밋
- 커밋 메시지: `feat|fix: <기능> (codex-reviewed)`

## 실행

```bash
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

- 수강생: `http://localhost:3000/`
- 강사: `http://localhost:3000/admin?key=<ADMIN_KEY>`

## 구조

- `app/page.tsx` — 수강생 화면. 단계는 `session.phase`가 결정하고, 제작 단계만 `participant.gateApproved`로 잠긴다.
- `app/admin/page.tsx` — 서버 컴포넌트에서 `ADMIN_KEY` 검증 후 `components/AdminDashboard.tsx` 렌더
- `app/api/review/route.ts` — Gemini 프록시. 클라이언트가 designDoc을 보내면 검토 텍스트만 반환하고, Firestore 기록은 클라이언트가 한다.
- `lib/db.ts` — Firestore 구독/쓰기 헬퍼. `meta/active` 문서가 현재 세션 id를 가리킨다.
- `lib/types.ts` — 데이터 모델 + 게이트 조건(`designReviewComplete`), 짝 배정(`findPartner`), 검토관 역할(`reviewerRoleFor`)
- `lib/seed-data.ts` — 설계서 예시 8개. `verification`만 빈 값.

## 보안 트레이드오프 (의도된 것)

오늘 1회 행사용이므로 Firestore 보안 규칙은 열려 있고, 세션 id를 랜덤 문자열로 두어 추측을 어렵게 하는 수준으로만 보호한다. 행사 후에는 규칙을 잠글 것.
