import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Base directory for all project workspaces
const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/tmp/workspaces';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // Get the filesystem path for a project
  getProjectPath(projectId: string): string {
    return path.join(WORKSPACES_DIR, projectId);
  }

  // Ensure the workspaces directory exists
  async ensureWorkspacesDir(): Promise<void> {
    try {
      await fs.mkdir(WORKSPACES_DIR, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  // Create project directory on filesystem
  async createProjectDirectory(projectId: string): Promise<string> {
    await this.ensureWorkspacesDir();
    const projectPath = this.getProjectPath(projectId);
    await fs.mkdir(projectPath, { recursive: true });
    return projectPath;
  }

  // Sync files from database to filesystem
  async syncFilesToDisk(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    await fs.mkdir(projectPath, { recursive: true });

    const files = await this.prisma.file.findMany({
      where: { projectId },
    });

    for (const file of files) {
      const filePath = path.join(projectPath, file.path);
      const dirPath = path.dirname(filePath);

      if (file.type === 'FOLDER') {
        await fs.mkdir(filePath, { recursive: true });
      } else {
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, file.content || '', 'utf-8');
      }
    }
  }

  // Sync files from filesystem to database
  async syncFilesFromDisk(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    
    try {
      await this.syncDirectory(projectId, projectPath, '');
    } catch (error) {
      console.error('Error syncing files from disk:', error);
    }
  }

  private async syncDirectory(projectId: string, basePath: string, relativePath: string): Promise<void> {
    const fullPath = path.join(basePath, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const entryFullPath = path.join(fullPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other large directories
        if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          continue;
        }

        // Upsert folder
        await this.prisma.file.upsert({
          where: {
            projectId_path: { projectId, path: '/' + entryRelativePath },
          },
          create: {
            projectId,
            path: '/' + entryRelativePath,
            name: entry.name,
            type: 'FOLDER',
          },
          update: {},
        });

        // Recurse into subdirectory
        await this.syncDirectory(projectId, basePath, entryRelativePath);
      } else {
        // Read file content
        const content = await fs.readFile(entryFullPath, 'utf-8').catch(() => '');
        const size = (await fs.stat(entryFullPath)).size;

        // Upsert file
        await this.prisma.file.upsert({
          where: {
            projectId_path: { projectId, path: '/' + entryRelativePath },
          },
          create: {
            projectId,
            path: '/' + entryRelativePath,
            name: entry.name,
            content,
            type: 'FILE',
            size,
            language: this.getLanguageFromFilename(entry.name),
          },
          update: {
            content,
            size,
          },
        });
      }
    }
  }

  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
      html: 'html', css: 'css', scss: 'scss', json: 'json', md: 'markdown',
      yml: 'yaml', yaml: 'yaml', sql: 'sql', sh: 'bash', dockerfile: 'dockerfile',
    };
    return langMap[ext] || 'plaintext';
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { files: true, deployments: true },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Include the filesystem path
    return {
      ...project,
      path: this.getProjectPath(id),
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        template: dto.template,
        userId,
      },
    });

    // Create project directory on filesystem
    const projectPath = await this.createProjectDirectory(project.id);
    console.log(`[Projects] Created project directory: ${projectPath}`);

    // Create template files if specified
    if (dto.template) {
      await this.createTemplateFiles(project.id, dto.template);
      // Sync to filesystem
      await this.syncFilesToDisk(project.id);
    }

    // Return project with path
    return {
      ...project,
      path: projectPath,
    };
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const result = await this.prisma.project.updateMany({
      where: { id, userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.settings && { settings: dto.settings }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Project not found');
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.project.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Project not found');
    }

    return { message: 'Project deleted' };
  }

  private async createTemplateFiles(projectId: string, template: string) {
    const templates: Record<string, Array<{ path: string; name: string; content: string }>> = {
      react: [
        {
          path: '/src/App.tsx',
          name: 'App.tsx',
          content: `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">Hello React!</h1>
    </div>
  );
}`,
        },
        {
          path: '/src/index.tsx',
          name: 'index.tsx',
          content: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        {
          path: '/package.json',
          name: 'package.json',
          content: JSON.stringify({
            name: 'react-app',
            version: '1.0.0',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
            },
            devDependencies: {
              '@types/react': '^18.2.0',
              '@types/react-dom': '^18.2.0',
              '@vitejs/plugin-react': '^4.0.0',
              typescript: '^5.0.0',
              vite: '^5.0.0',
            },
          }, null, 2),
        },
      ],
      node: [
        {
          path: '/src/index.ts',
          name: 'index.ts',
          content: `import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Node.js!' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`,
        },
        {
          path: '/package.json',
          name: 'package.json',
          content: JSON.stringify({
            name: 'node-app',
            version: '1.0.0',
            main: 'dist/index.js',
            scripts: {
              dev: 'tsx watch src/index.ts',
              build: 'tsc',
              start: 'node dist/index.js',
            },
            dependencies: {
              express: '^4.18.0',
            },
            devDependencies: {
              '@types/express': '^4.17.0',
              '@types/node': '^20.0.0',
              tsx: '^4.0.0',
              typescript: '^5.0.0',
            },
          }, null, 2),
        },
      ],
    };

    const templateFiles = templates[template] || [];
    
    for (const file of templateFiles) {
      await this.prisma.file.create({
        data: {
          projectId,
          path: file.path,
          name: file.name,
          content: file.content,
          type: 'FILE',
        },
      });
    }
  }
}
