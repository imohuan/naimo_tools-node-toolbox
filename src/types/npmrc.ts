// npmrc 配置相关类型定义

export interface NpmrcConfigItem {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'select' | 'boolean' | 'number';
  value: string;
  defaultValue?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
  placeholder?: string;
  required?: boolean;
}

export interface NpmrcConfig {
  id: string;
  name: string;
  description: string;
  items: NpmrcConfigItem[];
}

export type ViewMode = 'dual' | 'edit' | 'preview';

