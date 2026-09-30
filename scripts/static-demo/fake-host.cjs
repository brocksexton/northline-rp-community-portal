// Preloaded into the demo server by scripts/static-demo/build.mjs (node --require) so the published
// snapshot shows made-up host metrics instead of the RAM, disk, CPU and uptime of the machine that
// built it. Only the values the site reads are replaced.
const os = require('node:os');
const fsPromises = require('node:fs/promises');

const GB = 1024 * 1024 * 1024;
const TOTAL_MEMORY = 32 * GB;
const started = Date.now();

os.totalmem = () => TOTAL_MEMORY;
os.freemem = () => TOTAL_MEMORY * (0.62 + 0.04 * Math.sin(Date.now() / 60000));
os.uptime = () => 6 * 24 * 3600 + Math.round((Date.now() - started) / 1000);

// Eight cores that are roughly 25-30% busy: the site samples these twice and compares.
os.cpus = () => {
  const elapsed = Date.now() * 10;
  const busyShare = 0.26 + 0.03 * Math.sin(Date.now() / 45000);
  return Array.from({ length: 8 }, () => ({
    model: 'Demo CPU',
    speed: 3600,
    times: { user: elapsed * busyShare * 0.8, nice: 0, sys: elapsed * busyShare * 0.2, idle: elapsed * (1 - busyShare), irq: 0 },
  }));
};

fsPromises.statfs = async () => ({ type: 0, bsize: 4096, blocks: (1024 * GB) / 4096, bfree: (612 * GB) / 4096, bavail: (612 * GB) / 4096, files: 0, ffree: 0 });
