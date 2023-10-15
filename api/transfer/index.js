//@ts-check

import { getKeypairFromEnvironment } from '@solana-developers/node-helpers';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  clusterApiUrl,
} from '@solana/web3.js';

import multisig from '@sqds/multisig';

import BigNumber from 'bignumber.js';
import {
  fetchMultisigPda,
  fetchWalletAddress,
  sendSMS,
  updateMultisigPda,
  validateAddress,
  validatePhoneNumber,
} from '../_utils.js';

const squadsKeypair = await getKeypairFromEnvironment('SQUADS_WALLET');

const { Permission, Permissions } = multisig.types;

const { Multisig } = multisig.accounts;

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

  const tx = await executeTransfer(connection, multisigPda, recipientAddress, amount);

  const display = request.body.display;
  if (display === 'SMS') {
    const smsBody = `Transfer of ${amount} SOL to ${recipient} is complete. 

View this transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`;
    await sendSMS(phone, smsBody);
  }

  response.status(200).json({ tx });
}

async function executeTransfer(connection, multisigPda, recipientAddress, amount) {
  const [vaultPda] = multisig.getVaultPda({
    multisigPda,
    index: 0,
  });

  const instruction = SystemProgram.transfer({
    fromPubkey: vaultPda,
    toPubkey: new PublicKey(recipientAddress),
    lamports: Number(amount) * LAMPORTS_PER_SOL,
  });

  const transactionMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [instruction],
  });
}
