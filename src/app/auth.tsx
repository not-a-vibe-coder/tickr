import { createContext, useContext, useMemo, type ReactNode } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { connectorsForWallets, lightTheme, RainbowKitProvider, useConnectModal } from '@rainbow-me/rainbowkit'
import { coinbaseWallet, injectedWallet, metaMaskWallet, rabbyWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, useAccount, useDisconnect, useSignMessage, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { robinhoodTestnet } from '../../shared/chain'
import { robinhoodMainnet } from '../../shared/wif'

export type Auth = {
  ready: boolean
  authenticated: boolean
  address: string | null
  /** Name of the connected wallet (e.g. "MetaMask"). */
  label: string | null
  login: () => void
  logout: () => void
  /** Personal-sign a message with the player's wallet. No gas, no transaction: one signature prompt. */
  signMessage: (message: string) => Promise<`0x${string}`>
}

const Ctx = createContext<Auth | null>(null)
export const useAuth = () => {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth outside AuthProvider')
  return a
}

/**
 * WalletConnect Cloud / Reown project id. Needed for mobile wallets, including Robinhood Wallet,
 * which connects by scanning a WalletConnect QR code. Without it only browser-extension wallets are offered.
 */
const WC_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) || undefined

const connectors = connectorsForWallets(
  WC_PROJECT_ID
    ? [
        { groupName: 'Robinhood Wallet & mobile', wallets: [walletConnectWallet] },
        { groupName: 'Browser wallets', wallets: [metaMaskWallet, rabbyWallet, coinbaseWallet, injectedWallet] },
      ]
    : [{ groupName: 'Browser wallets', wallets: [rabbyWallet, coinbaseWallet, injectedWallet] }],
  { appName: 'Tickr', projectId: WC_PROJECT_ID ?? 'walletconnect-disabled' },
)

// The game runs on testnet and players only sign messages there (the server relays and pays gas).
// Mainnet is added for the $WIF loop: buying an extra clue is the one transaction a player sends.
const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, robinhoodMainnet],
  connectors,
  transports: { [robinhoodTestnet.id]: http(), [robinhoodMainnet.id]: http() },
})
const queryClient = new QueryClient()

const theme = lightTheme({ accentColor: '#201c15', accentColorForeground: '#e6e0cf', borderRadius: 'large', fontStack: 'system' })

/** Connect-wallet sign-in on Robinhood Chain (RainbowKit + wagmi). */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} initialChain={robinhoodTestnet} appInfo={{ appName: 'Tickr', learnMoreUrl: 'https://chain.robinhood.com' }}>
          <WalletBridge>{children}</WalletBridge>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function WalletBridge({ children }: { children: ReactNode }) {
  const { address, status, connector } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const value = useMemo<Auth>(
    () => ({
      ready: status !== 'reconnecting',
      authenticated: Boolean(address),
      address: address ?? null,
      label: connector?.name ?? null,
      login: () => openConnectModal?.(),
      logout: () => disconnect(),
      signMessage: (message) => signMessageAsync({ message }),
    }),
    [status, address, connector, openConnectModal, disconnect, signMessageAsync],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
