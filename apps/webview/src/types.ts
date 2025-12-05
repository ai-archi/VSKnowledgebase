export interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  type: 'tag' | 'code-related' | 'task';
  requiredTags?: string[];
  optionalTags?: string[];
  excludedTags?: string[];
  codeRelatedConfig?: {
    mode: 'forward' | 'reverse';
    currentFilePath?: string;
  };
  isPredefined: boolean;
  isDefault?: boolean;
}

export interface Artifact {
  id: string;
  title: string;
  path: string;
  contentLocation: string;
  vault: {
    id: string;
    name: string;
  };
  tags?: string[];
  viewType?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | string;
  artifactId: string;
  artifactPath: string;
  vaultId: string;
  workflowStep?: string;
  workflowData?: any;
  createdAt?: Date | string;
}

export interface RelatedFile {
  id: string;
  name: string;
  path: string;
  type: 'document' | 'design' | 'code';
  icon?: string;
}

