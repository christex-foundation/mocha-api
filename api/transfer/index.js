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
  const connection = new Connection(clusterApiUrl('devnet'));
}
