import { getInstance, soya } from '@/services';
import { Soya, SoyaDocument } from 'soya-js';
import { MultiResponse, Paging, Vaultifier, VaultItem, VaultItemsQuery, VaultMeta, VaultMinMeta, VaultPostItem, VaultRepo, VaultSchema, } from 'vaultifier';
import Vue from 'vue';
import Vuex, { Commit } from 'vuex'
import { ActionType } from './action-type';
import { FetchState } from './fetch-state';
import { MutationType } from './mutation-type';

export interface IFetchVaultItems {
  page?: number;
  size?: number;
  repo?: VaultRepo;
  schema?: Partial<VaultSchema>;
  fetchContent?: boolean;
}

// These special types are currently due to a legacy
// implementation, but could be helpful in future
// if we want to extend the base vaultifier types
type SoyaVaultMeta = VaultMeta & {
  // id: number | string;
};

type SoyaVaultMinMeta = VaultMinMeta & {
  // id: number | string;
  dri: string;
};

type SoyaVaultItem = VaultItem & {
  // id: number | string;
};

export enum Language {
  JSON_LD = 'json-ld',
  YAML = 'yaml',
}

export interface IStore {
  repo: {
    all?: VaultRepo[],
    state: FetchState,
  },
  schemaDRI: {
    all: VaultSchema[],
    state: FetchState,
    current?: SoyaDocument,
  },
  vaultItem: {
    all: SoyaVaultMeta[],
    allState: FetchState,
    current?: VaultItem,
    currentState: FetchState,
    paging?: Paging,
    language: string,
  },
  ui: {
    isFluid: boolean,
  }
}
interface IFetchState {
  state: FetchState,
  setFetchState: (store: IStore, state: FetchState) => void,
}

async function doFetch<T>(
  commit: Commit,
  asyncFunc: () => Promise<T>,
  setState: (commit: Commit, data: T) => void,
  setFetchState: (store: IStore, state: FetchState) => void,
) {
  const commitObj: IFetchState = {
    setFetchState,
    state: FetchState.FETCHING,
  }

  commit(MutationType.SET_FETCH_STATE, commitObj);
  try {
    setState(commit, await asyncFunc());

    commitObj.state = FetchState.SUCCESS;
    commit(MutationType.SET_FETCH_STATE, commitObj)
  }
  catch {
    commitObj.state = FetchState.ERROR;
    commit(MutationType.SET_FETCH_STATE, commitObj);
  }
}

export const getStore = () => {
  Vue.use(Vuex);

  return new Vuex.Store({
    state: (): IStore => ({
      repo: {
        all: [],
        state: FetchState.NONE,
      },
      schemaDRI: {
        all: [],
        state: FetchState.NONE,
        current: undefined,
      },
      vaultItem: {
        all: [],
        allState: FetchState.NONE,
        current: undefined,
        currentState: FetchState.NONE,
        paging: undefined,
        language: Language.YAML,
      },
      ui: {
        isFluid: false,
      }
    }),
    mutations: {
      [MutationType.SET_FETCH_STATE](state, payload: IFetchState) {
        payload.setFetchState(state, payload.state);
      },
      [MutationType.SET_REPOS](state, payload: VaultRepo[]) {
        state.repo.all = payload;
      },
      [MutationType.SET_CURRENT_SCHEMA](state, payload: SoyaDocument | undefined) {
        state.schemaDRI.current = payload;
      },
      [MutationType.SET_SCHEMA_DRIS](state, payload: VaultSchema[]) {
        state.schemaDRI.all = payload;
      },
      [MutationType.SET_VAULT_ITEMS](state, payload: VaultMeta[]) {
        state.vaultItem.all = payload;
      },
      [MutationType.SET_VAULT_ITEM](state, payload: VaultItem) {
        state.vaultItem.current = payload;
      },
      [MutationType.SET_VAULT_ITEM_LANGUAGE](state, payload: string) {
        state.vaultItem.language = payload;
      },
      [MutationType.SET_SCHEMA_DRI_TITLE](state, payload: VaultSchema) {
        const item = state.schemaDRI.all.find(x => x.dri === payload.dri);

        if (item)
          item.title = payload.title;
      },
      [MutationType.SET_VAULT_ITEMS_PAGING](state, payload?: Paging) {
        state.vaultItem.paging = payload;
      },
      [MutationType.SET_UI_IS_FLUID](state, payload: boolean) {
        state.ui.isFluid = payload;
      },
    },
    actions: {
      [ActionType.RESET_VAULT_ITEMS]({ commit }) {
        commit(MutationType.SET_VAULT_ITEMS, undefined);
        commit(MutationType.SET_VAULT_ITEM, undefined);
        commit(MutationType.SET_VAULT_ITEMS_PAGING, undefined);
      },
      async [ActionType.UPDATE_VAULT_ITEM]({ state, commit, dispatch }, payload: VaultPostItem) {
        let jsonld: SoyaDocument | undefined = undefined;
        let yaml: string | undefined = undefined;
        if (state.vaultItem.language === Language.YAML) {
          yaml = payload.data as string;
          jsonld = await soya.init(yaml);
        }
        else
          jsonld = payload.data;

        await soya.push(jsonld, {
          soya_yaml: yaml,
          meta: payload.meta,
        });
      },
      async [ActionType.DELETE_VAULT_ITEM]({ state, commit, dispatch }, payload: VaultMeta) {
        // TODO: implement
        throw new Error('Not implemented');
      },
      async [ActionType.FETCH_SCHEMA_DRIS]({ commit, dispatch }) {
        await doFetch<VaultSchema[]>(
          commit,
          async () => (await soya.query()).map<VaultSchema>(x => ({
            dri: x.dri,
            title: x.name,
          })),
          (commit, data) => {
            dispatch(ActionType.RESET_VAULT_ITEMS);
            commit(MutationType.SET_SCHEMA_DRIS, data);
            dispatch(ActionType.FETCH_SCHEMAS_TITLE);
          },
          (store, state) => store.schemaDRI.state = state
        );
      },
      async [ActionType.FETCH_REPOS]({ commit, dispatch }) {
        await doFetch<VaultRepo[] | undefined>(
          commit,
          () => getInstance().getRepos(),
          (commit, data) => {
            dispatch(ActionType.RESET_VAULT_ITEMS);
            commit(MutationType.SET_REPOS, data);
          },
          (store, state) => store.repo.state = state
        );
      },
      async [ActionType.FETCH_VAULT_ITEMS]({ commit, state }, { page, size, repo, schema, fetchContent }: IFetchVaultItems) {
        // reset currently selected vault item if list of vault items is refreshed
        commit(MutationType.SET_VAULT_ITEM, undefined);
        commit(MutationType.SET_CURRENT_SCHEMA, undefined);

        if (schema?.dri) {
          try {
            const doc = await soya.pull(schema.dri);
            commit(MutationType.SET_CURRENT_SCHEMA, doc);

            const sparql = await soya.getSparqlBuilder(doc);
            const bindings = await sparql.query(`
            PREFIX base: <${doc["@context"]["@base"]}>
            SELECT * WHERE {
                ?base a base:OverlayDataBudRendering .
            }`);

            // if there is an overlay for DataBudRendering
            // we want to fetch the whole content
            if (bindings.length > 0)
              fetchContent = true;
          } catch { /* if it goes wrong we don't care */ }
        }

        await doFetch<MultiResponse<SoyaVaultMeta>>(
          commit,
          async () => {
            const schemaPath = schema?.title ?? schema?.dri;
            if (schemaPath) {
              // TODO: needs paging mechanism
              const res = await soya.info(schemaPath);
              const items = res.history
                .filter(x => {
                  if (state.vaultItem.language === Language.YAML)
                    return x.yaml;

                  return true;
                })
                .map<SoyaVaultMeta>(x => {
                  const date = new Date(x.date);

                  return {
                    id: x.id,
                    dri: x.dri,
                    createdAt: date,
                    updatedAt: date,
                    meta: {},
                    raw: x,
                  };
                });

              return {
                items,
                paging: {
                  current: 1,
                  pageItems: items.length,
                  totalItems: items.length,
                  totalPages: 1,
                }
              };
            }
            else
              throw new Error('Schema and repo are undefined');

          },
          (commit, data) => {
            commit(MutationType.SET_VAULT_ITEMS, data.items);
            commit(MutationType.SET_VAULT_ITEMS_PAGING, data.paging);
          },
          (store, state) => store.vaultItem.allState = state,
        );
      },
      async[ActionType.FETCH_VAULT_ITEM]({ commit, state }, payload: SoyaVaultMinMeta) {
        await doFetch<SoyaVaultItem>(
          commit,
          async () => {
            const res = await soya.service.get(`/api/data?id=${payload.id}`, true);

            return {
              id: payload.id,
              dri: payload.dri,
              createdAt: res.created_at,
              updatedAt: res.updated_at,
              isEncrypted: false,
              meta: res.meta,
              raw: res,
              data: state.vaultItem.language === Language.YAML ? res.soya_yaml : res.data,
            };
          },
          (commit, data) => commit(MutationType.SET_VAULT_ITEM, data),
          (store, state) => store.vaultItem.currentState = state,
        )
      },
      async[ActionType.SET_VAULT_ITEM_LANGUAGE]({ commit, state, dispatch }, payload: Language) {
        commit(MutationType.SET_VAULT_ITEM_LANGUAGE, payload);
        // refetch current vault item, if needed
        if (state.vaultItem.current)
          dispatch(ActionType.FETCH_VAULT_ITEM, state.vaultItem.current);
      },
      async[ActionType.FETCH_SCHEMAS_TITLE]({ commit, state }) {
        const infos = await soya.info(state.schemaDRI.all.map(x => x.dri));

        for (const info of infos) {
          const schema = state.schemaDRI.all.find(x => x.dri === info.dri);

          if (schema) {
            schema.title = info.name;
            commit(MutationType.SET_SCHEMA_DRI_TITLE, schema);
          }
        }
      },
      async[ActionType.TOGGLE_UI_IS_FLUID]({ commit, state }) {
        commit(MutationType.SET_UI_IS_FLUID, !state.ui.isFluid);
      },
    }
  });
}