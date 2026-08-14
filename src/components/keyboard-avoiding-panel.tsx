// Sustituto de KeyboardAvoidingView para los paneles con compositor pegado
// abajo (chat de mesa, DM, diario). En Android, el comportamiento "height"
// de KeyboardAvoidingView calculaba mal el hueco del teclado dentro del hub
// de mesa (varias capas flex anidadas, y el status bar traslúcido de Expo
// con adjustResize — la propia doc de Expo avisa de que esa combinación da
// "unexpected keyboard behavior") y el teclado tapaba el compositor.
//
// En Android usamos el alto real del teclado vía Reanimated
// (useAnimatedKeyboard lee WindowInsets nativo, no adivina con JS) y lo
// aplicamos como padding-bottom animado. iOS ya funcionaba bien con el
// KeyboardAvoidingView normal, así que ahí no se toca nada.

import { KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

type Props = { style?: StyleProp<ViewStyle>; children: React.ReactNode };

function AndroidPanel({ style, children }: Props) {
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardStyle = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));
  return <Animated.View style={[style, keyboardStyle]}>{children}</Animated.View>;
}

export function KeyboardAvoidingPanel({ style, children }: Props) {
  if (Platform.OS === 'android') {
    return <AndroidPanel style={style}>{children}</AndroidPanel>;
  }
  return (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
