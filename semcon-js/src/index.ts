import axios from "axios";

export function getSemcon(
    baseUrl: string,
) {
    async function version(): Promise<string> {
        const retVal = await axios.get(`${baseUrl}/version`);
        return retVal.data;
    }
    
    return {
        version,
    }
}
