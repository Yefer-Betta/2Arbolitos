import { describe, expect, it } from 'vitest';

import {
  buildLauncher,
  EXTRA_FILES,
  MODE_LABELS,
  MSI_NAME,
  productWxs,
  resolveWixDirectory,
} from '../scripts/pack-msi.js';

describe('instalador MSI de Windows', () => {
  it('incluye los archivos que habilitan ambos modos', () => {
    expect(EXTRA_FILES).toContain('docker-compose.yml');
    expect(EXTRA_FILES).toContain('Dockerfile.frontend');
    expect(EXTRA_FILES).toContain('server/Dockerfile');
    expect(EXTRA_FILES).toContain('scripts/setup/SetupOps.ps1');
    expect(EXTRA_FILES).toContain('scripts/docker/16-backend-resolver.envsh');
  });

  it('el lanzador ofrece portable y Docker/Kiri', () => {
    const bat = buildLauncher();

    expect(bat).toContain(MODE_LABELS.portable);
    expect(bat).toContain(MODE_LABELS.dockerInstall);
    expect(bat).toContain(MODE_LABELS.dockerDaily);
    expect(bat).toContain('start.bat');
    expect(bat).toContain('instalar.bat');
    expect(bat).toContain('iniciar.ps1');
    expect(bat).toContain('Panel.bat');
  });

  it('instala por usuario y referencia los archivos del paquete', () => {
    const xml = productWxs({ version: '1.1.6' });

    expect(xml).toContain('LocalAppDataFolder');
    expect(xml).toContain('ComponentGroupRef Id="POSFiles"');
    expect(xml).toContain('2Arbolitos POS');
    expect(xml).toContain('MajorUpgrade');
  });

  it('nombra el MSI con la version del proyecto', () => {
    expect(MSI_NAME).toMatch(/^2Arbolitos-Windows-x64-\d+\.\d+\.\d+\.msi$/);
  });

  it('ignora un WIX del entorno que no contiene los ejecutables de WiX 3', () => {
    const exists = (file) => file.endsWith('heat.exe');

    expect(
      resolveWixDirectory('C:\\Program Files (x86)\\WiX Toolset v3.14', exists)
    ).toBe('');
  });

  it('usa un WIX del entorno cuando los tres ejecutables estan presentes', () => {
    const exists = () => true;

    expect(resolveWixDirectory('C:\\wix-local', exists)).toBe('C:\\wix-local');
  });
});
