import { describe, expect, it } from 'vitest';

import { DRIVE_PAGE, driveHosts, drivePath, isDriveHost } from './drive-site';

describe('the standalone drive site', () => {
  it('knows its own hosts, with or without a port, and extra ones from the environment', () => {
    expect(isDriveHost('colour-drive.vercel.app')).toBe(true);
    expect(isDriveHost('Colour-Drive.vercel.app:443')).toBe(true);
    expect(isDriveHost('colourbrain.vercel.app')).toBe(false);
    expect(isDriveHost(null)).toBe(false);
    const hosts = driveHosts(' drive.example.com , ');
    expect(isDriveHost('drive.example.com', hosts)).toBe(true);
  });

  it('sends every page to the game and lets files and the framework through', () => {
    expect(drivePath('/')).toBe(DRIVE_PAGE);
    expect(drivePath('/login')).toBe(DRIVE_PAGE);
    expect(drivePath('/api/coding/notes')).toBe(DRIVE_PAGE);
    expect(drivePath(DRIVE_PAGE)).toBeNull();
    expect(drivePath('/_next/static/chunks/a.js')).toBeNull();
    expect(drivePath('/icon.png')).toBeNull();
    expect(drivePath('/manifest.webmanifest')).toBeNull();
  });
});
