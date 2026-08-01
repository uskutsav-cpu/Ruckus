export type SafeEventEmbeddingInput = {
  eventId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  organizationName: string | null;
};

export type EventEmbedding = {
  values: number[];
  provider: string;
  modelVersion: string;
};

export interface EventEmbeddingProvider {
  readonly name: string;
  readonly modelVersion: string;
  embedBatch(inputs: SafeEventEmbeddingInput[]): Promise<EventEmbedding[]>;
}

// Paid providers are intentionally not instantiated from repository defaults.
// A reviewed adapter can be added here only after credentials, cost limits, and
// an explicit production feature-flag approval exist.
export function configuredEmbeddingProvider(): EventEmbeddingProvider | null {
  return null;
}
