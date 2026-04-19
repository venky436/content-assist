import {
	analyzeResponseSchema,
	type AnalyzeRequest,
	type AnalyzeResponse,
} from "@content-assist/shared";
import { api } from "@mobile/lib/api-client";

export const analyzeApi = {
	analyze: (body: AnalyzeRequest): Promise<AnalyzeResponse> =>
		api.post("/analyze", analyzeResponseSchema, { json: body }),
};
