/**
 * Deprecated aliases for consumers migrating from `vaultifier`.
 *
 * semcon-js is the successor of vaultifier — these aliases map the old
 * Vault* names onto their Semcon* counterparts so existing code keeps
 * compiling. They will be removed in a future major version.
 */
import { Semcon, SemconOptions } from './semcon';
import {
  SemconCredentials,
  SemconData,
  SemconInfo,
  SemconItem,
  SemconItemQuery,
  SemconItemsQuery,
  SemconMeta,
  SemconMinMeta,
  SemconPostItem,
  SemconSchema,
  SemconSupport,
} from './interfaces';

/** @deprecated use {@link Semcon} instead */
export const Vaultifier = Semcon;
/** @deprecated use {@link Semcon} instead */
export type Vaultifier = Semcon;

/** @deprecated use {@link SemconOptions} instead */
export type VaultifierOptions = SemconOptions;
/** @deprecated use {@link SemconCredentials} instead */
export type VaultCredentials = SemconCredentials;
/** @deprecated use {@link SemconData} instead */
export type VaultData = SemconData;
/** @deprecated use {@link SemconInfo} instead */
export type VaultInfo = SemconInfo;
/** @deprecated use {@link SemconItem} instead */
export type VaultItem = SemconItem;
/** @deprecated use {@link SemconItemQuery} instead */
export type VaultItemQuery = SemconItemQuery;
/** @deprecated use {@link SemconItemsQuery} instead */
export type VaultItemsQuery = SemconItemsQuery;
/** @deprecated use {@link SemconMeta} instead */
export type VaultMeta = SemconMeta;
/** @deprecated use {@link SemconMinMeta} instead */
export type VaultMinMeta = SemconMinMeta;
/** @deprecated use {@link SemconPostItem} instead */
export type VaultPostItem = SemconPostItem;
/** @deprecated use {@link SemconSchema} instead */
export type VaultSchema = SemconSchema;
/** @deprecated use {@link SemconSupport} instead */
export type VaultSupport = SemconSupport;
