// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listMixes: vi.fn(),
  listRecordings: vi.fn(),
  saveMix: vi.fn(),
  updateMix: vi.fn(),
  deleteMix: vi.fn(),
  deleteRecording: vi.fn(),
}));

vi.mock('@/lib/chill/account-api', () => api);

import { ChillAccountProvider } from './ChillAccountContext';
import ChillSavedPanel from './ChillSavedPanel';

const MIX = { id: 'm1', title: 'Night drive', settings: { palette: 'night' } };
const REC = {
  id: 'r1',
  title: 'Take one',
  mimeType: 'audio/mp4',
  url: 'https://signed/r1',
};

function renderPanel(signedIn = true) {
  const getSettings = vi.fn(() => ({ palette: 'warm' }));
  const onLoadMix = vi.fn();
  render(
    <ChillAccountProvider user={signedIn ? { id: 'u1', email: 'a@b.co' } : null}>
      <ChillSavedPanel getSettings={getSettings} onLoadMix={onLoadMix} />
    </ChillAccountProvider>,
  );
  return { getSettings, onLoadMix };
}

describe('ChillSavedPanel', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    api.listMixes.mockResolvedValue([MIX]);
    api.listRecordings.mockResolvedValue([REC]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows guests one quiet sign-in line and loads nothing', () => {
    renderPanel(false);
    expect(screen.getByText('Sign in with email').getAttribute('href')).toBe('/chill/login');
    expect(screen.getByText(/to keep your mixes and recordings/)).toBeDefined();
    expect(api.listMixes).not.toHaveBeenCalled();
  });

  it('lists saved mixes and recordings', async () => {
    renderPanel();
    expect(await screen.findByText('Night drive')).toBeDefined();
    expect(screen.getByText('Take one')).toBeDefined();
    const download = screen.getByText('Download');
    expect(download.getAttribute('href')).toBe('https://signed/r1');
    expect(download.getAttribute('download')).toBe('Take-one.m4a');
    expect(document.querySelector('audio')?.getAttribute('src')).toBe('https://signed/r1');
  });

  it('shows empty states', async () => {
    api.listMixes.mockResolvedValue([]);
    api.listRecordings.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText('No saved mixes yet.')).toBeDefined();
    expect(screen.getByText('No saved recordings yet.')).toBeDefined();
  });

  it('saves the current settings under the typed name', async () => {
    api.saveMix.mockResolvedValue({ id: 'm2', title: 'Sunrise', settings: {} });
    const { getSettings } = renderPanel();
    await screen.findByText('Night drive');

    fireEvent.change(screen.getByLabelText('Mix name'), { target: { value: 'Sunrise' } });
    fireEvent.click(screen.getByText('Save current'));

    await screen.findByText('Sunrise');
    expect(getSettings).toHaveBeenCalled();
    expect(api.saveMix).toHaveBeenCalledWith('Sunrise', { palette: 'warm' });
  });

  it('loads a mix into the machine', async () => {
    const { onLoadMix } = renderPanel();
    await screen.findByText('Night drive');
    fireEvent.click(screen.getByText('Load'));
    expect(onLoadMix).toHaveBeenCalledWith({ palette: 'night' });
  });

  it('renames a mix', async () => {
    api.updateMix.mockResolvedValue({ ...MIX, title: 'Late drive' });
    renderPanel();
    await screen.findByText('Night drive');

    fireEvent.click(screen.getByText('Rename'));
    fireEvent.change(screen.getByLabelText('New name'), { target: { value: 'Late drive' } });
    fireEvent.click(screen.getByText('Done'));

    await screen.findByText('Late drive');
    expect(api.updateMix).toHaveBeenCalledWith('m1', { title: 'Late drive' });
  });

  it('deletes a mix and a recording', async () => {
    api.deleteMix.mockResolvedValue(undefined);
    api.deleteRecording.mockResolvedValue(undefined);
    renderPanel();
    await screen.findByText('Night drive');

    fireEvent.click(screen.getByLabelText('Delete Night drive'));
    fireEvent.click(screen.getByLabelText('Delete Take one'));

    await waitFor(() => {
      expect(screen.queryByText('Night drive')).toBeNull();
      expect(screen.queryByText('Take one')).toBeNull();
    });
    expect(api.deleteMix).toHaveBeenCalledWith('m1');
    expect(api.deleteRecording).toHaveBeenCalledWith('r1');
  });

  it('shows errors from the API', async () => {
    api.listMixes.mockRejectedValue(new Error('Unauthorized'));
    renderPanel();
    expect((await screen.findByRole('alert')).textContent).toBe('Unauthorized');
  });
});
