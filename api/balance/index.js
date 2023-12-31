import * as dotenv from 'dotenv';
import { fetchWalletAddress, sendSMS, validateAddress, validatePhoneNumber } from '../_utils.js';

dotenv.config();

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  const display = request.query.display;

  const phone = request.query.phone.replace(/\D/g, '');
  validatePhoneNumber(phone, response);

  const address = await fetchWalletAddress(phone);
  validateAddress(address, response);

  const { tokens, nativeBalance } = await fetchTokenAddresses(address);
  const filteredTokens = filterTokens(tokens);
  const mintAccounts = parseTokenMintAccounts(filteredTokens);
  const metadata = await fetchMetadata(mintAccounts);
  const tokenResponse = addNativeBalance(
    parseTokenResponse(filteredTokens, metadata),
    nativeBalance,
  );

  if (display === 'SMS') {
    const smsBody = buildSMSBody(tokenResponse);
    await sendSMS(request.query.phone, smsBody);
  }

  response.status(200).send({ tokens: tokenResponse });
}

function addNativeBalance(tokenResponse, nativeBalance) {
  tokenResponse = [...tokenResponse, { symbol: 'SOL', amount: nativeBalance, decimals: 9 }];
  return tokenResponse;
}

/**
 * @description filter out tokens with 0 decimals and 0 amount
 */
function filterTokens(tokens) {
  return tokens.filter((token) => token.decimals !== 0 && token.amount > 0);
}

/**
 * @typedef {{tokens: {
        tokenAccount: string;
        mint: string;
        amount: number;
        decimals: number;
    }[];}} heliusBalanceResponse
 */

/**
 * @returns {Promise<heliusBalanceResponse>}
 */
async function fetchTokenAddresses(address) {
  const response = await fetch(
    `${process.env.HELIUS_API_URL}/v0/addresses/${address}/balances?api-key=${process.env.HELIUS_API_KEY}`,
    { method: 'GET' },
  );

  return await response.json();
}

/**
 * @param {string[]} mintAccounts
 * @returns {Promise<any>}
 */
async function fetchMetadata(mintAccounts) {
  const response = await fetch(
    `${process.env.HELIUS_API_URL}/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`,
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

function parseTokenMintAccounts(tokens) {
  return tokens.map((token) => token.mint);
}

function buildSMSBody(tokenResponse) {
  const body = tokenResponse
    .map((token) => `${token.symbol}: ${token.amount / 10 ** token.decimals}`)
    .join('\n');

  return `Your current balance is:\n\n${body}`;
}

function parseTokenResponse(tokens, metadata) {
  return tokens
    .map((token) => {
      const tokenMetadata = metadata.find((meta) => meta.account == token.mint);

      return {
        ...token,
        name: tokenMetadata?.onChainMetadata?.metadata?.data?.name,
        symbol: tokenMetadata?.onChainMetadata?.metadata?.data?.symbol,
      };
    })
    .filter((token) => token.name);
}
