'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface ProjectModule {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}

interface ProjectContextType {
  modules: ProjectModule[];
  addModule: (name: string, code: string) => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, code: string) => void;
  clearModules: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<ProjectModule[]>([]);

  const addModule = (name: string, code: string) => {
    const newModule: ProjectModule = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name,
      code,
      createdAt: new Date(),
    };
    setModules(prev => [...prev, newModule]);
  };

  const removeModule = (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const updateModule = (id: string, code: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, code } : m));
  };

  const clearModules = () => setModules([]);

  return (
    <ProjectContext.Provider value={{ modules, addModule, removeModule, updateModule, clearModules }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
}