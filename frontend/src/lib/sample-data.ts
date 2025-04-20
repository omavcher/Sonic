export const sampleTemplates = [
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'A modern React setup with Vite, TypeScript, and TailwindCSS',
    tags: ['react', 'vite', 'typescript', 'tailwind'],
    files: [
      {
        name: 'src/App.tsx',
        content: `import { useState } from 'react'
function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="p-4">
      <h1>Vite + React</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}`
      },
      {
        name: 'package.json',
        content: `{
  "name": "vite-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}`
      }
    ]
  }
];

export const sampleProjects: Project[] = [
  {
    id: 'gpt-chain',
    title: 'GPT Chain',
    description: 'Let ChatGPT work for you 24/7',
    author: {
      name: 'TheVeller',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
    },
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
    tags: ['AI', 'Productivity', 'Utility'],
    upvotes: 52,
    url: '/projects/gpt-chain'
  },
  {
    id: 'deep-term',
    title: 'DeepTerm',
    description: 'Pomodoro with To Do and Notes Maker AI',
    author: {
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop'
    },
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=400&fit=crop',
    tags: ['AI', 'Productivity'],
    upvotes: 68,
    url: '/projects/deep-term'
  },
  {
    id: 'cumulate',
    title: 'Cumulate',
    description: 'Your Personal AI Finance Manager',
    author: {
      name: 'Sarah Wilson',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    },
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
    tags: ['AI', 'Finance'],
    upvotes: 62,
    url: '/projects/cumulate'
  }
];