/**
 * @local/dsh-effort-command — host half.
 *
 * Pure UI 플러그인: 호스트에서는 아무 것도 하지 않는다. Loader 로스터에
 * 올라가기 위한 빈 apply 만 노출한다 (@deepseek-ai/dsh-client-ui-commands 와
 * 동일한 패턴). 브라우저 절반은 exports["./client"] 를 통해 내려가며,
 * package.json 의 dsh.client 선언으로 발견된다.
 *
 * effort 변경 RPC 자체는 ui-model-selection 이 세션 스코프에 올려둔 공유
 * ModelDirectory(ctx.modelDirectories)의 select() 가 대행하므로 호스트 절반이
 * 필요 없다.
 */
function apply() {}
export { apply };
