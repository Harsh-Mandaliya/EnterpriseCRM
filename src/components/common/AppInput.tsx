import { TextInput, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

export default function AppInput(props: any) {
  return (
    <TextInput
      {...props}
      style={styles.input}
      placeholderTextColor="#999"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
  },
});