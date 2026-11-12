# dsh-effort-command

[![Platform: DSH Web plugin](https://img.shields.io/badge/platform-DSH_Web_plugin-2563eb)](https://github.com/pinion05/dsh-effort-command)
[![Version: 0.1.0](https://img.shields.io/badge/version-0.1.0-blue)](../../releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

`/effort` slash command for DeepSeek Harness — change the current session's reasoning effort **without touching the model**, with the same popupSelect UX as `/model`.

모델은 `/model` 로 바꿀 수 있는데 effort 는 커맨드가 없어서 만든 플러그인.
`/effort` 를 치면 **현재 세션의 모델을 그대로 둔 채** reasoning effort 레벨만
골라 바로 적용하는 popupSelect 가 뜬다 (`/model` 과 같은 UX).

## 동작

- 옵션 목록 = ui-model-selection 의 Effort 서브메뉴와 동일 규칙
  - 모델에 `defaultEffort` 가 있으면 맨 위에 `Default`(= effort 미지정) 행
  - 카탈로그가 주는 `efforts [{id, name, description}]` 순서 그대로 (Off → Low → … → Max)
  - 현재 유효 effort(`current.reasoningEffort ?? defaultEffort`) 행에 ✓ active 표시,
    그룹 헤딩에 `모델명 · 현재 effort` 캡션
- 적용은 `ctx.modelDirectories.directoryFor(session).select({provider, model, reasoningEffort})`
  → 컴포저 모델 시트·Effort 서브메뉴와 상태 완전 동기, `session/writer-held` 등
  오류도 /model 과 동일하게 처리
- 이미 같은 값이면 재전송 없이 팝업만 닫음 (같은 effort 재클릭 토글 방지)
- 서브에이전트 세션에서는 /model 처럼 비활성

## 설치 (web 프로필)

```bash
git clone https://github.com/pinion05/dsh-effort-command.git /home/pinion/dsh-effort-command
```

1. `~/.dsh/profiles/web/package.json` 에
   - dependencies: `"@local/dsh-effort-command": "link:/home/pinion/dsh-effort-command"`
   - `dsh.profile.bundles`: `"@local/dsh-effort-command"` 한 줄 추가
2. 프로필 디렉터리에서 `pnpm install`
3. `systemctl --user restart dsh-web` + 브라우저 강새로고침

## 롤백

package.json 의 두 줄을 지우고 `pnpm install` → 재시작. 이 디렉토리 자체는
독립적이라 다른 파일을 건드리지 않는다.

## 한계

- 클라이언트 커맨드는 bare 호출만 지원 → `/effort max` 처럼 인자 직접 입력은
  불가 (`/model` 도 동일). 팝업에서 2번 클릭으로 선택.
- effort 목록은 모델 카탈로그의 `reasoning.efforts` 를 따르므로, 라우터 모델
  (예: FreeLlmApi `auto`)처럼 카탈로그에 effort 가 아예 없으면 빈 화면이 뜬다.
- dsh 업그레이드 후 ui-model-selection 의 `modelDirectories` API 가 크게 바뀌면
  이 플러그인의 `options/onSelect` 만 다시 맞추면 된다.

## 버전

- 0.1.0 (2026-11-12): 최초 버전. dsh 0.2.2-rc.1 기준.
