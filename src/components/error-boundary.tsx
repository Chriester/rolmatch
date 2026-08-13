// Red de seguridad global: si algo revienta durante el render, en vez del
// pantallazo blanco (React desmonta el árbol entero) se muestra el error
// con su mensaje — para que el usuario pueda recargar y nosotros saber QUÉ
// falló sin abrir la consola. Class component: los boundaries no existen
// como hook.

import { Component, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { reportClientError } from '@/lib/error-log';

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary:', error, info.componentStack);
    // queda registrado en client_errors para moderación (best-effort)
    reportClientError(error, info.componentStack);
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign('/');
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { message, stack } = this.state.error;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>💥🎲</Text>
        <Text style={styles.title}>Pifia crítica</Text>
        <Text style={styles.body}>
          Algo ha fallado dentro de la app. Pásale este mensaje a los desarrolladores:
        </Text>
        <Text style={styles.error} selectable>
          {message}
          {stack ? `\n\n${stack.split('\n').slice(0, 6).join('\n')}` : ''}
        </Text>
        <Pressable style={styles.button} onPress={this.handleReload}>
          <Text style={styles.buttonLabel}>↻ Volver a empezar</Text>
        </Pressable>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B12',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    color: '#FF8A8E',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    backgroundColor: 'rgba(229,72,77,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.35)',
    borderRadius: 12,
    padding: 12,
    lineHeight: 17,
  },
  button: {
    backgroundColor: '#C77DFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
