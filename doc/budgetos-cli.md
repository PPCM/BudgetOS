# BudgetOS CLI - Server Management Script

The `budgetos.sh` script provides a simple command-line interface to manage the BudgetOS server process.

## Location

```
./budgetos.sh
```

The script must be run from the project root or using its absolute path. It automatically resolves paths relative to its own location.

## Prerequisites

- Node.js >= 18
- Dependencies installed (`npm install`)
- Frontend built (`npm run build --prefix client`) for serving the UI

## Commands

### start

Start the server in the background.

```bash
./budgetos.sh start
```

The server process runs detached. Its PID is stored in `data/budgetos.pid` and output is redirected to `data/budgetos.log`. If the server is already running, the command does nothing.

### stop

Stop the server gracefully.

```bash
./budgetos.sh stop
```

Sends `SIGTERM` to the server process and waits up to 10 seconds for a clean shutdown. If the process doesn't exit in time, it is forcefully killed with `SIGKILL`.

### restart

Stop and start the server.

```bash
./budgetos.sh restart
```

### status

Display whether the server is running and its PID.

```bash
./budgetos.sh status
```

### logs

Show the last lines from the server log file.

```bash
./budgetos.sh logs        # last 50 lines (default)
./budgetos.sh logs 100    # last 100 lines
```

### logs:follow

Follow the log file in real-time (equivalent to `tail -f`). Press `Ctrl+C` to stop.

```bash
./budgetos.sh logs:follow
```

### reset

Reset the SQLite database, restart the server, and re-seed demo data.

```bash
./budgetos.sh reset
```

This command:
1. Stops the server if running
2. Deletes the SQLite database file
3. Starts the server (migrations run automatically)
4. Runs the seed script to populate demo data

> **Note**: This command only works with SQLite (`DB_TYPE=sqlite`). For PostgreSQL or MySQL, drop the database manually.

### build

Build the frontend and optionally restart the server.

```bash
./budgetos.sh build
```

Runs `npm run build` in the `client/` directory. If the server is running, it is automatically restarted to serve the new build.

### help

Display available commands.

```bash
./budgetos.sh help
```

## Environment Variables

The script reads the `.env` file for the `PORT` variable (default: `3000`). Other environment variables can be passed as a prefix:

```bash
DB_TYPE=sqlite ./budgetos.sh start
DB_TYPE=sqlite ./budgetos.sh reset
```

## Files

| File | Description |
|------|-------------|
| `data/budgetos.pid` | PID of the running server process |
| `data/budgetos.log` | Server output log (stdout + stderr) |

## Examples

```bash
# Start server with SQLite
DB_TYPE=sqlite ./budgetos.sh start

# Check if running
./budgetos.sh status

# View recent logs
./budgetos.sh logs 20

# Full reset (delete DB, restart, seed)
DB_TYPE=sqlite ./budgetos.sh reset

# Rebuild frontend after code changes
./budgetos.sh build

# Stop server
./budgetos.sh stop
```
