import { ImageResponse } from 'next/og';

import { BRANCH_HUE, BRANCHES } from '@/lib/branches';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/*
 * THE ICON IS THE MODEL, NOT A LOGO.
 *
 * Three marks around a still centre — the same shape `lib/branches.ts`
 * describes and `components/LatticeTree.tsx` draws, at the smallest size it
 * survives. The hues are imported rather than retyped, so renaming a branch
 * colour changes the icon too and the two can never drift.
 *
 * No lettering. At 60px on a home screen a word is a smudge, and three
 * coloured marks around a middle are recognisable in a way a smudge is not.
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
        background: '#f0dfb6',
      }}
    >
      {BRANCHES.map((branch) => (
        <div
          key={branch}
          style={{
            width: 37,
            height: 37,
            borderRadius: 999,
            background: BRANCH_HUE[branch],
          }}
        />
      ))}
    </div>,
    size,
  );
}
