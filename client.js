/**
 * @local/dsh-effort-command — client half.
 *
 * `/effort` 슬래시 커맨드: 모델은 그대로 둔 채 현재 세션의 reasoning effort만
 * 바꾸는 popupSelect 커맨드. `/model` 이 모델+effort를 함께 바꾸는 것과 달리
 * 이 커맨드는 현재 모델의 effort 레벨만 나열하고, 골라서 바로 적용한다.
 *
 * 데이터 출처: ui-model-selection 이 세션 스코프에 올려둔 공유 ModelDirectory
 * (ctx.modelDirectories). 카탈로그 로드 · 현재 선택 조회 · 선택 적용(select
 * RPC)까지 전부 그 디렉터리를 통해 이루어지므로 컴포저 모델 시트 · Effort
 * 서브메뉴와 상태가 항상 동기화된다. maxeffort 패치가 같은 service를 쓰므로
 * 충돌도 없다.
 *
 * 옵션 구성은 ui-model-selection 의 Effort 서브메뉴(effortChoices)와 동일 규칙:
 *  - 모델에 defaultEffort 가 선언되어 있으면 "Default"(= reasoningEffort 미지정)
 *    행을 맨 위에 추가한다.
 *  - 나머지는 카탈로그가 주는 efforts [{id, name, description}] 순서 그대로.
 *  - 현재 유효 effort(current.reasoningEffort ?? defaultEffort)와 일치하는 행을
 *    active 로 표시한다.
 */

window.__ModuleLoader__.load({
	id: "@local/dsh-effort-command",
	factory(require) {
		const { IconGaugeOutlineRegular } = require("@deepseek-ai/dsh-client-ui-primitives");

		const NS = "effort-command";
		/** 실제 effort id 와 충돌하지 않는 "프로바이더 기본값" 옵션 id. */
		const DEFAULT_ID = "default";

		const dictionaries = {
			ko: {
				"command.label": "Effort",
				"command.description": "모델을 유지한 채 이 세션의 추론 effort(사고 깊이)만 변경",
				"search.placeholder": "effort 레벨 검색…",
				"empty.efforts": "이 모델에 선택 가능한 effort 레벨이 없습니다.",
				"search.noResults": "일치하는 effort가 없습니다.",
				"error.noSelection": "이 세션에 아직 모델 선택이 없습니다 — 먼저 /model 에서 모델을 골라주세요.",
				"error.notInCatalog": "현재 모델이 카탈로그에 없습니다 — /model 에서 다시 선택해주세요.",
				"error.catalogLoading": "모델 카탈로그를 불러오지 못했습니다 — 잠시 후 다시 시도해주세요.",
				"error.sessionInUse": "다른 뷰가 이 세션의 모델 설정을 잠그고 있습니다 (writer-held).",
				"option.default": "Default",
				"option.default.detail": "프로바이더·모델 기본 effort (명시 전송 안 함)",
			},
			en: {
				"command.label": "Effort",
				"command.description": "Change this session's reasoning effort without changing the model",
				"search.placeholder": "Search effort levels…",
				"empty.efforts": "This model has no selectable effort levels.",
				"search.noResults": "No matching effort.",
				"error.noSelection": "No model selected in this session yet — pick one via /model first.",
				"error.notInCatalog": "The current model left the catalog — re-select it via /model.",
				"error.catalogLoading": "Failed to load the model catalog — try again shortly.",
				"error.sessionInUse": "Another view holds this session's model settings (writer-held).",
				"option.default": "Default",
				"option.default.detail": "Provider/model default effort (nothing sent explicitly)",
			},
		};

		/** 카탈로그 스냅숏에서 현재 선택된 모델 행을 찾는다. */
		function findModelRow(state, current) {
			for (const group of state.groups ?? []) {
				for (const model of group.models ?? []) {
					if (group.id === current.provider && model.id === current.model) return model;
				}
			}
			return void 0;
		}

		/** 스냅숏 → popupSelect 옵션 목록. 실패는 throw 하고, 빈 목록은 empty 카피로 표현된다. */
		function optionRows(state, t) {
			const current = state.current;
			if (current === null) throw new Error(t("error.noSelection"));
			const model = findModelRow(state, current);
			if (model === void 0) throw new Error(t("error.notInCatalog"));
			const reasoning = model.reasoning;
			if (reasoning === void 0 || reasoning.efforts.length === 0) return [];

			/** 현재 유효 effort: 명시 선택값이 없으면 모델 기본값 (ModelSelect 와 동일). */
			const effective = current.reasoningEffort ?? reasoning.defaultEffort;
			const caption = effective === void 0
				? t("option.default")
				: reasoning.efforts.find((level) => level.id === effective)?.name ?? effective;
			const group = { name: "effort", label: `${model.name} · ${caption}` };

			const rows = [];
			if (reasoning.defaultEffort !== void 0) {
				rows.push({
					id: DEFAULT_ID,
					label: t("option.default"),
					detail: t("option.default.detail"),
					active: effective === void 0,
					group,
				});
			}
			for (const level of reasoning.efforts) {
				rows.push({
					id: level.id,
					label: level.name,
					detail: level.description,
					active: effective === level.id,
					group,
				});
			}
			return rows;
		}

		/** apply 가 기다리는 서비스: 커맨드 등록, 공유 디렉터리, 세션 카탈로그, 사전. */
		const inject = ["commandUi", "locale", "sessions", "modelDirectories"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, dictionaries), "effort-command: dictionaries");
			const t = ctx.locale.bind(NS);

			ctx.inject(inject, (scope) => {
				const command = scope.commandUi;
				const models = scope.modelDirectories;
				const sessions = scope.sessions;

				scope.effect(() => command.register({
					name: "effort",
					label: () => t("command.label"),
					description: () => t("command.description"),
					icon: IconGaugeOutlineRegular,
					available: (session) => sessions.subagentAddress(session.sessionId) === void 0,
					ui: {
						kind: "popupSelect",
						searchMode: "substring",
						searchLabels: () => ({
							placeholder: t("search.placeholder"),
							empty: t("empty.efforts"),
							noResults: t("search.noResults"),
						}),
						options: async (session) => {
							if (sessions.subagentAddress(session.sessionId) !== void 0) throw new Error("effort selection is unavailable for addressed subagent sessions");
							const directory = models.directoryFor(session.sessionId);
							const state = await directory.load();
							const loaded = (state.groups ?? []).length > 0 || (state.failures ?? []).length === 0;
							if (!loaded) throw new Error(t("error.catalogLoading"));
							return optionRows(state, t);
						},
						onSelect: async (option, session) => {
							if (sessions.subagentAddress(session.sessionId) !== void 0) throw new Error("effort selection is unavailable for addressed subagent sessions");
							const directory = models.directoryFor(session.sessionId);
							const state = directory.store.getSnapshot();
							const current = state.current;
							if (current === null) throw new Error(t("error.noSelection"));
							const model = findModelRow(state, current);
							if (model === void 0) throw new Error(t("error.notInCatalog"));
							const reasoning = model.reasoning;

							const effort = option.id === DEFAULT_ID ? void 0 : option.id;
							/** 이미 그 값이면 재전송 없이 닫기만 (재선택 토글 방지). */
							if ((current.reasoningEffort ?? reasoning?.defaultEffort) === effort) return;

							const result = await directory.select({
								provider: current.provider,
								model: current.model,
								...(effort === void 0 ? {} : { reasoningEffort: effort }),
							});
							if (!result.ok) {
								if (result.error.code === "session/writer-held") throw new Error(t("error.sessionInUse"));
								throw result.error;
							}
						},
					},
				}), "effort-command: /effort contribution");
			});
		}

		return { apply, inject };
	},
});
