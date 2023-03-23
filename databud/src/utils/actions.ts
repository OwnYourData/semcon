import { ConfigService } from "@/services/config-service";
import { Vaultifier, VaultItem } from "vaultifier";
import { NetworkResponse } from "vaultifier/dist/module/communicator";
import Vue from "vue";

export interface Action {
  key: string,
  title: string,
  url: string,
  usesAuth: boolean,
  method: string,
}

export const executeAction = async (action: Action, vaultifier: Vaultifier, vue?: Vue, item?: VaultItem): Promise<NetworkResponse | undefined> => {
  const { key, title, method, usesAuth } = action;
  let { url } = action;

  const baseUrlPlaceholder = '{{base_url}}';
  const vaultItemIdPlaceholder = '{{item_id}}';

  if (item)
    url = url.replace(vaultItemIdPlaceholder, item.id.toString());

  let returnValue: NetworkResponse | undefined = undefined;

  // method `OPEN` just opens a new tab
  if (method === 'OPEN') {
    window.open(url, '_blank');
  }
  else
    try {
      if (url.indexOf(baseUrlPlaceholder) !== -1) {
        const vaultifierUrl = url.replace(baseUrlPlaceholder, '');

        if (method === 'POST')
          returnValue = await vaultifier.post(vaultifierUrl, usesAuth);
        else if (method === 'PUT')
          returnValue = await vaultifier.put(vaultifierUrl, usesAuth);
        else if (method === 'GET')
          returnValue = await vaultifier.get(vaultifierUrl, usesAuth);
        else
          throw new Error(`Invalid method for action ${key}`);
      }
      else {
        const req = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (req.status >= 400)
          throw new Error('Action did not result in a valid HTTP status code');
      }

      if (vue)
        vue.$bvModal.msgBoxOk(`The action "${title}" was executed succssfully.`);
    } catch {
      if (vue)
        vue.$bvModal.msgBoxOk(`The action "${title}" has failed.`);
    }

    return returnValue;
}

export const getActionsFromConfig = (...path: string[]): Action[] => {
  const actionsObj = ConfigService.get(...path);
  const arr: Action[] = []

  for (const key in actionsObj) {
    arr.push({
      usesAuth: false,
      ...actionsObj[key],
      key,
    });
  }

  return arr;
}