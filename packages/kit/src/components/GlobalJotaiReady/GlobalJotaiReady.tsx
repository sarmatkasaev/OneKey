import { useEffect, useState } from 'react';

import { View } from 'react-native';

import { globalJotaiStorageReadyHandler } from '@onekeyhq/kit-bg/src/states/jotai/jotaiStorage';

export function GlobalJotaiReady({ children }: { children: any }) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    void globalJotaiStorageReadyHandler.ready.then((ready) => {
      setIsReady(ready);
    });
  }, []);

  if (!isReady) {
    return <View testID="GlobalJotaiReady-not-ready-placeholder" />;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return children;
}
