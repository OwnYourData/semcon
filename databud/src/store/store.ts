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
  schema?: VaultSchema;
  fetchContent?: boolean;
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
    all: VaultMeta[],
    allState: FetchState,
    current?: VaultItem,
    currentState: FetchState,
    paging?: Paging,
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
        if (payload.id) {
          await getInstance().updateItem(payload);
          dispatch(ActionType.FETCH_VAULT_ITEM, { id: payload.id } as VaultMinMeta);
        }
        else
          await getInstance().postItem(payload);

      },
      async [ActionType.DELETE_VAULT_ITEM]({ state, commit, dispatch }, payload: VaultMeta) {
        await getInstance().deleteItem({
          id: payload.id,
        });

        if (state.vaultItem.current?.id === payload.id)
          commit(MutationType.SET_VAULT_ITEM, undefined);
      },
      async [ActionType.FETCH_SCHEMA_DRIS]({ commit, dispatch }) {
        await doFetch<VaultSchema[]>(
          commit,
          () => getInstance().getSchemas(),
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

        if (schema) {
          try {
            const doc = await soya.pull(schema.dri);
            commit(MutationType.SET_CURRENT_SCHEMA, doc);

            const sparql = await soya.getSparqlBuilder(doc);
            const bindings = await sparql.query(`
            PREFIX soya: <${doc["@context"]["@base"]}>
            SELECT * WHERE {
                ?base a soya:OverlayDataBudRendering .
            }`);

            // if there is an overlay for DataBudRendering
            // we want to fetch the whole content
            if (bindings.length > 0)
              fetchContent = true;
          } catch { /* if it goes wrong we don't care */ }
        }

        await doFetch<MultiResponse<VaultMeta>>(
          commit,
          async () => {
            let query: VaultItemsQuery | undefined = {
              page: {
                page,
                size,
              },
            };
            let instance: Vaultifier;

            if (schema) {
              instance = getInstance();
              query = {
                ...query,
                schema: schema?.dri,
              };
            }
            else if (repo) {
              instance = await getInstance().fromRepo(repo.identifier);
            }
            else
              throw new Error('Schema and repo are undefined');

            if (fetchContent)
              return instance.getItems(query);
            else
              return instance.getMetaItems(query);
          },
          (commit, data) => {
            commit(MutationType.SET_VAULT_ITEMS, data.items);
            commit(MutationType.SET_VAULT_ITEMS_PAGING, data.paging);
          },
          (store, state) => store.vaultItem.allState = state,
        );
      },
      async[ActionType.FETCH_VAULT_ITEM]({ commit }, payload: VaultMinMeta) {
        await doFetch<VaultItem>(
          commit,
          () => getInstance().getItem({ id: payload.id }),
          (commit, data) => commit(MutationType.SET_VAULT_ITEM, data),
          (store, state) => store.vaultItem.currentState = state,
        )
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