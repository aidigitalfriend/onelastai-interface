/**
 * Prebuilt Templates Gallery Component
 * Displays full application templates with preview functionality
 */

import React, { useState, useCallback } from 'react';
import { PREBUILT_TEMPLATES, PrebuiltTemplate, PREBUILT_CATEGORIES } from '../data/prebuiltTemplates';
import { FileNode, ProjectTemplate } from '../types';
import { useStore } from '../store/useStore';

interface PrebuiltTemplatesGalleryProps {
  onSelectTemplate: (template: ProjectTemplate, files: FileNode[]) => void;
  onClose?: () => void;
}

const PrebuiltTemplatesGallery: React.FC<PrebuiltTemplatesGalleryProps> = ({ 
  onSelectTemplate,
  onClose 
}) => {
  const theme = useStore((state) => state.theme);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PrebuiltTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = theme === 'light';

  const filteredTemplates = PREBUILT_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           template.category === selectedCategory ||
                           template.techStack.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  // Helper function to get language from filename
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'sql': 'sql',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  // Convert template files to FileNode structure
  const convertToFileNodes = useCallback((files: Record<string, string>): FileNode[] => {
    const root: FileNode[] = [];
    
    Object.entries(files).forEach(([path, content]) => {
      const parts = path.split('/');
      let currentLevel = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const existingNode = currentLevel.find(n => n.name === part);
        
        if (existingNode) {
          if (existingNode.children) {
            currentLevel = existingNode.children;
          }
        } else {
          const newNode: FileNode = {
            name: part,
            type: isFile ? 'file' : 'folder',
            path: parts.slice(0, index + 1).join('/'),
            ...(isFile ? {
              content,
              language: getLanguageFromFilename(part)
            } : {
              children: []
            })
          };
          currentLevel.push(newNode);
          if (!isFile && newNode.children) {
            currentLevel = newNode.children;
          }
        }
      });
    });

    return root;
  }, []);

  const handleSelectTemplate = useCallback((template: PrebuiltTemplate) => {
    const files = convertToFileNodes(template.files);
    onSelectTemplate(template, files);
    if (onClose) onClose();
  }, [convertToFileNodes, onSelectTemplate, onClose]);

  const handlePreview = (template: PrebuiltTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode('preview');
  };

  return (
    <div className={`h-full flex flex-col ${isLight ? 'bg-white text-gray-800' : 'bg-vscode-sidebar text-white'} font-mono`}>
      {/* Search */}
      <div className={`p-3 border-b ${isLight ? 'border-gray-200' : 'border-vscode-border bg-vscode-bg/50'}`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border ${isLight ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-vscode-bg border-vscode-border text-white placeholder-vscode-textMuted'} px-3 py-1.5 text-xs focus:outline-none focus:border-vscode-accent pl-7 font-mono rounded`}
          />
          <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-400' : 'text-vscode-textMuted'} text-xs`}>▶</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className={`px-3 py-2 border-b ${isLight ? 'border-gray-200' : 'border-vscode-border'} overflow-x-auto scrollbar-none`}>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition border rounded ${
              selectedCategory === 'all'
                ? 'bg-vscode-accent text-white border-vscode-accent'
                : isLight 
                  ? 'bg-gray-100 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'
                  : 'bg-vscode-sidebar border-vscode-border text-vscode-textMuted hover:border-vscode-accent hover:text-white'
            }`}
          >
            All
          </button>
          {PREBUILT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition flex items-center gap-1 rounded ${
                selectedCategory === cat.id
                  ? 'bg-vscode-accent/20 text-vscode-accent'
                  : isLight
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-vscode-textMuted hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List or Preview */}
      <div className="flex-1 overflow-auto p-2">
        {selectedTemplate ? (
          /* Template Preview Mode */
          <div className="h-full flex flex-col">
            {/* Compact Header Bar */}
            <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isLight ? 'border-gray-200' : 'border-vscode-border'}`}>
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-gray-500 hover:text-gray-800' : 'text-vscode-textMuted hover:text-white'} px-1.5 py-0.5 hover:bg-white/5 transition font-medium rounded`}
              >
                <span>◀</span>
                Back
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    previewMode === 'preview' 
                      ? 'bg-vscode-accent/20 text-vscode-accent' 
                      : isLight ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-100' : 'text-vscode-textMuted hover:text-white hover:bg-white/5'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setPreviewMode('code')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    previewMode === 'code' 
                      ? 'bg-vscode-accent/20 text-vscode-accent' 
                      : isLight ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-100' : 'text-vscode-textMuted hover:text-white hover:bg-white/5'
                  }`}
                >
                  Code
                </button>
              </div>
            </div>

            {/* Large Preview Area */}
            <div className={`flex-1 ${isLight ? 'bg-white' : 'bg-vscode-bg'} overflow-hidden border ${isLight ? 'border-gray-200' : 'border-vscode-border'} min-h-0 rounded`}>
              {previewMode === 'preview' ? (
                <iframe
                  srcDoc={selectedTemplate.files['index.html']}
                  className="w-full h-full bg-white"
                  title="Template Preview"
                  sandbox="allow-scripts"
                  style={{ minHeight: '300px' }}
                />
              ) : (
                <pre className="p-3 text-xs overflow-auto h-full font-mono">
                  <code className={isLight ? 'text-gray-800' : 'text-green-400'}>
                    {selectedTemplate.files['index.html']}
                  </code>
                </pre>
              )}
            </div>

            {/* Compact Footer */}
            <div className={`mt-2 pt-2 border-t ${isLight ? 'border-gray-200' : 'border-vscode-border'} flex items-center justify-between gap-3`}>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedTemplate.name}</h3>
                <p className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-vscode-textMuted'} truncate`}>{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => handleSelectTemplate(selectedTemplate)}
                className="bg-vscode-accent hover:bg-vscode-accentHover text-white px-3 py-1 text-[10px] font-medium transition flex-shrink-0 rounded"
              >
                Use
              </button>
            </div>
          </div>
        ) : (
          /* Templates List - Single Column */
          <div className="flex flex-col gap-2">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className={`${isLight ? 'bg-white' : 'bg-vscode-sidebar'} overflow-hidden border ${isLight ? 'border-gray-200 hover:border-blue-500' : 'border-vscode-border hover:border-vscode-accent'} transition group rounded`}
              >
                {/* Compact Card Layout */}
                <div className="p-3">
                  {/* Header Row */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-2xl flex-shrink-0">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{template.name}</h3>
                      <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-vscode-textMuted'} truncate`}>{template.description}</p>
                    </div>
                  </div>
                  
                  {/* Tech Stack */}
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {template.techStack.slice(0, 3).map((tech, i) => (
                      <span key={i} className={`text-[9px] px-1 py-0.5 font-medium rounded ${isLight ? 'text-green-700 bg-green-100' : 'text-green-400/80 bg-green-400/10'}`}>
                        {tech}
                      </span>
                    ))}
                    {template.techStack.length > 3 && (
                      <span className={`text-[9px] ${isLight ? 'text-gray-500' : 'text-vscode-textMuted'} font-medium`}>+{template.techStack.length - 3}</span>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handlePreview(template)}
                      className={`flex-1 py-0.5 text-[10px] transition font-medium rounded ${isLight ? 'hover:bg-gray-100 text-gray-600 hover:text-gray-900' : 'hover:bg-white/5 text-vscode-textMuted hover:text-white'}`}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex-1 py-0.5 text-[10px] font-medium transition rounded ${isLight ? 'bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white' : 'bg-vscode-accent/20 text-vscode-accent hover:bg-vscode-accent hover:text-white'}`}
                    >
                      Use
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTemplates.length === 0 && !selectedTemplate && (
          <div className={`text-center py-12 border border-dashed rounded ${isLight ? 'text-gray-400 border-gray-300' : 'text-vscode-textMuted border-vscode-border'}`}>
            <span className="text-4xl block mb-4">▶</span>
            <p className="font-medium">No templates found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrebuiltTemplatesGallery;
