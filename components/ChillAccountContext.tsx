'use client';

import { createContext, type ReactNode, useContext } from 'react';

/*
 * Who is using the public Chill Machine: a signed-in email account, or a guest
 * (user = null). Provided by ChillPublicApp; read with useChillAccount().
 */
export type ChillUser = { id: string; email: string };
export type ChillAccount = { user: ChillUser | null };

export const ChillAccountContext = createContext<ChillAccount>({ user: null });

export function ChillAccountProvider({
  user,
  children,
}: {
  user: ChillUser | null;
  children: ReactNode;
}) {
  return <ChillAccountContext.Provider value={{ user }}>{children}</ChillAccountContext.Provider>;
}

export function useChillAccount(): ChillAccount {
  return useContext(ChillAccountContext);
}
