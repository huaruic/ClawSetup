export type Provider = {
  id: string;
  name: string;
  authChoice: string;
  apiKeyFlag: string;
  placeholder: string;
  regions?: Array<{
    id: string;
    label: string;
    baseUrl: string;
    helpText?: string;
  }>;
  extra?: { label: string; flag: string; placeholder: string }[];
};

export const providers: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    authChoice: 'anthropic-api-key',
    apiKeyFlag: '--anthropic-api-key',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    authChoice: 'openai-api-key',
    apiKeyFlag: '--openai-api-key',
    placeholder: 'sk-...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    authChoice: 'gemini-api-key',
    apiKeyFlag: '--gemini-api-key',
    placeholder: 'AIza...',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    authChoice: 'openrouter-api-key',
    apiKeyFlag: '--openrouter-api-key',
    placeholder: 'sk-or-...',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    authChoice: 'moonshot-api-key',
    apiKeyFlag: '--moonshot-api-key',
    placeholder: 'sk-...',
    regions: [
      {
        id: 'china',
        label: 'China Mainland',
        baseUrl: 'https://api.moonshot.cn/v1',
        helpText: 'Use this for Kimi/Moonshot keys issued in mainland China.',
      },
      {
        id: 'global',
        label: 'International',
        baseUrl: 'https://api.moonshot.ai/v1',
        helpText: 'Use this for international Moonshot accounts and keys.',
      },
    ],
  },
  {
    id: 'kimi-code',
    name: 'Kimi Code',
    authChoice: 'kimi-code-api-key',
    apiKeyFlag: '--kimi-code-api-key',
    placeholder: 'sk-...',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    authChoice: 'minimax-api-key',
    apiKeyFlag: '--minimax-api-key',
    placeholder: 'eyJ...',
  },
  {
    id: 'volcengine',
    name: '火山引擎 (Volcengine)',
    authChoice: 'volcengine-api-key',
    apiKeyFlag: '--volcengine-api-key',
    placeholder: '',
  },
  {
    id: 'qianfan',
    name: '千帆 (Baidu)',
    authChoice: 'qianfan-api-key',
    apiKeyFlag: '--qianfan-api-key',
    placeholder: '',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    authChoice: 'xai-api-key',
    apiKeyFlag: '--xai-api-key',
    placeholder: 'xai-...',
  },
  {
    id: 'together',
    name: 'Together AI',
    authChoice: 'together-api-key',
    apiKeyFlag: '--together-api-key',
    placeholder: '',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    authChoice: 'mistral-api-key',
    apiKeyFlag: '--mistral-api-key',
    placeholder: '',
  },
  {
    id: 'zai',
    name: 'Z.AI',
    authChoice: 'zai-api-key',
    apiKeyFlag: '--zai-api-key',
    placeholder: 'sk-...',
    regions: [
      {
        id: 'china',
        label: 'China Mainland',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        helpText: 'Use this for Zhipu / BigModel keys issued in mainland China.',
      },
      {
        id: 'global',
        label: 'International',
        baseUrl: 'https://api.z.ai/api/paas/v4',
        helpText: 'Use this for international Z.AI accounts and keys.',
      },
    ],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    authChoice: 'huggingface-api-key',
    apiKeyFlag: '--huggingface-api-key',
    placeholder: 'hf_...',
  },
  {
    id: 'litellm',
    name: 'LiteLLM',
    authChoice: 'litellm-api-key',
    apiKeyFlag: '--litellm-api-key',
    placeholder: '',
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    authChoice: 'custom-api-key',
    apiKeyFlag: '--custom-api-key',
    placeholder: 'API key (optional)',
    extra: [
      { label: 'Base URL', flag: '--custom-base-url', placeholder: 'https://api.example.com/v1' },
      { label: 'Model ID', flag: '--custom-model-id', placeholder: 'model-name' },
    ],
  },
];
