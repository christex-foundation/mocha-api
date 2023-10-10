//@ts-check
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  const { tokens } = await fetchTokenAddresses();
  const mintAccounts = tokens.map((token) => token.mint);

  const metadata = await fetchMetadata(mintAccounts);

  const tokenResponse = tokens.map((token) => {
    const tokenMetadata = metadata.find((meta) => meta.account == token.mint);

    return {
      ...token,
      name: tokenMetadata.onChainMetadata.metadata.data?.name,
      symbol: tokenMetadata.onChainMetadata.metadata.data?.symbol,
    };
  });

  // send SMS
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
