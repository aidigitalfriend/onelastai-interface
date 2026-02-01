/**
 * Production Git Controller - REST API for Git Operations
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GitService } from './git.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Utility to safely extract error message from unknown error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return getErrorMessage(error);
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

// ==================== DTOs ====================

class CloneDto {
  url: string;
  targetPath: string;
  branch?: string;
  depth?: number;
  username?: string;
  password?: string;
}

class CommitDto {
  message: string;
  files?: string[];
  all?: boolean;
  authorName?: string;
  authorEmail?: string;
}

class PushDto {
  remote?: string;
  branch?: string;
  force?: boolean;
  tags?: boolean;
  username?: string;
  password?: string;
}

class PullDto {
  remote?: string;
  branch?: string;
  rebase?: boolean;
  username?: string;
  password?: string;
}

class BranchDto {
  name: string;
  startPoint?: string;
  checkout?: boolean;
}

class MergeDto {
  branch: string;
  strategy?: 'ort' | 'recursive' | 'ours' | 'theirs';
  noFastForward?: boolean;
  squash?: boolean;
}

class RebaseDto {
  upstream: string;
  onto?: string;
}

class StashDto {
  message?: string;
  includeUntracked?: boolean;
}

class TagDto {
  name: string;
  message?: string;
  ref?: string;
}

class ResetDto {
  ref: string;
  mode?: 'soft' | 'mixed' | 'hard';
}

class RemoteDto {
  name: string;
  url: string;
}

class ConfigDto {
  key: string;
  value: string;
  global?: boolean;
}

// ==================== Controller ====================

@Controller('api/git')
export class GitController {
  private readonly logger = new Logger('GitController');

  constructor(private readonly gitService: GitService) {}

  // ==================== Repository Operations ====================

  @Post('init')
  @UseGuards(JwtAuthGuard)
  async initRepository(@Body() body: { path: string }) {
    try {
      return await this.gitService.initRepository(body.path);
    } catch (error) {
      this.logger.error(`Init failed: ${getErrorMessage(error)}`);
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post('clone')
  @UseGuards(JwtAuthGuard)
  async clone(@Body() dto: CloneDto) {
    try {
      return await this.gitService.clone({
        url: dto.url,
        targetPath: dto.targetPath,
        branch: dto.branch,
        depth: dto.depth,
        credentials: dto.username ? {
          username: dto.username,
          password: dto.password,
        } : undefined,
      });
    } catch (error) {
      this.logger.error(`Clone failed: ${getErrorMessage(error)}`);
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':repoPath/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.getStatus(decodedPath);
    } catch (error) {
      this.logger.error(`Status failed: ${getErrorMessage(error)}`);
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':repoPath/is-repo')
  async isGitRepository(@Param('repoPath') repoPath: string) {
    const decodedPath = decodeURIComponent(repoPath);
    const isRepo = await this.gitService.isGitRepository(decodedPath);
    return { isRepository: isRepo };
  }

  // ==================== Staging ====================

  @Post(':repoPath/stage')
  @UseGuards(JwtAuthGuard)
  async stageFiles(
    @Param('repoPath') repoPath: string,
    @Body() body: { files: string[] },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.stageFiles(decodedPath, body.files);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/stage-all')
  @UseGuards(JwtAuthGuard)
  async stageAll(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.stageAll(decodedPath);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/unstage')
  @UseGuards(JwtAuthGuard)
  async unstageFiles(
    @Param('repoPath') repoPath: string,
    @Body() body: { files: string[] },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.unstageFiles(decodedPath, body.files);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/discard')
  @UseGuards(JwtAuthGuard)
  async discardChanges(
    @Param('repoPath') repoPath: string,
    @Body() body: { files: string[] },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.discardChanges(decodedPath, body.files);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Commits ====================

  @Post(':repoPath/commit')
  @UseGuards(JwtAuthGuard)
  async commit(
    @Param('repoPath') repoPath: string,
    @Body() dto: CommitDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.commit({
        repoPath: decodedPath,
        message: dto.message,
        files: dto.files,
        all: dto.all,
        author: dto.authorName ? {
          name: dto.authorName,
          email: dto.authorEmail || '',
        } : undefined,
      });
    } catch (error) {
      this.logger.error(`Commit failed: ${getErrorMessage(error)}`);
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':repoPath/log')
  @UseGuards(JwtAuthGuard)
  async getLog(
    @Param('repoPath') repoPath: string,
    @Query('limit') limit?: string,
    @Query('branch') branch?: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.getLog(
        decodedPath,
        limit ? parseInt(limit) : 50,
        branch,
      );
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':repoPath/show/:ref')
  @UseGuards(JwtAuthGuard)
  async show(
    @Param('repoPath') repoPath: string,
    @Param('ref') ref: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.show(decodedPath, ref);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Branches ====================

  @Get(':repoPath/branches')
  @UseGuards(JwtAuthGuard)
  async getBranches(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.getBranches(decodedPath);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/branches')
  @UseGuards(JwtAuthGuard)
  async createBranch(
    @Param('repoPath') repoPath: string,
    @Body() dto: BranchDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.createBranch({
        repoPath: decodedPath,
        ...dto,
      });
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(
    @Param('repoPath') repoPath: string,
    @Body() body: { branch: string; create?: boolean },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.checkoutBranch(decodedPath, body.branch, body.create);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':repoPath/branches/:branch')
  @UseGuards(JwtAuthGuard)
  async deleteBranch(
    @Param('repoPath') repoPath: string,
    @Param('branch') branch: string,
    @Query('force') force?: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.deleteBranch(decodedPath, branch, force === 'true');
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':repoPath/branches/:oldName')
  @UseGuards(JwtAuthGuard)
  async renameBranch(
    @Param('repoPath') repoPath: string,
    @Param('oldName') oldName: string,
    @Body() body: { newName: string },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.renameBranch(decodedPath, oldName, body.newName);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Remotes ====================

  @Get(':repoPath/remotes')
  @UseGuards(JwtAuthGuard)
  async getRemotes(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.getRemotes(decodedPath);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/remotes')
  @UseGuards(JwtAuthGuard)
  async addRemote(
    @Param('repoPath') repoPath: string,
    @Body() dto: RemoteDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.addRemote(decodedPath, dto.name, dto.url);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':repoPath/remotes/:name')
  @UseGuards(JwtAuthGuard)
  async removeRemote(
    @Param('repoPath') repoPath: string,
    @Param('name') name: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.removeRemote(decodedPath, name);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/fetch')
  @UseGuards(JwtAuthGuard)
  async fetch(
    @Param('repoPath') repoPath: string,
    @Body() body: { remote?: string; username?: string; password?: string },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.fetch(
        decodedPath,
        body.remote,
        body.username ? { username: body.username, password: body.password } : undefined,
      );
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/pull')
  @UseGuards(JwtAuthGuard)
  async pull(
    @Param('repoPath') repoPath: string,
    @Body() dto: PullDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.pull({
        repoPath: decodedPath,
        remote: dto.remote,
        branch: dto.branch,
        rebase: dto.rebase,
        credentials: dto.username ? {
          username: dto.username,
          password: dto.password,
        } : undefined,
      });
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/push')
  @UseGuards(JwtAuthGuard)
  async push(
    @Param('repoPath') repoPath: string,
    @Body() dto: PushDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.push({
        repoPath: decodedPath,
        remote: dto.remote,
        branch: dto.branch,
        force: dto.force,
        tags: dto.tags,
        credentials: dto.username ? {
          username: dto.username,
          password: dto.password,
        } : undefined,
      });
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Merge & Rebase ====================

  @Post(':repoPath/merge')
  @UseGuards(JwtAuthGuard)
  async merge(
    @Param('repoPath') repoPath: string,
    @Body() dto: MergeDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.merge({
        repoPath: decodedPath,
        ...dto,
      });
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/merge/abort')
  @UseGuards(JwtAuthGuard)
  async abortMerge(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.abortMerge(decodedPath);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/rebase')
  @UseGuards(JwtAuthGuard)
  async rebase(
    @Param('repoPath') repoPath: string,
    @Body() dto: RebaseDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.rebase({
        repoPath: decodedPath,
        ...dto,
      });
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/rebase/abort')
  @UseGuards(JwtAuthGuard)
  async abortRebase(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.abortRebase(decodedPath);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/rebase/continue')
  @UseGuards(JwtAuthGuard)
  async continueRebase(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.continueRebase(decodedPath);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Stash ====================

  @Get(':repoPath/stashes')
  @UseGuards(JwtAuthGuard)
  async getStashes(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.getStashes(decodedPath);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/stash')
  @UseGuards(JwtAuthGuard)
  async stash(
    @Param('repoPath') repoPath: string,
    @Body() dto: StashDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.stash(decodedPath, dto.message, dto.includeUntracked);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/stash/:index/pop')
  @UseGuards(JwtAuthGuard)
  async stashPop(
    @Param('repoPath') repoPath: string,
    @Param('index') index: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.stashPop(decodedPath, parseInt(index));
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/stash/:index/apply')
  @UseGuards(JwtAuthGuard)
  async stashApply(
    @Param('repoPath') repoPath: string,
    @Param('index') index: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.stashApply(decodedPath, parseInt(index));
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':repoPath/stash/:index')
  @UseGuards(JwtAuthGuard)
  async stashDrop(
    @Param('repoPath') repoPath: string,
    @Param('index') index: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.stashDrop(decodedPath, parseInt(index));
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Diff ====================

  @Get(':repoPath/diff')
  @UseGuards(JwtAuthGuard)
  async getDiff(
    @Param('repoPath') repoPath: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('stat') stat?: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return { diff: await this.gitService.getDiff({
        repoPath: decodedPath,
        from,
        to,
        stat: stat === 'true',
      }) };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':repoPath/diff/staged')
  @UseGuards(JwtAuthGuard)
  async getStagedDiff(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return { diff: await this.gitService.getStagedDiff(decodedPath) };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':repoPath/diff/file')
  @UseGuards(JwtAuthGuard)
  async getFileDiff(
    @Param('repoPath') repoPath: string,
    @Query('path') filePath: string,
    @Query('staged') staged?: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return { diff: await this.gitService.getFileDiff(
        decodedPath,
        filePath,
        staged === 'true',
      ) };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Tags ====================

  @Get(':repoPath/tags')
  @UseGuards(JwtAuthGuard)
  async getTags(@Param('repoPath') repoPath: string) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.getTags(decodedPath);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/tags')
  @UseGuards(JwtAuthGuard)
  async createTag(
    @Param('repoPath') repoPath: string,
    @Body() dto: TagDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.createTag(decodedPath, dto.name, dto.message, dto.ref);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':repoPath/tags/:name')
  @UseGuards(JwtAuthGuard)
  async deleteTag(
    @Param('repoPath') repoPath: string,
    @Param('name') name: string,
    @Query('remote') remote?: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.deleteTag(decodedPath, name, remote);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Reset & Revert ====================

  @Post(':repoPath/reset')
  @UseGuards(JwtAuthGuard)
  async reset(
    @Param('repoPath') repoPath: string,
    @Body() dto: ResetDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.reset(decodedPath, dto.ref, dto.mode);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':repoPath/revert/:commit')
  @UseGuards(JwtAuthGuard)
  async revert(
    @Param('repoPath') repoPath: string,
    @Param('commit') commit: string,
    @Query('noCommit') noCommit?: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.revert(decodedPath, commit, noCommit === 'true');
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Cherry Pick ====================

  @Post(':repoPath/cherry-pick')
  @UseGuards(JwtAuthGuard)
  async cherryPick(
    @Param('repoPath') repoPath: string,
    @Body() body: { commits: string[]; noCommit?: boolean },
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.cherryPick(decodedPath, body.commits, body.noCommit);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Blame ====================

  @Get(':repoPath/blame')
  @UseGuards(JwtAuthGuard)
  async blame(
    @Param('repoPath') repoPath: string,
    @Query('file') filePath: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      return await this.gitService.blame(decodedPath, filePath);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== Config ====================

  @Get(':repoPath/config/:key')
  @UseGuards(JwtAuthGuard)
  async getConfig(
    @Param('repoPath') repoPath: string,
    @Param('key') key: string,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      const value = await this.gitService.getConfig(decodedPath, key);
      return { value };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':repoPath/config')
  @UseGuards(JwtAuthGuard)
  async setConfig(
    @Param('repoPath') repoPath: string,
    @Body() dto: ConfigDto,
  ) {
    try {
      const decodedPath = decodeURIComponent(repoPath);
      await this.gitService.setConfig(decodedPath, dto.key, dto.value, dto.global);
      return { success: true };
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }
}
