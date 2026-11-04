import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Antes de cada corrida deja la base con los datos conocidos de la semilla,
// así las pruebas pasan igual la primera vez y todas las siguientes.
export default function semilla() {
  const server = path.resolve(__dirname, '..', '..', 'server');
  const pythonDelVenv =
    process.platform === 'win32'
      ? path.join(server, 'venv', 'Scripts', 'python.exe')
      : path.join(server, 'venv', 'bin', 'python');
  const python = existsSync(pythonDelVenv) ? pythonDelVenv : 'python';
  execFileSync(python, ['scripts/seed_pruebas.py'], { cwd: server, stdio: 'inherit' });
}
