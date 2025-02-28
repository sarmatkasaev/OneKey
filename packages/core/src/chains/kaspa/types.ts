import type { IKaspaUnspentOutputInfo } from './sdkKaspa';
import type { PrivateKey, PublicKey } from '@onekeyfe/kaspa-core-lib';

export type IEncodedTxKaspa = {
  utxoIds: string[];
  inputs: IKaspaUnspentOutputInfo[];
  outputs: {
    address: string;
    value: string;
  }[];
  mass: number;
  hasMaxSend: boolean;
  // TODO IFeeInfoUnit
  feeInfo?: {
    price: string; // feerate
    limit: string;
  };
};

export type IKaspaSigner = {
  getPublicKey(): PublicKey;

  getPrivateKey(): Promise<PrivateKey>;
};
