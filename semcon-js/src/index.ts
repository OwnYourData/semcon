import axios, { AxiosResponse } from 'axios';
import { CheckUserResponse, BackupResponse } from "./models/response";
import { SemconError } from "./models/error/";

export function getSemcon(
  baseUrl: string,
) {
  async function version(): Promise<string> {
    const retVal = await axios.get(`${baseUrl}/version`);
    return retVal.data;
  }

  async function checkUser(
    data: UserPostData
  ): Promise<CheckUserResponse> {
    try {
      const retVal: AxiosResponse<CheckUserResponse> = await axios.post(`${baseUrl}/checkUser`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return retVal.data;
    } catch (error) {
      return Promise.reject(new SemconError('Error while checking user', error));
    }
  }

  async function backup(
    username: string,
    password: string,
    payload: any,
    expiry?: Date
  ): Promise<BackupResponse> {
    try {
      if (!expiry) {
        let expiry: Date = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
      }
      const data: BackupPostData = {
        username: username,
        password: password,
        payload: payload,
        expiry: expiry,
      };
      const retVal: AxiosResponse = await axios.post(`${baseUrl}/backup`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return retVal.data;
    } catch (error) {
      return Promise.reject(new SemconError('Error creating backup', error));
    }
  }

  async function restore(
   data: UserPostData
  ): Promise<any> {
    try {
      const retVal: AxiosResponse = await axios.post(`${baseUrl}/restore`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return retVal.data;
    } catch (error) {
      return Promise.reject(new SemconError('Error while restoring', error));
    }
  }

  return {
    version,
    checkUser,
    backup,
    restore,
  }
}
