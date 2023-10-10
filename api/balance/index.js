//@ts-check

import * as dotenv from 'dotenv';
dotenv.config();

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  // make request to addresses endpoint
  const { tokens } = await fetchTokenAddresses();
  // with response get all the mint accounts
  const mintAccounts = tokens.map((token) => token.mint);
  // make request to metadata endpoint
  const metadata = await fetchMetadata(mintAccounts);
  // merge both responses and send
  const tokenResponse = tokens
    .map((token) => {
      return {
        ...token,
        tokenMetadata: metadata.find((meta) => {
          return meta.account == token.mint;
        }),
      };
    })
    .map((token) => {
      return {
        tokenName: token.tokenMetadata.onChainMetadata.metadata.data?.name,
        tokenSymbol: token.tokenMetadata.onChainMetadata.metadata.data?.symbol,
        tokenAmount: token.amount,
        tokenDecimals: token.decimals,
      };
    });

  response.status(200).json(tokenResponse);
}

/**
 * @returns {Promise<{tokens: {
  tokenAccount: string
  mint: string
  amount: number
  decimals: number
}[]}>}
 */
async function fetchTokenAddresses() {
  const response = await fetch(
    `https://api.helius.xyz/v0/addresses/3AqsxnVmsH3TyoeRFxMSDvDmHTsySoLnYtVAWMk7RYff/balances?api-key=${process.env.HELIUS_API_KEY}`,
    { method: 'GET' },
  );

  return await response.json();
}

async function fetchMetadata(mintAccounts) {
  const response = await fetch(
    `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mintAccounts,
        includeOffChain: true,
        disableCache: false,
      }),
    },
  );

  return await response.json();
}
