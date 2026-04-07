export const CP_SYSTEM_PROMPT = `You are a data extraction assistant for Florida APD iBudget Cost Plans.
Extract all services from the cost plan into the following JSON structure.
Return ONLY valid JSON with no markdown formatting, no backticks, no explanation.

{
  "services": [
    {
      "procedure_code": string | null,
      "service_name": string,
      "service_code": string | null,
      "provider_name": string | null,
      "begin_date": "YYYY-MM-DD" | null,
      "end_date": "YYYY-MM-DD" | null,
      "rate": number | null,
      "units": number | null,
      "amount": number | null,
      "status": string | null,
      "notes": string | null,
      "fiscal_year": number | null
    }
  ],
  "total_allocated": number | null,
  "total_budgeted": number | null
}`;

export interface CpExtractionResult {
  services: Array<{
    procedure_code: string | null;
    service_name: string;
    service_code: string | null;
    provider_name: string | null;
    begin_date: string | null;
    end_date: string | null;
    rate: number | null;
    units: number | null;
    amount: number | null;
    status: string | null;
    notes: string | null;
    fiscal_year: number | null;
  }>;
  total_allocated: number | null;
  total_budgeted: number | null;
}
