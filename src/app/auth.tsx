import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PrivyProvider, usePrivy } from '@privy-io/react-auth'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { robinhoodTestnet } from '../../shared/chain'

export type Auth = {
  ready: boolean
  kind: 'privy' | 'guest'
  authenticated: boolean
  address: string | null
  label: string | null
  login: () => void
  logout: () => void
}

const Ctx = createContext<Auth | null>(null)
export const useAuth = () => {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth outside AuthProvider')
  return a
}

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string | undefined

/** Email sign-in with an embedded wallet via Privy. Falls back to a browser-local guest wallet when no app id is set. */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (PRIVY_APP_ID) {
    return (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ['email'],
          appearance: { theme: 'dark', accentColor: '#B8F36B', logo: '/favicon.svg', landingHeader: 'Sign in to Tickr', loginMessage: 'Your streak lives on Robinhood Chain testnet.' },
          embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
          defaultChain: robinhoodTestnet,
          supportedChains: [robinhoodTestnet],
        }}
      >
        <PrivyBridge>{children}</PrivyBridge>
      </PrivyProvider>
    )
  }
  return <GuestAuth>{children}</GuestAuth>
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const address = user?.wallet?.address ?? null
  const value = useMemo<Auth>(
    () => ({ ready, kind: 'privy', authenticated: authenticated && Boolean(address), address, label: user?.email?.address ?? null, login, logout: () => void logout() }),
    [ready, authenticated, address, user, login, logout],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

const GUEST_KEY = 'tickr.guestKey'
function GuestAuth({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  useEffect(() => {
    try {
      const k = localStorage.getItem(GUEST_KEY) as `0x${string}` | null
      if (k) setAddress(privateKeyToAccount(k).address)
    } catch {
      /* storage unavailable */
    }
  }, [])
  const value = useMemo<Auth>(
    () => ({
      ready: true,
      kind: 'guest',
      authenticated: Boolean(address),
      address,
      label: address ? 'Guest wallet (this browser)' : null,
      login: () => {
        const k = generatePrivateKey()
        try {
          localStorage.setItem(GUEST_KEY, k)
        } catch {
          /* ignore */
        }
        setAddress(privateKeyToAccount(k).address)
      },
      logout: () => {
        try {
          localStorage.removeItem(GUEST_KEY)
        } catch {
          /* ignore */
        }
        setAddress(null)
      },
    }),
    [address],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
