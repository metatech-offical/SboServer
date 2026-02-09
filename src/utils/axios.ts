import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { printError } from "./responseHandler";

export const POSTAPI = async <T = any>(
  url: string,
  data: any,
  config?: AxiosRequestConfig
): Promise<{
  success: boolean;
  status: number;
  data: T | null;
  error?: any;
}> => {
  try {
    const response: AxiosResponse<T> = await axios.post(url, data, config);
    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error: any) {
    // Log detailed error info for debugging
    printError(error, "thirdPartyApiPost");
    return {
      success: false,
      status: error?.response?.status || 500,
      data: null,
      error: error?.response?.data || error.message,
    };
  }
};
