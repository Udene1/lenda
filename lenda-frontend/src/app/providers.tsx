"use client";

import React, { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

const config = createConfig(
    getDefaultConfig({
        // Your dApp's chains
        chains: [baseSepolia],
        transports: {
            [baseSepolia.id]: http(),
        },

        // Required API Keys
        walletConnectProjectId: "bf4945d8b76df49479b69b62648fb162", // Public placeholder or replace with user's

        // Required App Info
        appName: "Lenda Protocol",

        // Optional App Info
        appDescription: "DeFi Lending on Base",
        appUrl: "https://lenda.finance", // your app's url
        appIcon: "https://family.co/logo.png", // your app's icon
    }),
);

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ConnectKitProvider theme="midnight">
                    {children}
                </ConnectKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
