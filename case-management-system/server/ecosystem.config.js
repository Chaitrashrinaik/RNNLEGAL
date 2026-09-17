module.exports = {
  apps: [
    {
      name: 'casebench',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};