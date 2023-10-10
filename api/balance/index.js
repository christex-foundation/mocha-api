//@ts-check
import * as dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  // get associated wallet address for number
  const { tokens } = await fetchTokenAddresses();
  const mintAccounts = getTokenMintAccounts(tokens);
  const metadata = await fetchMetadata(mintAccounts);
  const tokenResponse = buildTokenResponse(tokens, metadata);
  const smsBody = buildSMSBody(tokenResponse);

  await sendSMS(request.query.phone || '+23276242792', smsBody);

  response.status(200).send({});
}

function getTokenMintAccounts(tokens) {
  return tokens.map((token) => token.mint);
}

function buildSMSBody(tokenResponse) {
  return tokenResponse
    .map((token) => `${token.symbol}: ${token.amount / 10 ** token.decimals}`)
    .join('\n');
}

function buildTokenResponse(tokens, metadata) {
  return tokens.map((token) => {
    const tokenMetadata = metadata.find((meta) => meta.account == token.mint);

    return {
      ...token,
      name: tokenMetadata.onChainMetadata.metadata.data?.name,
      symbol: tokenMetadata.onChainMetadata.metadata.data?.symbol,
    };
  });
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

/**
 * @param {*} phone
 */
async function sendSMS(phone, body) {
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await twilioClient.messages.create({
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: phone,
  });
}
