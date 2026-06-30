import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type React from 'react';
import { Platform } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      // href es una URL externa (string), no una ruta tipada. El error de
      // tipos solo existe con los tipos de rutas generados en .expo/ (local);
      // en CI no están, por eso usamos ts-ignore en vez de la variante
      // estricta, que daría TS2578.
      // biome-ignore lint/suspicious/noTsIgnore: necesitamos ts-ignore, no expect-error (el error de tipos solo existe en local con .expo/ generado).
      // @ts-ignore
      href={props.href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(props.href as string);
        }
      }}
    />
  );
}
