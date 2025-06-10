import { NetworkResponse } from './communicator';
import { Paging, SemconItem, SemconMeta, SemconMinMeta } from './interfaces';

export const parseSemconItemMeta = (data: any): SemconMeta => ({
  id: data.id,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  dri: data.dri,
  // we always provide a fallback value for meta
  meta: data.meta ?? {},
  // raw data
  raw: data,
});

export const parseSemconItem = async (data: any): Promise<SemconItem> => {
  if (typeof data === 'string') {
    try {
      // item usually contains JSON data, therefore we try to parse the string
      data = JSON.parse(data);
    } catch { /* */ }
  }

  const item: SemconItem = {
    ...parseSemconItemMeta(data),
    data: data.data,
  };

  return item;
}

export const parsePostResult = (response: NetworkResponse): SemconMinMeta => {
  const { data } = response;

  return {
    id: data.id,
    raw: data,
  };
}

const parsePagingHeaderValue = (value: string | number) => {
  return typeof value === 'string' ? parseInt(value) : value;
}

export const getPaging = (response: NetworkResponse): Paging => {
  const currentPage = response.headers.get('current-page');
  const totalPages = response.headers.get('total-pages');
  const totalItems = response.headers.get('total-count');
  const pageItems = response.headers.get('page-items');

  return {
    current: parsePagingHeaderValue(currentPage ?? "0"),
    totalPages: parsePagingHeaderValue(totalPages ?? "0"),
    totalItems: parsePagingHeaderValue(totalItems ?? "0"),
    pageItems: parsePagingHeaderValue(pageItems ?? "0"),
  };
}