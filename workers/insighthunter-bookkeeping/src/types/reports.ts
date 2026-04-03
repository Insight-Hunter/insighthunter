export interface Report {
    id: string;
    title: string;
    client: string;
    status: 'Queued' | 'Generating' | 'Generated' | 'Failed';
    generatedAt?: string;
    createdAt: string;
  }