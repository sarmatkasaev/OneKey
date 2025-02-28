import { useCallback, useMemo, useRef } from 'react';

import { useNavigation } from '@react-navigation/core';

import { Page, rootNavigationRef } from '@onekeyhq/components';
import type {
  IModalNavigationProp,
  IPageNavigationProp,
  IStackNavigationOptions,
} from '@onekeyhq/components/src/layouts/Navigation';
import type {
  EModalRoutes,
  ETabRoutes,
  IModalParamList,
  ITabStackParamList,
} from '@onekeyhq/shared/src/routes';
import { ERootRoutes } from '@onekeyhq/shared/src/routes';

export type IAppNavigation = ReturnType<typeof useAppNavigation>;

/*
navigate by full route path:

 navigation.navigate(ERootRoutes.Main, {
      screen: ETabRoutes.Home,
      params: {
        screen: ETabHomeRoutes.TabHomeUrlAccountPage,
        params,
      },
    });
    
*/

/* 
replace
import { StackActions } from '@react-navigation/native';

 navigation.dispatch(
  StackActions.replace(ERootRoutes.Main, {
    screen: ETabRoutes.Developer,
    params: {
      screen: ETabDeveloperRoutes.TabDeveloper,
    },
  }),
);

*/

let lastPushAbleNavigation:
  | ReturnType<
      typeof useNavigation<IPageNavigationProp<any> | IModalNavigationProp<any>>
    >
  | undefined;

function useAppNavigation<
  P extends
    | IPageNavigationProp<any>
    | IModalNavigationProp<any> = IPageNavigationProp<any>,
>() {
  const navigation = useNavigation<P>();
  const navigationRef = useRef(navigation);

  if (navigationRef.current !== navigation) {
    navigationRef.current = navigation;
  }

  const popStack = useCallback(() => {
    navigationRef.current.getParent()?.goBack?.();
  }, []);

  const pop = useCallback(() => {
    if (navigationRef.current.canGoBack?.()) {
      navigationRef.current.goBack?.();
    } else {
      popStack();
    }
  }, [popStack]);

  const switchTab = useCallback(
    <T extends ETabRoutes>(
      route: T,
      params?: {
        screen: keyof ITabStackParamList[T];
        params?: ITabStackParamList[T][keyof ITabStackParamList[T]];
      },
    ) => {
      rootNavigationRef.current?.navigate(ERootRoutes.Main, {
        screen: route,
        params,
      });
    },
    [],
  );

  const pushModalPage = useCallback(
    <T extends EModalRoutes>(
      modalType: ERootRoutes.Modal | ERootRoutes.iOSFullScreen,
      route: T,
      params?: {
        screen: keyof IModalParamList[T];
        params?: IModalParamList[T][keyof IModalParamList[T]];
      },
    ) => {
      const navigationInstance = navigationRef.current;

      let rootNavigation = navigationInstance;
      while (rootNavigation?.getParent()) {
        rootNavigation = rootNavigation.getParent();
      }

      const routeLength = rootNavigation?.getState?.()?.routes?.length ?? 1;
      const existPageIndex = rootNavigation?.getState?.()?.routes?.findIndex(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (rootRoute) => params?.screen === rootRoute?.params?.params?.screen,
      );
      if (existPageIndex !== -1 && existPageIndex === routeLength - 1) {
        return;
      }

      // eslint-disable-next-line no-extra-boolean-cast
      if (!!navigationInstance.push) {
        lastPushAbleNavigation = navigationInstance;
        navigationInstance.push(modalType, {
          screen: route,
          params,
        });
        return;
      }
      // This is a workaround for the root navigation not being able to access the child navigation
      if (lastPushAbleNavigation) {
        lastPushAbleNavigation.push(modalType, {
          screen: route,
          params,
        });
        return;
      }
      // If there is no stack route, use navigate to create a router stack.
      navigationInstance.navigate(modalType, {
        screen: route,
        params,
      });
    },
    [],
  );

  const pushModal = useCallback(
    <T extends EModalRoutes>(
      route: T,
      params?: {
        screen: keyof IModalParamList[T];
        params?: IModalParamList[T][keyof IModalParamList[T]];
      },
    ) => {
      pushModalPage(ERootRoutes.Modal, route, params as any);
    },
    [pushModalPage],
  );

  const pushFullModal = useCallback(
    <T extends EModalRoutes>(
      route: T,
      params?: {
        screen: keyof IModalParamList[T];
        params?: IModalParamList[T][keyof IModalParamList[T]];
      },
    ) => {
      pushModalPage(ERootRoutes.iOSFullScreen, route, params as any);
    },
    [pushModalPage],
  );

  const { reload } = Page.Header.usePageHeaderReloadOptions();
  const setOptions = useCallback(
    (options: Partial<IStackNavigationOptions>) => {
      const reloadOptions = reload(options);
      navigationRef.current.setOptions(reloadOptions);
    },
    [reload],
  );

  const reset: typeof navigationRef.current.reset = useCallback((state) => {
    navigationRef.current.reset(state);
  }, []);

  const dispatch: typeof navigationRef.current.dispatch = useCallback(
    (action) => {
      navigationRef.current.dispatch(action);
    },
    [],
  );

  const push: typeof navigationRef.current.push = useCallback((...args) => {
    navigationRef.current.push(...args);
  }, []);

  const replace: typeof navigationRef.current.replace = useCallback(
    (...args) => {
      navigationRef.current.replace(...args);
    },
    [],
  );

  const navigate: typeof navigationRef.current.navigate = useCallback(
    (...args: any) => {
      navigationRef.current.navigate(...args);
    },
    [],
  );

  return useMemo(
    () => ({
      dispatch,
      navigate,
      pop,
      popStack,
      replace,
      push,
      pushFullModal,
      pushModal,
      reset,
      setOptions,
      switchTab,
    }),
    [
      dispatch,
      navigate,
      pop,
      popStack,
      push,
      pushFullModal,
      pushModal,
      replace,
      reset,
      setOptions,
      switchTab,
    ],
  );
}

export default useAppNavigation;
