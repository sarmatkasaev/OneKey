import { serializeUnsignedTransaction } from '@onekeyhq/core/src/chains/dot/sdkDot';
import type { IEncodedTxDot } from '@onekeyhq/core/src/chains/dot/types';
import coreChainApi from '@onekeyhq/core/src/instance/coreChainApi';
import type { ISignedTxPro } from '@onekeyhq/core/src/types';
import bufferUtils from '@onekeyhq/shared/src/utils/bufferUtils';

import { KeyringHdBase } from '../../base/KeyringHdBase';

import { getMetadataRpc } from './utils';

import type { IDBAccount } from '../../../dbs/local/types';
import type {
  IExportAccountSecretKeysParams,
  IExportAccountSecretKeysResult,
  IGetPrivateKeysParams,
  IGetPrivateKeysResult,
  IPrepareHdAccountsParams,
  ISignMessageParams,
  ISignTransactionParams,
} from '../../types';

export class KeyringHd extends KeyringHdBase {
  override coreApi = coreChainApi.dot.hd;

  override async getPrivateKeys(
    params: IGetPrivateKeysParams,
  ): Promise<IGetPrivateKeysResult> {
    return this.baseGetPrivateKeys(params);
  }

  override async exportAccountSecretKeys(
    params: IExportAccountSecretKeysParams,
  ): Promise<IExportAccountSecretKeysResult> {
    return this.baseExportAccountSecretKeys(params);
  }

  override async prepareAccounts(
    params: IPrepareHdAccountsParams,
  ): Promise<IDBAccount[]> {
    return this.basePrepareAccountsHd(params);
  }

  override async signTransaction(
    params: ISignTransactionParams,
  ): Promise<ISignedTxPro> {
    const { unsignedTx } = params;
    const encodedTx = unsignedTx.encodedTx as IEncodedTxDot;
    const metadataRpc = await getMetadataRpc(
      this.networkId,
      this.backgroundApi,
    );
    const rawTxUnsigned = await serializeUnsignedTransaction({
      ...encodedTx,
      metadataRpc,
    });
    return this.baseSignTransaction({
      ...params,
      unsignedTx: {
        ...unsignedTx,
        encodedTx: {
          ...encodedTx,
          metadataRpc,
        },
        rawTxUnsigned: bufferUtils.bytesToHex(rawTxUnsigned.rawTx),
      },
    });
  }

  override async signMessage(params: ISignMessageParams): Promise<string[]> {
    return this.baseSignMessage(params);
  }
}
