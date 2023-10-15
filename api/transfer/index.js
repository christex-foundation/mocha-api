//@ts-check
import { getKeypairFromEnvironment } from '@solana-developers/node-helpers';
import { Connection, PublicKey } from '@solana/web3.js';

import {
  executeTransfer,
  fetchMultisigPda,
  fetchWalletAddress,
  sendSMS,
  validateAddress,
  validatePhoneNumber,
} from '../_utils.js';

const squadsKeypair = await getKeypairFromEnvironment('SQUADS_WALLET');

/**
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  const connection = new Connection(`${process.env.HELIUS_API_URL}`);

  const { phone, recipient, amount } = request.body;

  if (!phone || !recipient || !amount) {
    response.status(400).send({ error: 'phone, recipient, and amount are required' });
  }

  validatePhoneNumber(phone, response);

  const recipientAddress = await fetchWalletAddress(recipient);
  validateAddress(recipientAddress, response);

  const multisigPda = new PublicKey(await fetchMultisigPda(phone));
  if (!multisigPda) {
    response.status(400).send({
      error:
        'no multisig pda found for phone number, you need to register before attepmting a transfer',
    });
  }

  const tx = await executeTransfer(
    connection,
    multisigPda,
    recipientAddress,
    amount,
    squadsKeypair,
  );

  const display = request.body.display;
  if (display === 'SMS') {
    const smsBody = `Transfer of ${amount} SOL to ${recipient} is complete. 

View this transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`;
    await sendSMS(phone, smsBody);
  }

  response.status(200).json({ tx });
}
