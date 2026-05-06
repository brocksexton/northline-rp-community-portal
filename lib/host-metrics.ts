import os from 'node:os';

type CpuSnapshot = { idle: number; total: number };

export type OperationalMetrics = {
  checkedAt: string;
  cpuPercent: number | null;
  ram: {
    usedMb: number;
    totalMb: number;
    percent: number;
  };
  webProcess: {
    rssMb: number;
    heapUsedMb: number;
    uptimeSeconds: number;
  };
  hostUptimeSeconds: number;
};

function cpuSnapshot(): CpuSnapshot {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
  }

  return { idle, total };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sampleCpuPercent(intervalMs = 140): Promise<number | null> {
  try {
    const start = cpuSnapshot();
    await wait(intervalMs);
    const end = cpuSnapshot();
    const idleDelta = end.idle - start.idle;
    const totalDelta = end.total - start.total;
    if (totalDelta <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
  } catch {
    return null;
  }
}

function mb(bytes: number) {
  return Math.max(0, Math.round(bytes / 1024 / 1024));
}

export async function getOperationalMetrics(): Promise<OperationalMetrics> {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = Math.max(0, totalMemory - freeMemory);
  const processMemory = process.memoryUsage();
  const cpuPercent = await sampleCpuPercent();

  return {
    checkedAt: new Date().toISOString(),
    cpuPercent,
    ram: {
      usedMb: mb(usedMemory),
      totalMb: mb(totalMemory),
      percent: totalMemory > 0 ? Math.max(0, Math.min(100, Math.round((usedMemory / totalMemory) * 100))) : 0,
    },
    webProcess: {
      rssMb: mb(processMemory.rss),
      heapUsedMb: mb(processMemory.heapUsed),
      uptimeSeconds: Math.round(process.uptime()),
    },
    hostUptimeSeconds: Math.round(os.uptime()),
  };
}
