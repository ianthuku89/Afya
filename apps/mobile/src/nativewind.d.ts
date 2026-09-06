import "react-native";
import React from "react";

/**
 * @react-native-community/slider type declaration.
 * The bundled types are incompatible with the current RN + React versions,
 * so we provide a minimal declaration here.
 */
declare module "@react-native-community/slider" {
  import { ViewStyle, StyleProp } from "react-native";

  interface SliderProps {
    style?: StyleProp<ViewStyle>;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    value?: number;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    disabled?: boolean;
  }

  const Slider: React.FC<SliderProps>;
  export default Slider;
}

declare module "react-native" {
  interface FlatListProps<ItemT> {
    className?: string;
    tw?: string;
  }
  interface ImagePropsBase {
    className?: string;
    tw?: string;
  }
  interface ViewProps {
    className?: string;
    tw?: string;
  }
  interface TextProps {
    className?: string;
    tw?: string;
  }
  interface SwitchProps {
    className?: string;
    tw?: string;
  }
  interface InputAccessoryViewProps {
    className?: string;
    tw?: string;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
    tw?: string;
  }
  interface ScrollViewProps {
    className?: string;
    tw?: string;
  }
  interface TextInputProps {
    className?: string;
    tw?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
    tw?: string;
  }
  interface SafeAreaViewProps {
    className?: string;
    tw?: string;
  }
  interface ActivityIndicatorProps {
    className?: string;
    tw?: string;
  }
  interface RefreshControlProps {
    className?: string;
    tw?: string;
  }
}
