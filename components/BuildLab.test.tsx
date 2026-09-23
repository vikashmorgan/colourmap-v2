// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BuildLab from './BuildLab';

describe('BuildLab', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(),
      },
    });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(),
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/api/build-lab/availability')) {
          return new Response(
            JSON.stringify({
              agents: [
                { id: 'codex', name: 'Codex', available: true },
                { id: 'claude', name: 'Claude Code', available: false },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.includes('/api/build-lab/runner')) {
          return new Response(
            JSON.stringify({
              runner: {
                online: true,
                executionOwner: 'desktop-server',
                remoteRunReady: true,
                host: 'localhost:3000',
                machine: 'studio-pc',
                platform: 'win32',
                workingDirectory: 'C:/Users/victor/colourmap-v2',
              },
            }),
            { status: 200 },
          );
        }
        if (url.includes('/api/build-lab/queue') && url.includes('/queue/')) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return new Response(
            JSON.stringify({
              id: 'queued-1',
              title: body.title ?? 'Build a tiny local runner queue test.',
              channelId: 'phone-runner',
              agentId: 'codex',
              projectPath: 'C:/Users/victor/colourmap-v2',
              prompt: body.prompt ?? 'Build a tiny local runner queue test.',
              status: body.status ?? 'running',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              events: [],
            }),
            { status: 200 },
          );
        }
        if (url.includes('/api/build-lab/mission')) {
          return new Response(
            'data: {"type":"output","stream":"stdout","text":"done"}\n\ndata: {"type":"mission_complete","success":true}\n\n',
            { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
          );
        }
        if (url.includes('/api/build-lab/queue')) {
          const method = init?.method ?? 'GET';
          if (method === 'POST') {
            const body = init?.body ? JSON.parse(String(init.body)) : {};
            return new Response(
              JSON.stringify({
                id: 'queued-1',
                title: body.prompt ?? 'Build a tiny local runner queue test.',
                channelId: body.channelId ?? 'phone-runner',
                agentId: body.agentId ?? 'codex',
                projectPath: body.projectPath ?? 'C:/Users/victor/colourmap-v2',
                prompt: body.prompt ?? 'Build a tiny local runner queue test.',
                status: 'queued',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                events: [
                  {
                    id: 1,
                    type: 'queued',
                    text: 'Queued for desktop runner.',
                    createdAt: new Date().toISOString(),
                  },
                ],
              }),
              { status: 201 },
            );
          }
          return new Response(JSON.stringify({ missions: [] }), { status: 200 });
        }
        if (url.includes('/api/build-lab/project')) {
          return new Response(
            JSON.stringify({
              projectPath: 'C:/Users/victor/colourmap-v2',
              git: true,
              branch: 'feature/build-lab-agent-mission-control',
              changedFiles: ['components/BuildLab.tsx'],
            }),
            { status: 200 },
          );
        }
        if (url.includes('/api/build-lab/diff')) {
          return new Response(
            JSON.stringify({ diff: 'diff --git a/components/BuildLab.tsx', changedFiles: [] }),
            { status: 200 },
          );
        }
        return new Response('', { status: 404 });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  async function waitForBuildLabReady() {
    await waitFor(() => expect(screen.getByText('Mission prompt')).toBeDefined());
  }

  function openProjectSetup() {
    const setupButton = screen.getByRole('button', { name: /Project \+ agent/i });
    if (setupButton.textContent?.includes('setup')) {
      fireEvent.click(setupButton);
    }
  }

  it('loads agent availability in a simplified prompt workspace', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    expect(screen.getByText('Mission prompt')).toBeDefined();
    expect(screen.getByText('Mission memory')).toBeDefined();
    expect(screen.getByText('Channel')).toBeDefined();
    expect(screen.getByText(/Character visuals, arena/i)).toBeDefined();
    expect(screen.getAllByText('Phone Level 2').length).toBeGreaterThan(0);
    expect(screen.getByText('runner ready')).toBeDefined();
    expect(screen.getByText('Garden of Ideas')).toBeDefined();
    expect(screen.getByText('Mission Sun')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Speak with mission sun' })).toBeDefined();
    expect(screen.getByText('Display mode')).toBeDefined();
    expect(screen.getByText('Sun Dialogue visual prompt mode')).toBeDefined();
    expect(screen.getByText('Agent console')).toBeDefined();
    expect(screen.getByText('Current mission')).toBeDefined();
    expect(screen.getByText('Idle: No active mission')).toBeDefined();
    expect(screen.queryByText('Scope lens')).toBeNull();
    expect(screen.queryByText('Mission cards')).toBeNull();
    expect(screen.queryByText('Mode')).toBeNull();
  });

  it('shows the current mission first in a closable Agent console pill', async () => {
    const { container } = render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.change(
      screen.getByPlaceholderText('Tell the agent what to build, fix, review, or plan...'),
      {
        target: { value: 'Make the console mission visible at the top.' },
      },
    );

    expect(screen.getByText('Draft: Make the console mission visible at the top.')).toBeDefined();
    const consolePanel = container.querySelector('.build-lab-live-console');
    expect(consolePanel?.textContent?.indexOf('Current mission')).toBeLessThan(
      consolePanel?.textContent?.indexOf('Agent console') ?? Number.POSITIVE_INFINITY,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close current mission pill' }));
    expect(screen.queryByText('Draft: Make the console mission visible at the top.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open current mission pill' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse agent console output' }));
    expect(screen.getByRole('button', { name: 'Open current mission pill' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Open current mission pill' }));
    expect(screen.getByText('Draft: Make the console mission visible at the top.')).toBeDefined();
  });

  it('keeps the mission sun beside the desk while the prompt remains the only transcript box', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    openProjectSetup();
    fireEvent.change(screen.getByPlaceholderText('C:/Users/victor/colourmap-v2'), {
      target: { value: 'C:/Users/victor/colourmap-v2' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Tell the agent what to build, fix, review, or plan...'),
      {
        target: { value: 'Make the geometry sun glisten while I speak.' },
      },
    );

    expect(screen.getAllByText('Make the geometry sun glisten while I speak.').length).toBe(1);
    expect(screen.getByText('Mission Sun')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Orbit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Flare' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Scatter' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cell' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ripple' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Speak with mission sun' })).toBeDefined();
  });

  it('switches Build Lab work channels so mission memory is not one mixed chat', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.click(screen.getByRole('button', { name: /Channel/i }));
    const phoneChannelButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith('Phone Level 2'));
    expect(phoneChannelButton).toBeDefined();
    fireEvent.click(phoneChannelButton as HTMLButtonElement);

    expect(screen.getByText(/Phone Level 2 \/ Phone control surface/i)).toBeDefined();
    expect(localStorage.getItem('colourmap:build-lab-active-channel')).toBe('phone-runner');
  });

  it('queues a local Phone Level 2 mission for the runner inbox', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.click(screen.getByRole('button', { name: 'Open Runner inbox' }));
    fireEvent.click(screen.getByRole('button', { name: 'auto-run on' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'auto-run off' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Channel/i }));
    const phoneChannelButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith('Phone Level 2'));
    expect(phoneChannelButton).toBeDefined();
    fireEvent.click(phoneChannelButton as HTMLButtonElement);
    openProjectSetup();
    fireEvent.change(screen.getByPlaceholderText('C:/Users/victor/colourmap-v2'), {
      target: { value: 'C:/Users/victor/colourmap-v2' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Tell the agent what to build, fix, review, or plan...'),
      {
        target: { value: 'Build a tiny local runner queue test.' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add to queue' }));

    expect(screen.getByText('Runner inbox')).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText('Build a tiny local runner queue test.').length).toBeGreaterThan(
        0,
      ),
    );
    expect(screen.getAllByText('Build a tiny local runner queue test.').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByDisplayValue('Build a tiny local runner queue test.'), {
      target: { value: 'Edit the runner inbox queue item.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/build-lab/queue/queued-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Edit the runner inbox queue item.'),
        }),
      ),
    );
  });

  it('collapses the runner inbox into a compact reopen pill', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    expect(screen.getByRole('button', { name: 'Open Runner inbox' }).textContent).toContain(
      'Runner inbox',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Runner inbox' }));
    expect(screen.getByText(/Local Phone Level 2 queue/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close Runner inbox' }));

    expect(screen.queryByText(/Local Phone Level 2 queue/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Open Runner inbox' }).textContent).toContain(
      'Runner inbox',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Runner inbox' }));
    expect(screen.getByText(/Local Phone Level 2 queue/i)).toBeDefined();
  });

  it('copies the runner inbox as a numbered mission list', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.click(screen.getByRole('button', { name: 'Open Runner inbox' }));
    fireEvent.click(screen.getByRole('button', { name: 'auto-run on' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'auto-run off' })).toBeDefined());
    openProjectSetup();
    fireEvent.change(screen.getByPlaceholderText('C:/Users/victor/colourmap-v2'), {
      target: { value: 'C:/Users/victor/colourmap-v2' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Tell the agent what to build, fix, review, or plan...'),
      {
        target: { value: 'Make the runner inbox copyable.' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add to queue' }));

    await waitFor(() =>
      expect(screen.getAllByText(/Make the runner inbox copyable/i).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy list' }));

    await waitFor(() =>
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Make the runner inbox copyable.'),
      ),
    );
  });

  it('shows a mission queue overview with counts and the full cross-channel list', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/build-lab/queue') && !url.includes('/queue/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              missions: [
                {
                  id: 'queue-complete',
                  title: 'Completed queue item',
                  channelId: 'lab',
                  agentId: 'codex',
                  projectPath: 'C:/Users/victor/colourmap-v2',
                  prompt: 'Completed queue item',
                  status: 'complete',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  events: [
                    { id: 1, type: 'complete', text: 'Done.', createdAt: new Date().toISOString() },
                  ],
                },
                {
                  id: 'queue-failed',
                  title: 'Failed queue item',
                  channelId: 'phone-runner',
                  agentId: 'codex',
                  projectPath: 'C:/Users/victor/colourmap-v2',
                  prompt: 'Failed queue item',
                  status: 'failed',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  events: [],
                },
              ],
            }),
            { status: 200 },
          ),
        );
      }
      return defaultFetch?.(input, init) ?? Promise.resolve(new Response('', { status: 404 }));
    });

    render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.click(screen.getAllByRole('button', { name: /Mission queue/i })[0]);
    await waitFor(() => expect(screen.getByText('2 total / 0 ready / 0 running')).toBeDefined());
    expect(screen.getByText('Build Lab: 1')).toBeDefined();
    expect(screen.getByText('Phone Level 2: 1')).toBeDefined();

    expect(screen.getByText('Completed queue item')).toBeDefined();
    expect(screen.getByText('Failed queue item')).toBeDefined();
  });

  it('shows the prompt mission queue above memory and lets queued items be edited and dragged', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/build-lab/queue') && url.includes('/queue/')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const missionId = url.split('/').pop() ?? 'queue-a';
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: missionId,
              title: body.title ?? 'First queue item',
              channelId: 'dot-walker',
              agentId: 'codex',
              projectPath: 'C:/Users/victor/colourmap-v2',
              prompt: body.prompt ?? 'First queue item',
              status: 'failed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              events: [],
            }),
            { status: 200 },
          ),
        );
      }
      if (url.includes('/api/build-lab/queue') && !url.includes('/queue/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              missions: [
                {
                  id: 'queue-a',
                  title: 'First queue item',
                  channelId: 'dot-walker',
                  agentId: 'codex',
                  projectPath: 'C:/Users/victor/colourmap-v2',
                  prompt: 'First queue item',
                  status: 'failed',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  events: [],
                },
                {
                  id: 'queue-b',
                  title: 'Second queue item',
                  channelId: 'dot-walker',
                  agentId: 'codex',
                  projectPath: 'C:/Users/victor/colourmap-v2',
                  prompt: 'Second queue item',
                  status: 'failed',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  events: [],
                },
              ],
            }),
            { status: 200 },
          ),
        );
      }
      return defaultFetch?.(input, init) ?? Promise.resolve(new Response('', { status: 404 }));
    });

    const { container } = render(<BuildLab />);

    await waitFor(() => expect(screen.getByText('Mission memory')).toBeDefined());
    expect(container.textContent?.indexOf('Mission queue')).toBeLessThan(
      container.textContent?.indexOf('Mission memory') ?? Number.POSITIVE_INFINITY,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Mission queue/i }).at(-1) as Element);
    await waitFor(() =>
      expect(screen.getAllByText('1. First queue item').length).toBeGreaterThan(0),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'edit' })[0]);
    fireEvent.change(screen.getAllByDisplayValue('First queue item').at(-1) as Element, {
      target: { value: 'Replacement queue item' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/build-lab/queue/queue-a',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Replacement queue item'),
        }),
      ),
    );

    const dragStart = new Event('dragstart', { bubbles: true }) as DragEvent;
    Object.defineProperty(dragStart, 'dataTransfer', {
      value: {
        effectAllowed: '',
        getData: vi.fn(() => 'queue-b'),
        setData: vi.fn(),
      },
    });
    const drop = new Event('drop', { bubbles: true }) as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', {
      value: {
        getData: vi.fn(() => 'queue-b'),
      },
    });

    screen
      .getAllByText('2. Second queue item')
      .find((element) => element.closest('[draggable="true"]'))
      ?.closest('[draggable="true"]')
      ?.dispatchEvent(dragStart);
    screen
      .getAllByText('1. Replacement queue item')
      .find((element) => element.closest('[draggable="true"]'))
      ?.closest('[draggable="true"]')
      ?.dispatchEvent(drop);

    await waitFor(() =>
      expect(screen.getAllByText('1. Second queue item').length).toBeGreaterThan(0),
    );
  });

  it('keeps streaming console output inside the console and labels running follow-ups as queue work', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const defaultFetch = vi.mocked(fetch).getMockImplementation();
    vi.mocked(fetch).mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/build-lab/mission')) {
        return new Promise<Response>(() => undefined);
      }
      return defaultFetch?.(input, init) ?? Promise.resolve(new Response('', { status: 404 }));
    });

    render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.change(
      screen.getByPlaceholderText('Tell the agent what to build, fix, review, or plan...'),
      {
        target: { value: 'Keep the prompt steady while the console streams.' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send mission' }));

    await waitFor(() => expect(screen.getByText('Mission in process')).toBeDefined());
    expect(screen.getByText(/What you type, add from screenshots, or record now/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add follow-up to queue' })).toBeDefined();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('switches Garden of Ideas perspectives without replacing the spec map', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    fireEvent.click(screen.getByRole('button', { name: /Garden of Ideas/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Garden' }));
    expect(screen.getByRole('button', { name: 'Glimpse' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bubble Map' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Board' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Road' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Constellation' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Curriculum' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Change category' }));
    fireEvent.click(screen.getByRole('button', { name: /Education Atlas/i }));
    expect(screen.getAllByText('Wellbeing Curriculum Compass').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Curriculum' }));
    expect(screen.getAllByText('Notice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Connect').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Change category' }));
    const philosophyButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith('Philosophy'));
    expect(philosophyButton).toBeDefined();
    fireEvent.click(philosophyButton as HTMLButtonElement);
    expect(screen.getAllByText('The Question That Organizes Life').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Glimpse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Values And Action' }));
    expect(screen.getByText('Geometry bridge')).toBeDefined();
    expect(screen.getByRole('link', { name: /Open Dot Heart/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Curriculum' }));
    expect(screen.getAllByText('Wonder').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Practice').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Change category' }));
    fireEvent.click(screen.getByRole('button', { name: /Business Plan/i }));
    expect(screen.getAllByText('App Store Path').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Change category' }));
    const wellbeingButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.startsWith('WellbeingHow can inner clarity'));
    expect(wellbeingButton).toBeDefined();
    fireEvent.click(wellbeingButton as HTMLButtonElement);
    expect(screen.getAllByText('Collective Happiness').length).toBeGreaterThan(0);
  }, 45000);

  it('loads a project and stores it as a recent project', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    openProjectSetup();
    fireEvent.change(screen.getByPlaceholderText('C:/Users/victor/colourmap-v2'), {
      target: { value: 'C:/Users/victor/colourmap-v2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    await waitFor(() =>
      expect(screen.getByText('feature/build-lab-agent-mission-control')).toBeDefined(),
    );
    expect(localStorage.getItem('colourmap:build-lab-recent-projects')).toContain(
      'C:/Users/victor/colourmap-v2',
    );
  });

  it('keeps the Diff desk closable as a compact pill', async () => {
    render(<BuildLab />);

    await waitForBuildLabReady();
    expect(screen.getByRole('button', { name: 'Open Diff desk' })).toBeDefined();
    expect(screen.queryByText('No diff loaded.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open Diff desk' }));
    expect(screen.getByRole('button', { name: 'Close Diff desk' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDefined();
    expect(screen.getByText('No diff loaded.')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close Diff desk' }));
    expect(screen.getByRole('button', { name: 'Open Diff desk' })).toBeDefined();
    expect(screen.queryByText('No diff loaded.')).toBeNull();
  });
});
