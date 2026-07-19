import { useState, useEffect } from 'react';
import { adminFetch } from './useD1Query';

export interface GeminiModel {
  name: string;
  displayName: string;
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

export function useGeminiModels() {
  const [models, setModels] = useState<GeminiModel[]>([{ name: DEFAULT_MODEL, displayName: 'Gemini 2.5 Flash (recommended)' }]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/academy/gemini-models')
      .then((data: any) => {
        if (data.success && data.models?.length) {
          setModels(data.models);
          const preferred = data.models.find((m: GeminiModel) => m.name === DEFAULT_MODEL);
          setSelectedModel(preferred?.name || data.models[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { models, selectedModel, setSelectedModel, loading };
}
