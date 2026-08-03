export function isIngestionDisabled(): boolean {
  return process.env.INGESTION_DISABLED === "true";
}
