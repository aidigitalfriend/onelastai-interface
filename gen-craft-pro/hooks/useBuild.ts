/**
 * useBuild — Build pipeline hook
 * Wraps buildStore with convenient methods
 */
import { useCallback } from 'react';
import { useBuildStore } from '../stores/buildStore';

export function useBuild() {
  const store = useBuildStore();

  const triggerBuild = useCallback(async (projectId: string) => {
    const buildId = store.startBuild(projectId, 'manual');

    // Simulate build pipeline steps
    const steps = ['install', 'lint', 'build', 'optimize'];
    for (const stepId of steps) {
      store.updateBuildStep(buildId, stepId, { status: 'running', startedAt: Date.now() });
      store.addBuildLog(`▶ Starting ${stepId}...`);
      store.updateBuildStatus(buildId, 'building');

      // In real implementation, this would call the build API
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

      store.updateBuildStep(buildId, stepId, {
        status: 'success',
        completedAt: Date.now(),
        logs: [`✓ ${stepId} completed`],
      });
      store.addBuildLog(`✓ ${stepId} completed`);
    }

    store.completeBuild(buildId);
    store.addBuildLog('🎉 Build successful!');
    return buildId;
  }, [store]);

  return {
    builds: store.builds,
    currentBuild: store.currentBuild,
    isBuilding: store.isBuilding,
    buildLogs: store.buildLogs,
    buildConfig: store.buildConfig,
    lastSuccessfulBuild: store.lastSuccessfulBuild,
    autoRebuild: store.autoRebuild,
    triggerBuild,
    cancelBuild: store.cancelBuild,
    setBuildConfig: store.setBuildConfig,
    setAutoRebuild: store.setAutoRebuild,
    clearBuilds: store.clearBuilds,
    clearBuildLogs: store.clearBuildLogs,
  };
}
