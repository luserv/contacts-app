import { Platform } from 'react-native';
import { useAuth } from '../utils/authContext';

// IDs de prueba para desarrollo — reemplazar con los reales antes de publicar
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

// IDs reales (reemplazar cuando tengas tu cuenta AdMob)
const REAL_APP_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX';
const REAL_BANNER_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

const IS_DEV = __DEV__;
export const ADMOB_APP_ID = IS_DEV ? TEST_APP_ID : REAL_APP_ID;
const BANNER_ID = IS_DEV ? TEST_BANNER_ID : REAL_BANNER_ID;

export default function AdBanner() {
  const { licensed } = useAuth();

  // No mostrar si tiene licencia o si es web/Electron
  if (licensed || Platform.OS === 'web') return null;

  // En Android: cargar AdMob dinámicamente (requiere build nativo)
  try {
    const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
    return (
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    );
  } catch {
    return null;
  }
}
