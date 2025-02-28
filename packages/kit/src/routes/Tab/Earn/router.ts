import type { ITabSubNavigatorConfig } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabEarnRoutes } from '@onekeyhq/shared/src/routes';

import { LazyLoadRootTabPage } from '../../../components/LazyLoadPage';

const EarnHome = LazyLoadRootTabPage(
  () => import('../../../views/Earn/EarnHome'),
);

export const earnRouters: ITabSubNavigatorConfig<any, any>[] = [
  {
    rewrite: '/',
    name: ETabEarnRoutes.EarnHome,
    component: EarnHome,
    headerShown: !platformEnv.isNative,
  },
];
