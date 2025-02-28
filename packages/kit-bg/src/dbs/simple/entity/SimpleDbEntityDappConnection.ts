import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { WalletConnectAccountSelectorNumStartAt } from '@onekeyhq/shared/src/walletConnect/constant';
import type {
  IConnectionAccountInfo,
  IConnectionAccountInfoWithNum,
  IConnectionItem,
  IConnectionStorageType,
} from '@onekeyhq/shared/types/dappConnection';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export interface IDappConnectionData {
  data: {
    // Storage space for injected DApp connections.
    injectedProvider: Record<string, IConnectionItem>;
    // Storage space for WalletConnect connections.
    walletConnect: Record<string, IConnectionItem>;
  };
}

function generateAccountSelectorNumber(
  connectionMap: IConnectionItem['connectionMap'],
  storageType: IConnectionStorageType,
): number {
  let accountSelectorNumber =
    storageType === 'injectedProvider'
      ? 0
      : WalletConnectAccountSelectorNumStartAt;
  // Use a while loop to ensure finding an unused `accountSelectorNumber`
  while (connectionMap[accountSelectorNumber]) {
    accountSelectorNumber += 1;
  }
  return accountSelectorNumber;
}

function generateMaps(connectionMap: Record<number, IConnectionAccountInfo>): {
  networkImplMap: Record<string, number[]>;
  addressMap: Record<string, number[]>;
} {
  const networkImplMap: Record<string, number[]> = {};
  const addressMap: Record<string, number[]> = {};

  // Iterate over the connectionMap to populate both networkImplMap and addressMap
  Object.entries(connectionMap).forEach(
    ([accountSelectorNumber, accountInfo]) => {
      const { networkImpl, address } = accountInfo;

      // Update networkImplMap
      if (!networkImplMap[networkImpl]) {
        networkImplMap[networkImpl] = [];
      }
      networkImplMap[networkImpl].push(Number(accountSelectorNumber));

      // Update addressMap
      if (!addressMap[address]) {
        addressMap[address] = [];
      }
      addressMap[address].push(Number(accountSelectorNumber));
    },
  );

  return { networkImplMap, addressMap };
}

export class SimpleDbEntityDappConnection extends SimpleDbEntityBase<IDappConnectionData> {
  entityName = 'dappConnection';

  override enableCache = true;

  @backgroundMethod()
  async upsertConnection({
    origin,
    accountsInfo,
    imageURL,
    replaceExistAccount = true,
    storageType,
    walletConnectTopic,
  }: {
    origin: string;
    accountsInfo: IConnectionAccountInfo[];
    storageType: IConnectionStorageType;
    imageURL?: string;
    replaceExistAccount?: boolean;
    walletConnectTopic?: string;
  }) {
    await this.setRawData((rawData) => {
      let data: IDappConnectionData['data'] = {
        injectedProvider: {},
        walletConnect: {},
      };

      if (rawData?.data && typeof rawData.data === 'object') {
        data = { ...rawData.data };
        // Ensure that both `injectedProvider` and `walletConnect` keys exist.
        data.injectedProvider = data.injectedProvider || {};
        data.walletConnect = data.walletConnect || {};
      }

      const storage = data[storageType];
      // Find or create the `IConnectionItem` corresponding to `origin`.
      let connectionItem = storage[origin];
      if (!connectionItem) {
        connectionItem = {
          origin,
          imageURL: imageURL || '',
          connectionMap: {},
          networkImplMap: {},
          addressMap: {},
          walletConnectTopic,
          updatedAt: Date.now(),
        };
      } else {
        // If one already exists, create a new copy to maintain immutability.
        connectionItem = {
          ...connectionItem,
          imageURL: imageURL || connectionItem.imageURL,
          connectionMap: { ...connectionItem.connectionMap },
          networkImplMap: { ...connectionItem.networkImplMap },
          addressMap: { ...connectionItem.addressMap },
          walletConnectTopic:
            walletConnectTopic || connectionItem.walletConnectTopic,
          updatedAt: Date.now(),
        };
      }

      accountsInfo.forEach((accountInfo) => {
        const { networkImpl } = accountInfo;

        // Find or create the accountSelectorNumber
        const foundEntry = Object.entries(connectionItem.connectionMap).find(
          ([, value]) => value.networkImpl === networkImpl,
        );
        let accountSelectorNumber = foundEntry
          ? Number(foundEntry[0])
          : undefined;

        if (accountSelectorNumber === undefined || replaceExistAccount) {
          // Create a new `accountSelectorNumber` if it does not exist or if replacement of an existing network is required.
          accountSelectorNumber = generateAccountSelectorNumber(
            connectionItem.connectionMap,
            storageType,
          );
          connectionItem.connectionMap[accountSelectorNumber] = accountInfo;
        } else {
          // 如果存在，则更新 accountInfo
          connectionItem.connectionMap[accountSelectorNumber] = {
            ...accountInfo,
          };
        }
      });
      // Rebuild networkImplMap and addressMap
      const { networkImplMap, addressMap } = generateMaps(
        connectionItem.connectionMap,
      );
      connectionItem.networkImplMap = networkImplMap;
      connectionItem.addressMap = addressMap;
      // 更新 storage 对象
      storage[origin] = connectionItem;

      const newData = { ...data, [storageType]: storage };
      if (platformEnv.isDev) {
        console.log(
          'simpledb upsertConnection: ',
          JSON.stringify(newData, null, 2),
        );
      }
      return {
        data: newData,
      };
    });
  }

  @backgroundMethod()
  async updateConnectionAccountInfo({
    origin,
    accountSelectorNum,
    updatedAccountInfo,
    storageType,
  }: {
    origin: string;
    accountSelectorNum: number;
    updatedAccountInfo: IConnectionAccountInfo;
    storageType: IConnectionStorageType;
  }) {
    await this.setRawData((rawData) => {
      if (!rawData || typeof rawData !== 'object' || !rawData.data) {
        return {
          data: {
            injectedProvider: {},
            walletConnect: {},
          },
        };
      }

      if (platformEnv.isDev) {
        console.log(
          'simpledb beforeUpdate rawData: ',
          JSON.stringify(rawData.data, null, 2),
        );
        console.log(
          'simpledb updateConnectionAccountInfo: ',
          JSON.stringify(updatedAccountInfo, null, 2),
          accountSelectorNum,
        );
      }

      const storage = rawData.data[storageType];
      const connectionItem = storage[origin];
      if (!connectionItem) {
        return { data: rawData.data };
      }

      const updatedConnectionMap = {
        ...connectionItem.connectionMap,
        [accountSelectorNum]: updatedAccountInfo,
      };

      const { networkImplMap, addressMap } = generateMaps(updatedConnectionMap);

      const updatedConnectionItem: IConnectionItem = {
        ...connectionItem,
        connectionMap: updatedConnectionMap,
        networkImplMap,
        addressMap,
        updatedAt: Date.now(),
      };

      const updatedStorage = {
        ...storage,
        [origin]: updatedConnectionItem,
      };

      if (platformEnv.isDev) {
        console.log(
          'simpledb updateConnectionAccountInfo: ',
          JSON.stringify(updatedStorage, null, 2),
        );
      }

      return {
        data: {
          ...rawData.data,
          [storageType]: updatedStorage,
        },
      };
    });
  }

  @backgroundMethod()
  async getAccountSelectorNum(
    origin: string,
    networkImpls: string[],
    storageType: IConnectionStorageType,
  ): Promise<number> {
    const rawData = await this.getRawData();
    if (!rawData?.data || typeof rawData.data !== 'object') {
      return 0;
    }

    const storageData = rawData.data[storageType];
    if (!storageData || typeof storageData !== 'object') {
      return 0;
    }

    const connectionItem = storageData[origin];
    if (!connectionItem) {
      return 0;
    }

    for (const networkImpl of networkImpls) {
      const accountNumbers = connectionItem.networkImplMap[networkImpl];
      if (accountNumbers && accountNumbers.length > 0) {
        return Math.max(...accountNumbers);
      }
    }
    return generateAccountSelectorNumber(
      connectionItem.connectionMap,
      storageType,
    );
  }

  @backgroundMethod()
  async getAccountSelectorMap({ sceneUrl }: { sceneUrl: string }) {
    const rawData = await this.getRawData();
    const map =
      rawData?.data?.injectedProvider?.[sceneUrl]?.connectionMap ||
      rawData?.data?.walletConnect?.[sceneUrl]?.connectionMap;
    return map;
  }

  @backgroundMethod()
  async deleteConnection(origin: string, storageType: IConnectionStorageType) {
    await this.setRawData((rawData) => {
      if (!rawData || typeof rawData !== 'object' || !rawData.data) {
        return {
          data: {
            injectedProvider: {},
            walletConnect: {},
          },
        };
      }

      if (!rawData.data[storageType]) {
        console.warn(`Storage type '${storageType}' not found.`);
        return rawData;
      }

      delete rawData.data[storageType][origin];

      return {
        ...rawData,
        data: {
          ...rawData.data,
          [storageType]: {
            ...rawData.data[storageType],
          },
        },
      };
    });
  }

  @backgroundMethod()
  async findInjectedAccountsInfoByOrigin(
    origin: string,
  ): Promise<IConnectionAccountInfoWithNum[] | null> {
    const rawData = await this.getRawData();

    if (!rawData || typeof rawData !== 'object' || !rawData.data) {
      return null;
    }
    const injectedItem = rawData.data.injectedProvider?.[origin];
    if (
      injectedItem?.connectionMap &&
      Object.keys(injectedItem.connectionMap).length > 0
    ) {
      return Object.entries(injectedItem.connectionMap).map(([k, v]) => ({
        ...v,
        num: Number(k),
        storageType: 'injectedProvider',
      }));
    }
    return null;
  }

  @backgroundMethod()
  async findAccountsInfoByOriginAndScope(
    origin: string,
    storageType: IConnectionStorageType,
    networkImpl: string,
  ) {
    const rawData = await this.getRawData();

    if (!rawData || typeof rawData !== 'object' || !rawData.data) {
      return null;
    }
    const connectionItem = rawData.data[storageType]?.[origin];
    if (!connectionItem) {
      return [];
    }

    const accountSelectorNumbers =
      connectionItem.networkImplMap[networkImpl] || [];

    const accountsInfo = accountSelectorNumbers
      .map((num) => ({ ...connectionItem.connectionMap[num], num }))
      .filter(Boolean);
    return accountsInfo;
  }

  @backgroundMethod()
  async updateNetworkId(
    origin: string,
    networkImpl: string,
    newNetworkId: string,
    storageType: IConnectionStorageType,
  ) {
    await this.setRawData((rawData) => {
      // Check if rawData.data is a valid object and use it if it is
      if (!rawData || typeof rawData !== 'object' || !rawData.data) {
        // If rawData is invalid or rawData.data is missing, return rawData unchanged
        return rawData as IDappConnectionData;
      }

      // Ensure that the specific storage type exists
      const storage = rawData.data[storageType] ?? {};

      // Find the connection item for the given origin
      const connectionItem = storage[origin];
      if (!connectionItem) {
        // If no connection item is found for the origin, return rawData unchanged
        return rawData;
      }

      // Find all accountSelectorNumbers for the given networkImpl
      const accountSelectorNumbers = connectionItem.networkImplMap[networkImpl];
      if (!accountSelectorNumbers || accountSelectorNumbers.length === 0) {
        // If no accountSelectorNumbers are found for the networkImpl, return rawData unchanged
        return rawData;
      }

      // Update networkId for all matching connectionMap items
      const updatedConnectionMap = { ...connectionItem.connectionMap };
      accountSelectorNumbers.forEach((num) => {
        const accountInfo = updatedConnectionMap[num];
        if (accountInfo) {
          // Create a new updated accountInfo object
          updatedConnectionMap[num] = {
            ...accountInfo,
            networkId: newNetworkId,
          };
        }
      });

      // Now we can update the connectionItem with the updatedConnectionMap
      const updatedConnectionItem = {
        ...connectionItem,
        connectionMap: updatedConnectionMap,
        updatedAt: Date.now(),
      };

      // Return the updated rawData with the updated connection item
      return {
        ...rawData,
        data: {
          ...rawData.data,
          [storageType]: {
            ...storage,
            [origin]: updatedConnectionItem,
          },
        },
      };
    });
  }

  removeFromNetworkImplMap(
    connectionItem: IConnectionItem,
    networkImpl: string,
    index: number,
  ) {
    const indices = connectionItem.networkImplMap[networkImpl] || [];
    const newIndices = indices.filter((idx) => idx !== index);
    if (newIndices.length === 0) {
      delete connectionItem.networkImplMap[networkImpl];
    } else {
      connectionItem.networkImplMap[networkImpl] = newIndices;
    }
  }

  removeFromAddressMap(
    connectionItem: IConnectionItem,
    address: string,
    index: number,
  ) {
    const indices = connectionItem.addressMap[address] || [];
    const newIndices = indices.filter((idx) => idx !== index);
    if (newIndices.length === 0) {
      delete connectionItem.addressMap[address];
    } else {
      connectionItem.addressMap[address] = newIndices;
    }
  }

  removeEntries({
    connectionData,
    providerType,
    origin,
    connectionItem,
    key,
    value,
  }: {
    connectionData: IDappConnectionData['data'];
    providerType: keyof IDappConnectionData['data'];
    origin: string;
    connectionItem: IConnectionItem;
    key: keyof IConnectionAccountInfo; // 'walletId'
    value: string; // hd--0
  }) {
    Object.keys(connectionItem.connectionMap).forEach((i) => {
      const index = parseInt(i, 10);
      const item = connectionItem.connectionMap[index];
      if (item[key] === value) {
        this.removeFromNetworkImplMap(connectionItem, item.networkImpl, index);
        this.removeFromAddressMap(connectionItem, item.address, index);
        delete connectionItem.connectionMap[index];
      }
    });

    if (Object.keys(connectionItem.connectionMap).length === 0) {
      // If empty, delete the entire connectionItem from the parent provider
      delete connectionData[providerType][origin];
    }
  }

  @backgroundMethod()
  async removeWallet({ walletId }: { walletId: string }) {
    await this.setRawData((rawData) => {
      if (!rawData || typeof rawData !== 'object' || !rawData.data) {
        return rawData as IDappConnectionData;
      }

      Object.keys(rawData.data).forEach((type) => {
        const providerType = type as keyof IDappConnectionData['data'];
        const providers = rawData.data[providerType];
        Object.entries(providers).forEach(([origin, connectionItem]) => {
          this.removeEntries({
            connectionData: rawData.data,
            providerType,
            origin,
            connectionItem,
            key: 'walletId',
            value: walletId,
          });
        });
      });

      return rawData;
    });
  }

  @backgroundMethod()
  async removeAccount({
    accountId,
    indexedAccountId,
  }: {
    accountId?: string;
    indexedAccountId?: string;
  }) {
    await this.setRawData((rawData) => {
      if (!rawData || typeof rawData !== 'object' || !rawData.data) {
        return rawData as IDappConnectionData;
      }

      let key: keyof IConnectionAccountInfo | null = null;
      let value: string | null = null;

      if (accountId) {
        key = 'accountId';
        value = accountId;
      }

      if (indexedAccountId) {
        key = 'indexedAccountId';
        value = indexedAccountId;
      }

      if (!key || !value) {
        return rawData;
      }

      Object.keys(rawData.data).forEach((type) => {
        const providerType = type as keyof IDappConnectionData['data'];
        const providers = rawData.data[providerType];
        Object.entries(providers).forEach(([origin, connectionItem]) => {
          if (origin && connectionItem && key && value) {
            this.removeEntries({
              connectionData: rawData.data,
              providerType,
              origin,
              connectionItem,
              key,
              value,
            });
          }
        });
      });

      return rawData;
    });
  }
}
