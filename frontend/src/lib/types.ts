export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  files?: {
    url: string;
    description?: string;
  }[];
  likes?: number;
  timestamp?: Date;
}

export interface FileContent {
  name: string;
  content: string;
  language?: string;
  description?: string;
}

export interface GeneratedFiles {
  files: FileContent[];
  preview?: string;
  descriptions?: Record<string, string>;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  tags: string[];
  upvotes: number;
  url: string;
  images?: {
    url: string;
    description?: string;
  }[];
}