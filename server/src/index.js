const app = require('./app');
const config = require('./config');
const { recoverInterruptedRuns } = require('./services/agent/orchestrator');

// 服务重启兑底：将 running 的 agent_runs 置为 failed
recoverInterruptedRuns().catch((e) => console.error('recoverInterruptedRuns failed:', e.message));

const server = app.listen(config.port, () => {
  console.log(`bid-demo-server listening on http://localhost:${config.port}`);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
