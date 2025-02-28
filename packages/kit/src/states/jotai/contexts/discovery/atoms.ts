import { LRUCache } from 'lru-cache';

import { createJotaiContext } from '@onekeyhq/kit/src/states/jotai/utils/createJotaiContext';
import { MaximumNumberOfTabs } from '@onekeyhq/kit/src/views/Discovery/config/Discovery.constants';
import type {
  IWebTab,
  IWebTabsAtom,
} from '@onekeyhq/kit/src/views/Discovery/types';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

const {
  Provider: ProviderJotaiContextDiscovery,
  contextAtom,
  contextAtomComputed,
  contextAtomMethod,
} = createJotaiContext();
export { ProviderJotaiContextDiscovery, contextAtomMethod };

/**
 * WebTabs Atom
 */
export const { atom: displayHomePageAtom, use: useDisplayHomePageAtom } =
  contextAtom<boolean>(true);

export const { atom: webTabsAtom, use: useWebTabsAtom } =
  contextAtom<IWebTabsAtom>({
    tabs: [],
    keys: [],
  });

export const { atom: lastClosedTabAtom, use: useLastClosedTabAtom } =
  contextAtom<{
    tabs: IWebTab[];
  }>({
    tabs: [],
  });
export const { atom: webTabsMapAtom, use: useWebTabsMapAtom } = contextAtom<
  Record<string, IWebTab>
>({});
export const { atom: activeTabIdAtom, use: useActiveTabIdAtom } = contextAtom<
  string | null
>(null);

export const {
  atom: disabledAddedNewTabAtom,
  use: useDisabledAddedNewTabAtom,
} = contextAtomComputed((get) => {
  const { tabs } = get(webTabsAtom());
  if (platformEnv.isNative) {
    return tabs.length >= MaximumNumberOfTabs;
  }
  return false;
});

export const { atom: phishingLruCacheAtom, use: usePhishingLruCacheAtom } =
  contextAtom<LRUCache<string, boolean>>(
    new LRUCache<string, boolean>({
      max: 100,
    }),
  );

// sync data lock atom
export const { atom: browserDataReadyAtom, use: useBrowserDataReadyAtom } =
  contextAtom<boolean>(false);
