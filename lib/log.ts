// One structured line per request (backend_planning.md "Log request ID, provider/model,
// prompt version, part, elapsed time, token usage, retry count, and validation status").
// Never pass handwriting images, PDFs, transcriptions, keys, or full provider payloads.
export function logRequest(fields: Record<string, string | number | boolean | null | undefined | object>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
}
