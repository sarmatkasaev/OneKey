/* eslint-disable @typescript-eslint/no-unused-vars */
import BigNumber from 'bignumber.js';

import type { IEncodedTxDnx } from '@onekeyhq/core/src/chains/dnx/types';
import coreChainApi from '@onekeyhq/core/src/instance/coreChainApi';
import type {
  ICoreApiGetAddressItem,
  ISignedMessagePro,
  ISignedTxPro,
} from '@onekeyhq/core/src/types';
import { NotImplemented } from '@onekeyhq/shared/src/errors';
import { convertDeviceResponse } from '@onekeyhq/shared/src/errors/utils/deviceErrorUtils';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { checkIsDefined } from '@onekeyhq/shared/src/utils/assertUtils';
import hexUtils from '@onekeyhq/shared/src/utils/hexUtils';

import { KeyringHardwareBase } from '../../base/KeyringHardwareBase';

import { cnFastHash, serializeTransaction } from './utils';

import type { IDBAccount } from '../../../dbs/local/types';
import type {
  IBuildHwAllNetworkPrepareAccountsParams,
  IHwSdkNetwork,
  IPrepareHardwareAccountsParams,
  ISignMessageParams,
  ISignTransactionParams,
} from '../../types';
import type { AllNetworkAddressParams } from '@onekeyfe/hd-core';

export class KeyringHardware extends KeyringHardwareBase {
  override coreApi = coreChainApi.dynex.hd;

  override hwSdkNetwork: IHwSdkNetwork = 'dynex';

  override async buildHwAllNetworkPrepareAccountsParams(
    params: IBuildHwAllNetworkPrepareAccountsParams,
  ): Promise<AllNetworkAddressParams | undefined> {
    return {
      network: this.hwSdkNetwork,
      path: params.path,
      showOnOneKey: false,
    };
  }

  override prepareAccounts(
    params: IPrepareHardwareAccountsParams,
  ): Promise<IDBAccount[]> {
    return this.basePrepareHdNormalAccounts(params, {
      buildAddressesInfo: async ({ usedIndexes }) => {
        const dnxAddresses = await this.baseGetDeviceAccountAddresses({
          params,
          usedIndexes,
          sdkGetAddressFn: async ({
            connectId,
            deviceId,
            pathPrefix,
            pathSuffix,
            template,
            showOnOnekeyFn,
          }) => {
            const buildFullPath = (p: { index: number }) =>
              accountUtils.buildPathFromTemplate({
                template,
                index: p.index,
              });

            const allNetworkAccounts = await this.getAllNetworkPrepareAccounts({
              params,
              usedIndexes,
              buildPath: buildFullPath,
              buildResultAccount: ({ account }) => ({
                path: account.path,
                address: account.payload?.address || '',
                pub: account.payload?.pub || '',
              }),
              hwSdkNetwork: this.hwSdkNetwork,
            });
            if (allNetworkAccounts) {
              return allNetworkAccounts;
            }

            throw new Error('use sdk allNetworkGetAddress instead');

            // const sdk = await this.getHardwareSDKInstance();

            // const response = await sdk.dnxGetAddress(connectId, deviceId, {
            //   ...params.deviceParams.deviceCommonParams,
            //   bundle: usedIndexes.map((index, arrIndex) => ({
            //     path: `${pathPrefix}/${pathSuffix.replace(
            //       '{index}',
            //       `${index}`,
            //     )}`,
            //     showOnOneKey: showOnOnekeyFn(arrIndex),
            //   })),
            // });
            // return response;
          },
        });

        const ret: ICoreApiGetAddressItem[] = [];
        const addressRelPath = ''; // dnx don't have relPath 0/0
        for (let i = 0; i < dnxAddresses.length; i += 1) {
          const item = dnxAddresses[i];
          const { path, address } = item;
          const addressInfo: ICoreApiGetAddressItem = {
            address: address ?? '',
            publicKey: '',
            path,
            relPath: addressRelPath,
            xpub: '',
            addresses: {},
          };
          ret.push(addressInfo);
        }
        return ret;
      },
    });
  }

  override async signTransaction(
    params: ISignTransactionParams,
  ): Promise<ISignedTxPro> {
    const { unsignedTx, deviceParams } = params;
    const network = await this.getNetwork();
    const encodedTx = unsignedTx.encodedTx as IEncodedTxDnx;
    const sdk = await this.getHardwareSDKInstance();
    const path = await this.vault.getAccountPath();
    const { deviceCommonParams, dbDevice } = checkIsDefined(deviceParams);
    const { connectId, deviceId } = dbDevice;

    const signTxParams = {
      path,
      inputs: encodedTx.inputs,
      toAddress: encodedTx.to,
      amount: new BigNumber(encodedTx.amount)
        .shiftedBy(network.decimals)
        .toFixed(),
      fee: new BigNumber(encodedTx.fee)
        .shiftedBy(network.feeMeta.decimals)
        .toFixed(),
      paymentIdHex: encodedTx.paymentId,
    };

    const result = await convertDeviceResponse(async () =>
      sdk.dnxSignTransaction(connectId, deviceId, {
        ...signTxParams,
        ...deviceCommonParams,
      }),
    );

    const rawTx = serializeTransaction({
      encodedTx,
      signTxParams,
      payload: result,
    });

    return {
      txid: hexUtils.stripHexPrefix(cnFastHash(rawTx)),
      rawTx,
      encodedTx: unsignedTx.encodedTx,
    };
  }

  override signMessage(params: ISignMessageParams): Promise<ISignedMessagePro> {
    throw new NotImplemented();
  }
}
