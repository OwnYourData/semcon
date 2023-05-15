import axios, { AxiosResponse } from 'axios';
import { CheckUserResponse } from "./models/CheckUserResponse";

interface user_PostData {
    username: string;
    password: string;
}
interface backup_PostData {
    username: string;
    password: string;
    payload: any;
    expiry?: Date;
}

export function getSemcon(
    baseUrl: string,
) {
    async function version(): Promise<string> {
        const retVal = await axios.get(`${baseUrl}/version`);
        return retVal.data;
    }

    async function checkUser(
        username: string,
        password: string
    ): Promise<CheckUserResponse> {
        try {
            const data: user_PostData = {
                username: username,
                password: password,
            };
            const retVal: AxiosResponse<CheckUserResponse> = await axios.post(`${baseUrl}/checkUser`, data, {
                 headers: {'Content-Type': 'application/json'}
            });
            return retVal.data;
        } catch(error){
            return Promise.reject(error);
        }
    }

    async function backup(
        username: string,
        password: string,
        payload: any,
        expiry?: Date
    ): Promise<string> {
        if (!expiry) {
            let expiry: Date = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
        }
        const data: backup_PostData = {
            username: username,
            password: password,
            payload: payload,
            expiry: expiry,
        };
        const retVal: AxiosResponse = await axios.post(`${baseUrl}/backup`, data, {
            headers: {'Content-Type': 'application/json'}
        });
        return retVal.data;
    }

    async function restore(
        username: string,
        password: string,
    ): Promise<string> {
        const data: user_PostData = {
            username: username,
            password: password,
        };
        const retVal: AxiosResponse = await axios.post(`${baseUrl}/restore`, data, {
            headers: {'Content-Type': 'application/json'}
        });
        return retVal.data;
    }

    return {
        version,
        checkUser,
        backup,
        restore,
    }
}
