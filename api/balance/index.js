//@ts-check
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  const phone = request.query.phone;
  if (!phone) {
    response.status(400).send({ error: 'phone number is required' });
  }

  if (typeof phone !== 'string') {
    response.status(400).send({ error: 'phone number must be a string' });
  }

  const address = await fetchWalletAddress(phone);

  if (!address) {
    response.status(400).send({ error: 'no address found for phone number' });
  }

  // get associated wallet address for number
  const { tokens } = await fetchTokenAddresses(address);
  const filteredTokens = filterTokens(tokens);
  const mintAccounts = parseTokenMintAccounts(filteredTokens);
  const metadata = await fetchMetadata(mintAccounts);
  const tokenResponse = parseTokenResponse(filteredTokens, metadata);
  const smsBody = buildSMSBody(tokenResponse);

  // @ts-ignore
  await sendSMS(request.query.phone, smsBody);

  response.status(200).send({});
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
    `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${process.env.HELIUS_API_KEY}`,
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

/**
 * @param {string} phone
 */
async function sendSMS(phone, body) {
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await twilioClient.messages.create({
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: phone,
  });
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

async function fetchWalletAddress(phone) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  let { data: users, error } = await supabase.from('users').select('address').eq('phone', phone);

  return users[0]?.address;
}
