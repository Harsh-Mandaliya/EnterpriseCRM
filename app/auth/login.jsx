import { View, Text, StyleSheet } from 'react-native';
import AppButton from '@/components/common/AppButton';
import AppInput from '@/components/common/AppInput';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enterprise CRM</Text>

      <AppInput placeholder="Email" />

      <AppInput
        placeholder="Password"
        secureTextEntry
      />

      <AppButton
        title="Login"
        onPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 30,
  },
});