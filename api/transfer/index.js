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

import * as multisig from '@sqds/multisig';

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

  const phone = request.query.phone.replace(/\D/g, '');
  validatePhoneNumber(phone, response);

  const sender = new PublicKey(await fetchWalletAddress(phone));
  validateAddress(sender, response);

  let multisigPda = new PublicKey(await fetchMultisigPda(phone));

  const recipient = new PublicKey(request.query.recipient);
  const amount = new BigNumber(request.query.amount);
  const splToken = request.query.splToken ? new PublicKey(request.query.splToken) : '';

  if (multisigPda) {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda,
      index: 0,
    });

    const instruction = SystemProgram.transfer({
      fromPubkey: vaultPda,
      toPubkey: squadsKeypair.publicKey,
      lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    const transferMessage = new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [instruction],
    });

    const multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);
    const lastTransactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex);

    const transactionIndex = lastTransactionIndex + 1n;
    const signature1 = await multisig.rpc.vaultTransactionCreate({
      connection,
      feePayer: squadsKeypair,
      multisigPda,
      transactionIndex,
      creator: squadsKeypair.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: transferMessage,
      memo: 'Transfer 0.01 SOL to creator',
    });

    const signature2 = await multisig.rpc.proposalCreate({
      connection,
      feePayer: squadsKeypair,
      multisigPda,
      transactionIndex,
      creator: squadsKeypair,
    });

    const approvalSig = await multisig.rpc.proposalApprove({
      connection,
      feePayer: squadsKeypair,
      multisigPda,
      transactionIndex,
      member: squadsKeypair,
    });

    const vaultTransactionExecuteSignature = await multisig.rpc.vaultTransactionExecute({
      connection,
      feePayer: squadsKeypair,
      multisigPda,
      transactionIndex,
      member: squadsKeypair.publicKey,
      signers: [squadsKeypair],
    });

    // send sms

    return;
  }

  const createKey = Keypair.generate();
  // Derive the multisig account PDA
  const [newMultisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  // save multisigPda to db
  updateMultisigPda(phone, newMultisigPda);

  const signature = await multisig.rpc.multisigCreate({
    connection,
    // One time random Key
    createKey,
    creator: squadsKeypair,
    multisigPda,
    configAuthority: squadsKeypair.publicKey,
    timeLock: 0,
    members: [
      {
        key: squadsKeypair.publicKey,
        permissions: Permissions.all(),
      },
      {
        key: new PublicKey(sender),
        permissions: Permissions.all(),
      },
    ],
    // This means that there needs to be 2 votes for a transaction proposal to be approved
    threshold: 1,
  });

  const [vaultPda, vaultBump] = multisig.getVaultPda({
    multisigPda,
    index: 0,
  });

  const instruction = SystemProgram.transfer({
    fromPubkey: vaultPda,
    toPubkey: squadsKeypair.publicKey,
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });

  const transferMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [instruction],
  });

  const transactionIndex = 1n;
  const signature1 = await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer: squadsKeypair,
    multisigPda,
    transactionIndex,
    creator: squadsKeypair.publicKey,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage: transferMessage,
    memo: 'Transfer 0.1 SOL to creator',
  });

  const signature2 = await multisig.rpc.proposalCreate({
    connection,
    feePayer: squadsKeypair,
    multisigPda,
    transactionIndex,
    creator: squadsKeypair,
  });

  const approvalSig = await multisig.rpc.proposalApprove({
    connection,
    feePayer: squadsKeypair,
    multisigPda,
    transactionIndex,
    member: squadsKeypair,
  });

  const vaultTransactionExecuteSignature = await multisig.rpc.vaultTransactionExecute({
    connection,
    feePayer: squadsKeypair,
    multisigPda,
    transactionIndex,
    member: squadsKeypair.publicKey,
    signers: [squadsKeypair],
  });
  console.log(
    '🚀 ~ file: index.js:198 ~ handler ~ vaultTransactionExecuteSignature:',
    vaultTransactionExecuteSignature,
  );
}
