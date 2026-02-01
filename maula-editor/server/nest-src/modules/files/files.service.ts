import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Base directory for all project workspaces
const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/tmp/workspaces';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  // Get the filesystem path for a project file
  private getFilePath(projectId: string, filePath: string): string {
    return path.join(WORKSPACES_DIR, projectId, filePath);
  }

  // Sync a file to the filesystem
  private async syncToFilesystem(projectId: string, filePath: string, content: string, type: string): Promise<void> {
    const fullPath = this.getFilePath(projectId, filePath);
    const dirPath = path.dirname(fullPath);

    try {
      if (type === 'FOLDER') {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(fullPath, content || '', 'utf-8');
      }
      console.log(`[Files] Synced to filesystem: ${fullPath}`);
    } catch (error) {
      console.error(`[Files] Failed to sync to filesystem: ${fullPath}`, error);
    }
  }

  // Delete a file from the filesystem
  private async deleteFromFilesystem(projectId: string, filePath: string): Promise<void> {
    const fullPath = this.getFilePath(projectId, filePath);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
      console.log(`[Files] Deleted from filesystem: ${fullPath}`);
    } catch (error) {
      console.error(`[Files] Failed to delete from filesystem: ${fullPath}`, error);
    }
  }

  async findByProject(projectId: string, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.file.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        id,
        project: { userId },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async create(userId: string, dto: CreateFileDto) {
    // Verify project ownership
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const file = await this.prisma.file.create({
      data: {
        projectId: dto.projectId,
        path: dto.path,
        name: dto.name,
        content: dto.content || '',
        type: dto.type || 'FILE',
        language: this.getLanguageFromFilename(dto.name),
      },
    });

    // Sync to filesystem
    await this.syncToFilesystem(dto.projectId, dto.path, dto.content || '', dto.type || 'FILE');

    return file;
  }

  async update(id: string, userId: string, dto: UpdateFileDto) {
    // Verify ownership
    const file = await this.prisma.file.findFirst({
      where: {
        id,
        project: { userId },
      },
      include: { project: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const updatedFile = await this.prisma.file.update({
      where: { id },
      data: {
        content: dto.content,
        size: dto.content?.length || 0,
      },
    });

    // Sync to filesystem
    await this.syncToFilesystem(file.projectId, file.path, dto.content || '', file.type);

    return updatedFile;
  }

  async remove(id: string, userId: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        id,
        project: { userId },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Delete from filesystem
    await this.deleteFromFilesystem(file.projectId, file.path);

    await this.prisma.file.delete({ where: { id } });
    return { message: 'File deleted' };
  }

  async rename(id: string, userId: string, newName: string, newPath: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        id,
        project: { userId },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.prisma.file.update({
      where: { id },
      data: {
        name: newName,
        path: newPath,
        language: this.getLanguageFromFilename(newName),
      },
    });
  }

  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      dockerfile: 'dockerfile',
      xml: 'xml',
      vue: 'vue',
      svelte: 'svelte',
    };
    return languageMap[ext || ''] || 'plaintext';
  }
}
